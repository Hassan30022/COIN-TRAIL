import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Person, TransactionFormData } from '../../models/person.model';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-update-person-modal',
  templateUrl: './update-person-modal.component.html',
  styleUrls: ['./update-person-modal.component.scss'],
  imports: [CommonModule, FormsModule, ModalComponent]
})
export class UpdatePersonModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() person: Person | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<TransactionFormData>();
  @Output() deletePerson = new EventEmitter<void>();

  formData: TransactionFormData = {
    type: 'they_paid_me',
    amount: 0,
    note: ''
  };

  errors: { [key: string]: string } = {};
  showDeleteConfirm = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onSubmit(): void {
    this.errors = {};

    if (this.formData.amount <= 0) {
      this.errors['amount'] = 'Amount must be greater than 0';
      return;
    }

    this.submit.emit({ ...this.formData });
    this.resetForm();
  }

  onDeleteClick(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    this.deletePerson.emit();
    this.showDeleteConfirm = false;
    this.resetForm();
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  private resetForm(): void {
    this.formData = {
      type: 'they_paid_me',
      amount: 0,
      note: ''
    };
    this.errors = {};
    this.showDeleteConfirm = false;
  }

  getBalanceDisplay(): string {
    if (!this.person) return '';
    const balance = this.person.balance;
    if (balance >= 0) {
      return `They owe me: PKR ${balance.toFixed(2)}`;
    } else {
      return `I owe them: PKR ${Math.abs(balance).toFixed(2)}`;
    }
  }

  getBalanceClass(): string {
    if (!this.person) return '';
    return this.person.balance >= 0 ? 'positive' : 'negative';
  }
}
