import { Component } from '@angular/core';
import { LedgerTableComponent } from './components/ledger-table/ledger-table.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [LedgerTableComponent]
})
export class AppComponent {
  title = 'Cash Ledger';
}
