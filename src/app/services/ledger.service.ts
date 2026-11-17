import { Injectable } from '@angular/core';
import { LedgerStorageService } from './ledger-storage.service';
import { recalculateBalances, transactionDelta } from './ledger-data';
import { Person, Transaction, PersonFormData, TransactionFormData } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  readonly persons$ = this.storage.persons.asObservable();

  constructor(private storage: LedgerStorageService) {}

  saveToStorage(persons: Person[]): Promise<void> {
    return this.storage.save(persons);
  }

  getPersons(): Person[] {
    return this.storage.persons.value;
  }

  async addPerson(data: PersonFormData): Promise<Person | null> {
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

    const persons = structuredClone(this.getPersons());
    persons.push(person);
    await this.saveToStorage(persons);

    return person;
  }


  async addTransaction(personId: string, data: TransactionFormData): Promise<void> {
    const persons = structuredClone(this.getPersons());
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    person.balance += transactionDelta(data);

    const transaction: Transaction = {
      id: this.generateId(),
      type: data.type,
      amount: data.amount,
      note: data.note,
      timestamp: new Date(),
      balanceAfter: person.balance
    };

    person.transactions.push(transaction);
    await this.saveToStorage(persons);
  }

  async deletePerson(personId: string): Promise<void> {
    const persons = this.getPersons().filter(p => p.id !== personId);
    await this.saveToStorage(persons);
  }

  async deleteTransaction(personId: string, transactionId: string): Promise<void> {
    const persons = structuredClone(this.getPersons());
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    const transactionIndex = person.transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error('Transaction not found');
    }

    person.transactions.splice(transactionIndex, 1);

    recalculateBalances(person);

    await this.saveToStorage(persons);
  }

  getTotalBalance(): number {
    return this.getPersons().reduce((sum, person) => sum + person.balance, 0);
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  async clearTransactions(personId: string): Promise<void> {
    const persons = structuredClone(this.getPersons());
    const person = persons.find(p => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    person.transactions = [];
    person.balance = 0;

    await this.saveToStorage(persons);
  }
}
