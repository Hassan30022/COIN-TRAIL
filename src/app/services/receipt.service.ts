import { Injectable } from '@angular/core';
import { Person, Transaction } from '../models/person.model';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {

  generatePersonReceipt(person: Person): void {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Coin Trail Receipt', 50, 60);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '16px Arial';
    ctx.fillText(new Date().toLocaleString(), 50, 90);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(750, 110);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${person.name}`, 50, 150);

    ctx.font = '18px Arial';
    const netBalance = person.balance;
    const balanceText = netBalance >= 0
      ? `To Pay: PKR ${netBalance.toFixed(2)}`
      : `To Recieve: PKR ${Math.abs(netBalance).toFixed(2)}`;

    ctx.fillStyle = netBalance >= 0 ? '#00ff88' : '#ff6b6b';
    ctx.fillText(balanceText, 50, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Transaction Summary:', 50, 240);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#cccccc';
    let yPos = 270;

    const theyOweMeTotal = person.transactions
      .filter(t => t.type === 'they_owe_more')
      .reduce((sum, t) => sum + t.amount, 0);

    const iOweThemTotal = person.transactions
      .filter(t => t.type === 'i_owe_more')
      .reduce((sum, t) => sum + t.amount, 0);

    const theyPaidTotal = person.transactions
      .filter(t => t.type === 'they_paid_me')
      .reduce((sum, t) => sum + t.amount, 0);

    const iPaidTotal = person.transactions
      .filter(t => t.type === 'i_paid_them')
      .reduce((sum, t) => sum + t.amount, 0);

    ctx.fillText(`Total To Pay: PKR ${theyOweMeTotal.toFixed(2)}`, 50, yPos);
    yPos += 30;
    ctx.fillText(`Total To Recieve: PKR ${iOweThemTotal.toFixed(2)}`, 50, yPos);
    yPos += 30;
    ctx.fillText(`Total Paid: PKR ${theyPaidTotal.toFixed(2)}`, 50, yPos);
    yPos += 30;
    ctx.fillText(`Total Recieved: PKR ${iPaidTotal.toFixed(2)}`, 50, yPos);
    yPos += 30;
    ctx.fillText(`Transactions: ${person.transactions.length}`, 50, yPos);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 60);
    ctx.lineTo(750, canvas.height - 60);
    ctx.stroke();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Arial';
    ctx.fillText('Built with ❤️ by M. Hassan Asghar', 50, canvas.height - 30);

    this.downloadCanvas(canvas, `receipt_${person.name}_${Date.now()}.png`);
  }

  generateTransactionReceipt(person: Person, transaction: Transaction): void {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Transaction Receipt', 50, 60);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '16px Arial';
    ctx.fillText(transaction.timestamp.toLocaleString(), 50, 90);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(750, 110);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Person: ${person.name}`, 50, 150);

    ctx.font = '18px Arial';
    const typeText = this.getTransactionTypeText(transaction.type);
    ctx.fillText(`Type: ${typeText}`, 50, 190);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Amount: PKR ${transaction.amount.toFixed(2)}`, 50, 230);

    if (transaction.note) {
      ctx.fillStyle = '#cccccc';
      ctx.font = '16px Arial';
      ctx.fillText(`Note: ${transaction.note}`, 50, 270);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    const balanceText = transaction.balanceAfter >= 0
      ? `Balance after: They owe me PKR ${transaction.balanceAfter.toFixed(2)}`
      : `Balance after: I owe them PKR ${Math.abs(transaction.balanceAfter).toFixed(2)}`;

    ctx.fillStyle = transaction.balanceAfter >= 0 ? '#00ff88' : '#ff6b6b';
    ctx.fillText(balanceText, 50, 320);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 60);
    ctx.lineTo(750, canvas.height - 60);
    ctx.stroke();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px Arial';
    ctx.fillText('Built with ❤️ by M. Hassan Asghar', 50, canvas.height - 30);

    this.downloadCanvas(canvas, `transaction_${person.name}_${transaction.id}.png`);
  }

  private getTransactionTypeText(type: string): string {
    switch (type) {
      case 'they_paid_me': return 'They Paid Me';
      case 'i_paid_them': return 'I Paid Them';
      case 'they_owe_more': return 'They Owe More';
      case 'i_owe_more': return 'I Owe More';
      default: return type;
    }
  }

  private downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
