import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonFormData } from '../../models/person.model';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-add-person-modal',
  templateUrl: './add-person-modal.component.html',
  styleUrls: ['./add-person-modal.component.scss'],
  imports: [CommonModule, FormsModule, ModalComponent]
})
export class AddPersonModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<PersonFormData>();

  formData: PersonFormData = {
    name: '',
    theyOweMe: 0,
    iOweThem: 0,
    note: ''
  };

  errors: { [key: string]: string } = {};

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onSubmit(): void {
    this.errors = {};

    if (!this.formData.name.trim()) {
      this.errors['name'] = 'Name is required';
      return;
    }

    if (this.formData.theyOweMe < 0) {
      this.errors['theyOweMe'] = 'Amount cannot be negative';
      return;
    }

    if (this.formData.iOweThem < 0) {
      this.errors['iOweThem'] = 'Amount cannot be negative';
      return;
    }

    this.submit.emit({ ...this.formData });
    this.resetForm();
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      theyOweMe: 0,
      iOweThem: 0,
      note: ''
    };
    this.errors = {};
  }
}
