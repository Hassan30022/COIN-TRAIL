export interface Transaction {
  id: string;
  type: 'they_paid_me' | 'i_paid_them' | 'they_owe_more' | 'i_owe_more';
  amount: number;
  note?: string;
  timestamp: Date;
  balanceAfter: number;
}

export interface Person {
  id: string;
  name: string;
  balance: number;
  transactions: Transaction[];
  createdAt: Date;
}

export interface PersonFormData {
  name: string;
  theyOweMe: number;
  iOweThem: number;
  note?: string;
}

export interface TransactionFormData {
  type: 'they_paid_me' | 'i_paid_them' | 'they_owe_more' | 'i_owe_more';
  amount: number;
  note?: string;
}
