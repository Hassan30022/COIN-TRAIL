import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LedgerService } from '../../services/ledger.service';
import { ReceiptService } from '../../services/receipt.service';
import { Person, PersonFormData, TransactionFormData, Transaction } from '../../models/person.model';
import { AddPersonModalComponent } from '../add-person-modal/add-person-modal.component';
import { UpdatePersonModalComponent } from '../update-person-modal/update-person-modal.component';
import { TransactionHistoryComponent } from '../transaction-history/transaction-history.component';

type SortField = 'name' | 'balance';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-ledger-table',
  templateUrl: './ledger-table.component.html',
  styleUrls: ['./ledger-table.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    AddPersonModalComponent,
    UpdatePersonModalComponent,
    TransactionHistoryComponent
  ]
})
export class LedgerTableComponent implements OnInit, OnDestroy {
  persons: Person[] = [];
  filteredPersons: Person[] = [];
  expandedPersonId: string | null = null;
  searchTerm = '';
  sortField: SortField = 'name';
  sortDirection: SortDirection = 'asc';

  showAddModal = false;
  showUpdateModal = false;
  selectedPerson: Person | null = null;

  private subscription?: Subscription;

  constructor(
    private ledgerService: LedgerService,
    private receiptService: ReceiptService
  ) { }

  ngOnInit(): void {
    this.subscription = this.ledgerService.persons$.subscribe(persons => {
      this.persons = persons;
      this.applyFiltersAndSort();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getTotalBalance(): number {
    return this.ledgerService.getTotalBalance();
  }

  onAddPerson(): void {
    this.showAddModal = true;
  }

  onAddPersonSubmit(data: PersonFormData): void {
    this.ledgerService.addPerson(data);
    this.showAddModal = false;
  }

  onUpdatePerson(person: Person): void {
    this.selectedPerson = person;
    this.showUpdateModal = true;
  }

  onUpdatePersonSubmit(data: TransactionFormData): void {
    if (this.selectedPerson) {
      this.ledgerService.addTransaction(this.selectedPerson.id, data);
      this.showUpdateModal = false;
      this.selectedPerson = null;
    }
  }

  onDeletePerson(): void {
    if (this.selectedPerson) {
      const personId = this.selectedPerson.id;
      this.ledgerService.deletePerson(personId);
      this.showUpdateModal = false;
      this.selectedPerson = null;
      if (this.expandedPersonId === personId) {
        this.expandedPersonId = null;
      }
    }
  }

  onGeneratePersonReceipt(person: Person): void {
    this.receiptService.generatePersonReceipt(person);
  }

  onGenerateTransactionReceipt(person: Person, transaction: Transaction): void {
    this.receiptService.generateTransactionReceipt(person, transaction);
  }

  onDeleteTransaction(person: Person, transaction: Transaction): void {
    this.ledgerService.deleteTransaction(person.id, transaction.id);
  }

  toggleExpand(personId: string): void {
    this.expandedPersonId = this.expandedPersonId === personId ? null : personId;
  }

  isExpanded(personId: string): boolean {
    return this.expandedPersonId === personId;
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  onSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort(): void {
    let result = [...this.persons];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term));
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (this.sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.balance - b.balance;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredPersons = result;
  }

  getBalanceDisplay(balance: number): string {
    if (balance >= 0) {
      return `They owe me: PKR ${balance.toFixed(2)}`;
    } else {
      return `I owe them: PKR ${Math.abs(balance).toFixed(2)}`;
    }
  }

  getBalanceClass(balance: number): string {
    return balance >= 0 ? 'positive' : 'negative';
  }

  getTotalBalanceDisplay(): string {
    const total = this.getTotalBalance();
    if (total >= 0) {
      return `Total owed to me: PKR ${total.toFixed(2) || 0}`;
    } else {
      return `Total I owe: PKR ${Math.abs(total).toFixed(2) || 0}`;
    }
  }


  getTotalBalanceClass(): string {
    return this.getTotalBalance() >= 0 ? 'positive' : 'negative';
  }

  getSortIcon(field: SortField): string {
    if (this.sortField !== field) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  onClearTrail(person: Person): void {
    this.ledgerService.clearTransactions(person.id);
  }
}
