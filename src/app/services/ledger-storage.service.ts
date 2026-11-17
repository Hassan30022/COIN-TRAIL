import { Injectable, signal } from '@angular/core';
import { initializeApp } from '@firebase/app';
import { Auth, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from '@firebase/auth';
import { Database, DatabaseReference, getDatabase, onValue, ref, runTransaction } from '@firebase/database';
import { BehaviorSubject } from 'rxjs';
import { firebaseConfig } from '../firebase.config';
import { Person } from '../models/person.model';
import { mergeLocalLedger, readLedger } from './ledger-data';

const storageKey = 'ledger_data';
const importOwnerKey = 'coin_trail_import_owner';

interface CloudLedger {
  version: string;
  ledger: string;
  imports?: Record<string, true>;
}

@Injectable({ providedIn: 'root' })
export class LedgerStorageService {
  readonly configured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain &&
    firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.databaseURL);
  readonly account = signal<User | null>(null);
  readonly ready = signal(!this.configured);
  readonly busy = signal(false);
  readonly status = signal('');
  readonly error = signal('');
  readonly persons = new BehaviorSubject<Person[]>([]);

  private auth?: Auth;
  private database?: Database;
  private stopListening?: () => void;
  private generation = 0;
  private version: string | null = null;
  private guestRaw: string | null = null;

  constructor() {
    if (this.configured) {
      try {
        const app = initializeApp(firebaseConfig);
        this.auth = getAuth(app);
        this.database = getDatabase(app);
        onAuthStateChanged(this.auth, user => void this.openLedger(user));
        this.status.set('Checking Google sign-in…');
      } catch (error) {
        this.error.set(this.message(error, 'Google sign-in is unavailable.'));
        this.loadGuest();
        this.ready.set(true);
      }
    } else {
      this.loadGuest();
    }

    window.addEventListener('storage', event => {
      if (!this.account() && (event.key === storageKey || event.key === null)) this.loadGuest();
    });
  }

  async login(): Promise<void> {
    if (!this.auth || this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'auth/popup-closed-by-user')) {
        this.error.set(this.message(error, 'Could not sign in with Google.'));
      }
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    if (!this.auth || this.busy()) return;
    this.busy.set(true);
    try {
      await signOut(this.auth);
    } catch (error) {
      this.error.set(this.message(error, 'Could not sign out.'));
    } finally {
      this.busy.set(false);
    }
  }

  retry(): void {
    if (!this.ready() && this.account()) void this.openLedger(this.account());
  }

  async save(persons: Person[]): Promise<void> {
    if (!this.ready() || this.busy()) throw new Error('Wait for the ledger to finish syncing.');
    const ledger = JSON.stringify(persons);
    readLedger(ledger);
    this.error.set('');
    const user = this.account();
    if (!user) {
      const expected = this.guestRaw;
      this.busy.set(true);
      try {
        await this.withStorageLock(() => {
          if (this.auth?.currentUser || this.account()) throw new Error('The account changed. Try the edit again.');
          const current = localStorage.getItem(storageKey);
          if (current !== null && localStorage.getItem(importOwnerKey)) {
            throw new Error('Sign back into the Google account that started the import before editing this local ledger.');
          }
          if (current !== expected) {
            this.loadGuest();
            throw new Error('The ledger changed in another tab. Review the latest data and try again.');
          }
          localStorage.removeItem(importOwnerKey);
          localStorage.setItem(storageKey, ledger);
          this.guestRaw = ledger;
          this.persons.next(persons);
        });
      } finally {
        if (!this.account()) this.busy.set(false);
      }
      return;
    }

    const expected = this.version;
    const generation = this.generation;
    const version = crypto.randomUUID();
    this.busy.set(true);
    this.status.set('Saving to your Google account…');
    try {
      const result = await runTransaction(this.ledgerRef(user), (current: CloudLedger | null) => {
        if (this.auth?.currentUser?.uid !== user.uid || (current?.version ?? null) !== expected) return;
        return { ...current, version, ledger };
      }, { applyLocally: false });
      if (!result.committed) throw new Error('The ledger changed in another session. Review the latest data and try again.');
    } finally {
      if (this.generation === generation) {
        this.status.set('');
        this.busy.set(false);
      }
    }
  }

  private async openLedger(user: User | null): Promise<void> {
    const generation = ++this.generation;
    this.stopListening?.();
    this.account.set(user);
    this.persons.next([]);
    this.version = null;
    this.ready.set(false);
    this.busy.set(false);
    this.error.set('');
    this.status.set('');

    if (!user) {
      this.loadGuest();
      this.ready.set(true);
      return;
    }

    this.status.set('Opening your Google ledger…');
    try {
      const ledgerRef = this.ledgerRef(user);
      await this.importLocal(user, ledgerRef);
      if (generation !== this.generation) return;
      const fail = (error: unknown) => {
        if (generation !== this.generation) return;
        this.ready.set(false);
        this.persons.next([]);
        this.status.set('');
        this.error.set(this.message(error, 'Could not open your Google ledger. You can retry or sign out.'));
      };
      this.stopListening = onValue(ledgerRef, snapshot => {
        if (generation !== this.generation || this.auth?.currentUser?.uid !== user.uid) return;
        try {
          const current = snapshot.val() as CloudLedger | null;
          this.version = current?.version ?? null;
          this.persons.next(current ? readLedger(current.ledger) : []);
          this.ready.set(true);
          if (!this.busy()) this.status.set('');
        } catch (error) {
          fail(error);
        }
      }, fail);
    } catch (error) {
      if (generation !== this.generation) return;
      this.status.set('');
      this.error.set(this.message(error, 'Could not import this browser’s ledger. You can retry or sign out.'));
    }
  }

  private async importLocal(user: User, ledgerRef: DatabaseReference): Promise<void> {
    const raw = await this.withStorageLock(() => {
      if (this.auth?.currentUser?.uid !== user.uid) return null;
      const saved = localStorage.getItem(storageKey);
      const owner = localStorage.getItem(importOwnerKey);
      if (!saved || (owner && owner !== user.uid) || !readLedger(saved).length) return null;
      localStorage.setItem(importOwnerKey, user.uid);
      return saved;
    });
    if (!raw) return;

    if (this.auth?.currentUser?.uid !== user.uid) return;
    this.status.set('Importing the ledger from this browser…');
    const incoming = readLedger(raw);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    const version = crypto.randomUUID();
    let mergeError: unknown;
    const result = await runTransaction(ledgerRef, (current: CloudLedger | null) => {
      if (this.auth?.currentUser?.uid !== user.uid) return;
      if (current?.imports?.[digest]) return current;
      try {
        const people = current ? readLedger(current.ledger) : [];
        return {
          version,
          ledger: JSON.stringify(mergeLocalLedger(people, incoming)),
          imports: { ...current?.imports, [digest]: true }
        };
      } catch (error) {
        mergeError = error;
        return;
      }
    }, { applyLocally: false });
    if (mergeError) throw mergeError;
    if (!result.committed) return;

    await this.withStorageLock(() => {
      if (localStorage.getItem(importOwnerKey) !== user.uid) return;
      if (localStorage.getItem(storageKey) === raw) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(importOwnerKey);
      }
    });
  }

  private ledgerRef(user: User): DatabaseReference {
    return ref(this.database!, `coinTrail/${user.uid}`);
  }

  private loadGuest(): void {
    try {
      this.guestRaw = localStorage.getItem(storageKey);
      this.persons.next(readLedger(this.guestRaw ?? '[]'));
    } catch (error) {
      this.persons.next([]);
      this.error.set(this.message(error, 'Could not read the local ledger.'));
    }
  }

  private withStorageLock<T>(operation: () => T): Promise<T> {
    return navigator.locks
      ? navigator.locks.request('coin-trail-local-ledger', operation)
      : Promise.resolve().then(operation);
  }

  private message(error: unknown, fallback: string): string {
    const details = error instanceof Error ? error.message : '';
    return details ? `${fallback} ${details}` : fallback;
  }
}
