import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Person, Transaction, PersonFormData, TransactionFormData } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly STORAGE_KEY = 'ledger_data';
  private personsSubject = new BehaviorSubject<Person[]>([]);
  public persons$: Observable<Person[]> = this.personsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const persons = data.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          transactions: p.transactions.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }))
        }));
        this.personsSubject.next(persons);
      } catch (e) {
        console.error('Failed to load data from storage', e);
        this.personsSubject.next([]);
      }
    }
  }

  public saveToStorage(persons: Person[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(persons));
    this.personsSubject.next(persons);
  }

  getPersons(): Person[] {
    return this.personsSubject.value;
  }

  getPerson(id: string): Person | undefined {
    return this.personsSubject.value.find(p => p.id === id);
  }

  addPerson(data: PersonFormData): Person | null {
    if (!data || !data.name?.trim()) {
      console.warn('Attempted to add invalid person record:', data);
      return null;
    }

    const theyOweMe = Number(data.theyOweMe) || 0;
    const iOweThem = Number(data.iOweThem) || 0;
    const netBalance = theyOweMe - iOweThem;

    const transaction: Transaction | null = netBalance !== 0 ? {
      id: this.generateId(),
      type: netBalance >= 0 ? 'they_owe_more' : 'i_owe_more',
      amount: Math.abs(netBalance),
      note: data.note || `Initial balance: They owe me ${theyOweMe}, I owe them ${iOweThem}`,
      timestamp: new Date(),
      balanceAfter: netBalance
    } : null;

    const person: Person = {
      id: this.generateId(),
      name: data.name.trim(),
      balance: netBalance,
      transactions: transaction ? [transaction] : [],
      createdAt: new Date()
    };

    const persons = this.getPersons();
    persons.push(person);
    this.saveToStorage(persons);

    return person;
  }


  addTransaction(personId: string, data: TransactionFormData): void {
    const persons = this.getPersons();
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    let balanceChange = 0;
    switch (data.type) {
      case 'they_paid_me':
        balanceChange = -data.amount;
        break;
      case 'i_paid_them':
        balanceChange = data.amount;
        break;
      case 'they_owe_more':
        balanceChange = data.amount;
        break;
      case 'i_owe_more':
        balanceChange = -data.amount;
        break;
    }

    person.balance += balanceChange;

    const transaction: Transaction = {
      id: this.generateId(),
      type: data.type,
      amount: data.amount,
      note: data.note,
      timestamp: new Date(),
      balanceAfter: person.balance
    };

    person.transactions.push(transaction);
    this.saveToStorage(persons);
  }

  deletePerson(personId: string): void {
    const persons = this.getPersons().filter(p => p.id !== personId);
    this.saveToStorage(persons);
  }

  deleteTransaction(personId: string, transactionId: string): void {
    const persons = this.getPersons();
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    const transactionIndex = person.transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error('Transaction not found');
    }

    person.transactions.splice(transactionIndex, 1);

    person.balance = 0;
    person.transactions.forEach(t => {
      let balanceChange = 0;
      switch (t.type) {
        case 'they_paid_me':
          balanceChange = -t.amount;
          break;
        case 'i_paid_them':
          balanceChange = t.amount;
          break;
        case 'they_owe_more':
          balanceChange = t.amount;
          break;
        case 'i_owe_more':
          balanceChange = -t.amount;
          break;
      }
      person.balance += balanceChange;
      t.balanceAfter = person.balance;
    });

    this.saveToStorage(persons);
  }

  getTotalBalance(): number {
    return this.getPersons().reduce((sum, person) => sum + person.balance, 0);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clearTransactions(personId: string): void {
    const persons = this.getPersons();
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    person.transactions = [];
    person.balance = 0;

    this.saveToStorage(persons);
  }
}
