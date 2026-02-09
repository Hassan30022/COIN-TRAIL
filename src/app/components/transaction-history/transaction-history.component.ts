import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Person, Transaction } from '../../models/person.model';

@Component({
  selector: 'app-transaction-history',
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.scss'],
  imports: [CommonModule]
})
export class TransactionHistoryComponent {
  @Input() person: Person | null = null;
  @Output() generateReceipt = new EventEmitter<Transaction>();
  @Output() deleteTransaction = new EventEmitter<Transaction>();
  @Output() clearTrail = new EventEmitter<Person>();

  showDeleteConfirm: string | null = null;
  showClearTrailConfirm: boolean = false;

  getTransactionTypeText(type: string): string {
    switch (type) {
      case 'they_paid_me': return 'They Paid Me';
      case 'i_paid_them': return 'I Paid Them';
      case 'they_owe_more': return 'They Owe More';
      case 'i_owe_more': return 'I Owe More';
      default: return type;
    }
  }

  getBalanceClass(balance: number): string {
    return balance >= 0 ? 'positive' : 'negative';
  }

  formatBalance(balance: number): string {
    if (balance >= 0) {
      return `+PKR ${balance.toFixed(2) || 0}`;
    } else {
      return `-PKR ${Math.abs(balance).toFixed(2) || 0}`;
    }
  }

  onGenerateReceipt(transaction: Transaction): void {
    this.generateReceipt.emit(transaction);
  }

  onDeleteClick(transaction: Transaction): void {
    this.showDeleteConfirm = transaction.id;
  }

  confirmDelete(transaction: Transaction): void {
    this.deleteTransaction.emit(transaction);
    this.showDeleteConfirm = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = null;
  }

  onClearTrail() {
    this.showClearTrailConfirm = true
  }

  confirmClear(person: Person) {
    this.clearTrail.emit(person);
    this.showClearTrailConfirm = false;
  }

  cancelClear() {
    this.showClearTrailConfirm = false;
  }
}
