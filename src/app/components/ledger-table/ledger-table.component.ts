import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LedgerService } from '../../services/ledger.service';
import { ReceiptService } from '../../services/receipt.service';
import { readBackup } from '../../services/ledger-data';
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
  sharingReceipt = false;
  receiptNotice = '';

  private subscription?: Subscription;
  private destroyed = false;

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
    this.destroyed = true;
    this.subscription?.unsubscribe();
  }

  getTotalBalance(): number {
    return this.ledgerService.getTotalBalance();
  }

  onAddPerson(): void {
    this.showAddModal = true;
  }

  async onAddPersonSubmit(data: PersonFormData): Promise<void> {
    if (await this.save(() => this.ledgerService.addPerson(data))) this.showAddModal = false;
  }

  onUpdatePerson(person: Person): void {
    this.selectedPerson = person;
    this.showUpdateModal = true;
  }

  async onUpdatePersonSubmit(data: TransactionFormData): Promise<void> {
    const personId = this.selectedPerson?.id;
    if (personId && await this.save(() => this.ledgerService.addTransaction(personId, data))) {
      this.showUpdateModal = false;
      this.selectedPerson = null;
    }
  }

  async onDeletePerson(): Promise<void> {
    const personId = this.selectedPerson?.id;
    if (personId && await this.save(() => this.ledgerService.deletePerson(personId))) {
      this.showUpdateModal = false;
      this.selectedPerson = null;
      if (this.expandedPersonId === personId) {
        this.expandedPersonId = null;
      }
    }
  }

  async onReceipt(person: Person, transaction?: Transaction, share = false): Promise<void> {
    if (share && this.sharingReceipt) return;
    if (share) this.sharingReceipt = true;
    this.receiptNotice = '';
    try {
      const file = transaction
        ? await this.receiptService.createTransactionReceipt(person, transaction)
        : await this.receiptService.createPersonReceipt(person);
      if (this.destroyed) return;
      if (!share) {
        this.receiptService.download(file);
      } else if (await this.receiptService.share(file) === 'downloaded') {
        this.receiptNotice = 'Direct sharing is unavailable. Attach the downloaded PNG in your app.';
      }
    } catch {
      this.receiptNotice = 'Could not create the receipt. Please try again.';
    } finally {
      if (share) this.sharingReceipt = false;
    }
  }

  onDeleteTransaction(person: Person, transaction: Transaction): void {
    void this.save(() => this.ledgerService.deleteTransaction(person.id, transaction.id));
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
    void this.save(() => this.ledgerService.clearTransactions(person.id));
  }

  private async save(operation: () => Promise<unknown>): Promise<boolean> {
    try {
      await operation();
      return true;
    } catch (error) {
      if (!this.destroyed) alert(error instanceof Error ? error.message : 'Could not save the ledger.');
      return false;
    }
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const persons = readBackup(await file.text());
      if (this.destroyed) return;
      if (await this.save(() => this.ledgerService.saveToStorage(persons))) alert('Backup imported successfully');
    } catch (error) {
      if (!this.destroyed) alert(error instanceof Error ? error.message : 'Invalid backup file.');
    } finally {
      input.value = '';
    }
  }

  onExport() {
      if (!this.persons || this.persons.length === 0) {
    alert('No persons available to export');
    return;
  }

  const exportData = this.persons.map(person => ({
    ...person,
    createdAt: person.createdAt instanceof Date
      ? person.createdAt.toISOString()
      : new Date(person.createdAt).toISOString()
  }));

  const jsonContent = JSON.stringify(exportData, null, 2);

  const blob = new Blob([jsonContent], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `ledger-backup-${new Date().getTime()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  }
}
