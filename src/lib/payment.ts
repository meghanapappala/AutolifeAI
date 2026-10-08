import { supabase } from '@/lib/supabase';
import type { Bill, Transaction, PaymentMethod } from '@/types';

function generateTransactionId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TXN${ts}${rand}`;
}

export async function processPayment(
  userId: string,
  bill: Bill,
  method: PaymentMethod
): Promise<{ transaction: Transaction | null; error: string | null }> {
  const txnId = generateTransactionId();
  const { data, error } = await supabase.from('transactions').insert({
    user_id: userId,
    bill_id: bill.id,
    amount: bill.amount,
    method,
    transaction_id: txnId,
    status: 'success',
  }).select().single();

  if (error) return { transaction: null, error: error.message };

  await supabase.from('bills').update({ status: 'paid' }).eq('id', bill.id);

  return { transaction: data as Transaction, error: null };
}

export function generateReceipt(bill: Bill, transaction: Transaction, userName: string): string {
  const date = new Date(transaction.created_at).toLocaleString();
  return `
================================
       AutoLife AI — PAYMENT RECEIPT
================================

Transaction ID : ${transaction.transaction_id}
Date           : ${date}
Status         : ${transaction.status.toUpperCase()}
Payment Method : ${transaction.method.toUpperCase()}

--------------------------------
BILL DETAILS
--------------------------------
Bill Name      : ${bill.name}
Payee          : ${bill.payee || 'N/A'}
Consumer ID    : ${bill.consumer_id || 'N/A'}
Category       : ${bill.category}
Due Date       : ${bill.due_date}

--------------------------------
AMOUNT
--------------------------------
Amount Paid    : Rs. ${bill.amount.toFixed(2)}
Currency       : INR

--------------------------------
PAID BY
--------------------------------
Account Holder : ${userName}

================================
  Thank you for your payment!
  This is a system-generated receipt.
================================
`.trim();
}

export function downloadReceipt(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
