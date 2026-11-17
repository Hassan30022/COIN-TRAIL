import { Person, Transaction } from '../models/person.model';

const transactionTypes = new Set(['they_paid_me', 'i_paid_them', 'they_owe_more', 'i_owe_more']);

export function readBackup(raw: string): Person[] {
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error('The backup must contain a list of people.');
  return readLedger(JSON.stringify(entries.map(entry => ({
    id: entry.id || crypto.randomUUID(),
    name: entry.name || '',
    balance: Number(entry.balance || 0),
    transactions: Array.isArray(entry.transactions) ? entry.transactions : [],
    createdAt: entry.createdAt || new Date()
  }))));
}

export function readLedger(raw: string): Person[] {
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error('The ledger must contain a list of people.');

  const ids = new Set<string>();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
        typeof entry.name !== 'string' || !Number.isFinite(entry.balance) ||
        !Array.isArray(entry.transactions)) {
      throw new Error('The ledger contains an invalid person record.');
    }
    ids.add(entry.id);
    const transactionIds = new Set<string>();
    const transactions = entry.transactions.map((transaction: Transaction) => {
      if (!transaction || typeof transaction.id !== 'string' || !transaction.id ||
          transactionIds.has(transaction.id) || !transactionTypes.has(transaction.type) ||
          !Number.isFinite(transaction.amount) || !Number.isFinite(transaction.balanceAfter) ||
          (transaction.note != null && typeof transaction.note !== 'string')) {
        throw new Error('The ledger contains an invalid transaction.');
      }
      transactionIds.add(transaction.id);
      return { ...transaction, timestamp: readDate(transaction.timestamp) };
    });
    return { ...entry, createdAt: readDate(entry.createdAt), transactions };
  });
}

function readDate(value: string | Date): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('The ledger contains an invalid date.');
  return date;
}

export function transactionDelta(transaction: Pick<Transaction, 'type' | 'amount'>): number {
  return transaction.type === 'they_paid_me' || transaction.type === 'i_owe_more'
    ? -transaction.amount
    : transaction.amount;
}

export function recalculateBalances(person: Person, openingBalance = 0): void {
  let balance = openingBalance;
  for (const transaction of person.transactions) {
    balance += transactionDelta(transaction);
    transaction.balanceAfter = balance;
  }
  person.balance = balance;
}

export function mergeLocalLedger(cloud: Person[], local: Person[]): Person[] {
  const people = new Map(cloud.map(person => [person.id, person]));
  for (const localPerson of local) {
    const cloudPerson = people.get(localPerson.id);
    if (!cloudPerson) {
      people.set(localPerson.id, localPerson);
      continue;
    }
    const cloudIds = new Set(cloudPerson.transactions.map(transaction => transaction.id));
    const missing = localPerson.transactions.filter(transaction => !cloudIds.has(transaction.id));
    if (!missing.length) continue;

    const first = cloudPerson.transactions[0];
    const openingBalance = first ? first.balanceAfter - transactionDelta(first) : cloudPerson.balance;
    const transactions = [...cloudPerson.transactions, ...missing]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(transaction => ({ ...transaction }));
    const combined = { ...cloudPerson, transactions };
    recalculateBalances(combined, openingBalance);
    people.set(combined.id, combined);
  }
  return [...people.values()];
}
