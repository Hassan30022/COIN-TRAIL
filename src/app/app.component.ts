import { Component, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { LedgerTableComponent } from './components/ledger-table/ledger-table.component';
import { LedgerStorageService } from './services/ledger-storage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [LedgerTableComponent]
})
export class AppComponent {
  readonly storage = inject(LedgerStorageService);

  async confirmSignOut(): Promise<void> {
    const user = this.storage.account();
    if (!user || this.storage.busy()) return;

    const result = await Swal.fire({
      title: 'Sign out of Coin Trail?',
      text: 'Your synced entries will be available when you sign back in.',
      icon: 'question',
      iconColor: 'var(--accent)',
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Sign out',
      focusCancel: true,
      buttonsStyling: false,
      customClass: {
        popup: 'coin-trail-sign-out-dialog',
        confirmButton: 'coin-trail-sign-out-confirm',
        cancelButton: 'coin-trail-sign-out-cancel'
      }
    });

    if (result.isConfirmed && this.storage.account()?.uid === user.uid) {
      await this.storage.logout();
    }
  }
}
