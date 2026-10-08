import { useEffect, useState } from 'react';
import {
  Plus, CreditCard, Trash2, CheckCircle2, Clock, AlertTriangle,
  Smartphone, Wallet, Building2, Shield, Check, Download, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { processPayment, generateReceipt, downloadReceipt } from '@/lib/payment';
import { createNotification, shareViaWhatsApp, shareViaEmail } from '@/lib/notifications';
import type { Bill, Subscription, Transaction, BillStatus, PaymentMethod } from '@/types';

const billCategories = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

const cycleOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'weekly', label: 'Weekly' },
];

export function BillsAndSubscriptions() {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'bills' | 'subscriptions' | 'history'>('bills');
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  // Payment flow state
  const [payBill, setPayBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ bill: Bill; transaction: Transaction } | null>(null);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bankName, setBankName] = useState('');

  const [billForm, setBillForm] = useState({ name: '', amount: '', due_date: '', category: 'utilities', consumer_id: '', payee: '', recurring: false, reminder_at: '' });
  const [subForm, setSubForm] = useState({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '', category: 'entertainment' });

  const load = async () => {
    if (!user) return;
    const [b, s, t] = await Promise.all([
      supabase.from('bills').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).order('next_billing_date', { ascending: true }),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setBills((b.data as Bill[]) ?? []);
    setSubs((s.data as Subscription[]) ?? []);
    setTransactions((t.data as Transaction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !billForm.name.trim() || !billForm.amount || !billForm.due_date) return;
    const { data, error } = await supabase.from('bills').insert({
      user_id: user.id,
      name: billForm.name,
      amount: parseFloat(billForm.amount),
      due_date: billForm.due_date,
      category: billForm.category,
      consumer_id: billForm.consumer_id,
      payee: billForm.payee,
      recurring: billForm.recurring,
      reminder_at: billForm.reminder_at ? new Date(billForm.reminder_at).toISOString() : null,
    }).select().single();
    if (error) { toast('Failed to add bill', 'error'); return; }
    setBills((prev) => [...prev, data as Bill].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    await createNotification(user.id, 'New bill added', `${billForm.name} of Rs. ${billForm.amount} due ${billForm.due_date}.`, 'bill');
    setBillForm({ name: '', amount: '', due_date: '', category: 'utilities', consumer_id: '', payee: '', recurring: false, reminder_at: '' });
    setShowAddBill(false);
    toast('Bill added');
  };

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subForm.name.trim() || !subForm.amount || !subForm.next_billing_date) return;
    const { data, error } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      name: subForm.name,
      amount: parseFloat(subForm.amount),
      billing_cycle: subForm.billing_cycle,
      next_billing_date: subForm.next_billing_date,
      category: subForm.category,
    }).select().single();
    if (error) { toast('Failed to add subscription', 'error'); return; }
    setSubs((prev) => [...prev, data as Subscription]);
    setSubForm({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '', category: 'entertainment' });
    setShowAddSub(false);
    toast('Subscription added');
  };

  const handlePay = async () => {
    if (!user || !payBill) return;
    if (paymentMethod === 'upi' && !upiId.trim()) { toast('Enter your UPI ID', 'error'); return; }
    if (paymentMethod === 'card' && (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCvv.trim())) { toast('Fill all card details', 'error'); return; }
    if (paymentMethod === 'netbanking' && !bankName.trim()) { toast('Select your bank', 'error'); return; }
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1500));
    const { transaction, error } = await processPayment(user.id, payBill, paymentMethod);
    setPaying(false);
    if (error || !transaction) { toast('Payment failed', 'error'); return; }
    setBills((prev) => prev.map((b) => b.id === payBill.id ? { ...b, status: 'paid' } : b));
    setTransactions((prev) => [transaction, ...prev]);
    await createNotification(user.id, 'Payment successful', `${payBill.name} of Rs. ${payBill.amount} paid. Txn: ${transaction.transaction_id}`, 'bill');
    setPaymentResult({ bill: payBill, transaction });
    setPayBill(null);
    toast('Payment successful!');
  };

  const downloadRcpt = () => {
    if (!paymentResult) return;
    const content = generateReceipt(paymentResult.bill, paymentResult.transaction, profile?.full_name || 'User');
    downloadReceipt(content, `receipt-${paymentResult.transaction.transaction_id}.txt`);
    toast('Receipt downloaded');
  };

  const deleteBill = async () => {
    if (!deleteBillId) return;
    await supabase.from('bills').delete().eq('id', deleteBillId);
    setBills((prev) => prev.filter((b) => b.id !== deleteBillId));
    setDeleteBillId(null);
    toast('Bill deleted');
  };

  const deleteSub = async () => {
    if (!deleteSubId) return;
    await supabase.from('subscriptions').delete().eq('id', deleteSubId);
    setSubs((prev) => prev.filter((s) => s.id !== deleteSubId));
    setDeleteSubId(null);
    toast('Subscription deleted');
  };

  const totalPending = bills.filter((b) => b.status === 'pending').reduce((s, b) => s + b.amount, 0);
  const totalSubs = subs.filter((s) => s.status === 'active').reduce((s, sub) => s + sub.amount, 0);

  const statusBadge = (status: BillStatus) => {
    const map = { pending: 'warning', paid: 'success', overdue: 'error' } as const;
    return <Badge variant={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const methodIcon = (m: PaymentMethod) => m === 'upi' ? <Smartphone className="h-5 w-5" /> : m === 'card' ? <CreditCard className="h-5 w-5" /> : <Building2 className="h-5 w-5" />;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills & Subscriptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rs. {totalPending.toFixed(2)} pending · Rs. {totalSubs.toFixed(2)}/mo in subscriptions</p>
        </div>
        {tab === 'bills' && <Button onClick={() => setShowAddBill(true)}><Plus className="h-4 w-4" /> Add Bill</Button>}
        {tab === 'subscriptions' && <Button onClick={() => setShowAddSub(true)}><Plus className="h-4 w-4" /> Add Subscription</Button>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Pending Bills</p><p className="text-2xl font-bold text-warning-600 dark:text-warning-400 mt-1">Rs. {totalPending.toFixed(2)}</p></div>
            <div className="h-10 w-10 rounded-lg bg-warning-50 dark:bg-warning-900/30 flex items-center justify-center"><Clock className="h-5 w-5 text-warning-600" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Monthly Subs</p><p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">Rs. {totalSubs.toFixed(2)}</p></div>
            <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center"><RefreshCw className="h-5 w-5 text-primary-600" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Paid (All-time)</p><p className="text-2xl font-bold text-success-600 dark:text-success-400 mt-1">{transactions.length}</p></div>
            <div className="h-10 w-10 rounded-lg bg-success-50 dark:bg-success-900/30 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-success-600" /></div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
        {(['bills', 'subscriptions', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t === 'history' ? 'Payment History' : t}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : tab === 'bills' ? (
        bills.length === 0 ? (
          <Card><EmptyState icon={<CreditCard className="h-7 w-7" />} title="No bills yet" description="Add your first bill to start tracking and paying." action={<Button onClick={() => setShowAddBill(true)}><Plus className="h-4 w-4" /> Add Bill</Button>} /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {bills.map((bill) => (
              <Card key={bill.id} className="p-4 hover:card-shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{bill.name}</p>{statusBadge(bill.status)}</div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Rs. {bill.amount.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {new Date(bill.due_date).toLocaleDateString()}</span>
                      {bill.recurring && <Badge variant="accent">Recurring</Badge>}
                    </div>
                    {bill.consumer_id && <p className="text-xs text-gray-400 mt-1">Consumer ID: {bill.consumer_id}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {bill.status === 'pending' ? (
                    <Button size="sm" className="flex-1" onClick={() => { setPayBill(bill); setPaymentMethod('upi'); setUpiId(''); setCardNumber(''); setCardName(''); setCardExpiry(''); setCardCvv(''); setBankName(''); }}><CreditCard className="h-4 w-4" /> Pay Bill</Button>
                  ) : (
                    <Button size="sm" variant="success" className="flex-1" disabled><CheckCircle2 className="h-4 w-4" /> Paid</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteBillId(bill.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'subscriptions' ? (
        subs.length === 0 ? (
          <Card><EmptyState icon={<RefreshCw className="h-7 w-7" />} title="No subscriptions" description="Track your recurring subscriptions here." action={<Button onClick={() => setShowAddSub(true)}><Plus className="h-4 w-4" /> Add Subscription</Button>} /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subs.map((sub) => (
              <Card key={sub.id} className="p-4 hover:card-shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{sub.name}</p>
                    <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">Rs. {sub.amount.toFixed(2)}<span className="text-xs font-normal text-gray-400">/{sub.billing_cycle.slice(0, 3)}</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Next: {new Date(sub.next_billing_date).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={sub.status === 'active' ? 'success' : 'default'}>{sub.status}</Badge>
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="ghost" onClick={() => setDeleteSubId(sub.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        transactions.length === 0 ? (
          <Card><EmptyState icon={<CreditCard className="h-7 w-7" />} title="No payments yet" description="Your payment history will appear here." /></Card>
        ) : (
          <Card>
            <CardHeader title="Payment History" subtitle={`${transactions.length} transactions`} />
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 p-4">
                  <div className="h-9 w-9 rounded-lg bg-success-50 dark:bg-success-900/30 flex items-center justify-center text-success-600">{methodIcon(txn.method)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Rs. {txn.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{txn.transaction_id} · {new Date(txn.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="success">{txn.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {/* Add Bill Modal */}
      <Modal open={showAddBill} onClose={() => setShowAddBill(false)} title="Add New Bill">
        <form onSubmit={addBill} className="space-y-4">
          <Input label="Bill name" value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} placeholder="e.g. Electricity Bill" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (Rs.)" type="number" step="0.01" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} placeholder="0.00" required />
            <Input label="Due date" type="date" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })} options={billCategories} />
            <Input label="Payee" value={billForm.payee} onChange={(e) => setBillForm({ ...billForm, payee: e.target.value })} placeholder="Provider name" />
          </div>
          <Input label="Consumer ID" value={billForm.consumer_id} onChange={(e) => setBillForm({ ...billForm, consumer_id: e.target.value })} placeholder="Your account/consumer number" />
          <Input label="Reminder (date & time)" type="datetime-local" value={billForm.reminder_at} onChange={(e) => setBillForm({ ...billForm, reminder_at: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={billForm.recurring} onChange={(e) => setBillForm({ ...billForm, recurring: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            Recurring bill (monthly)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddBill(false)}>Cancel</Button>
            <Button type="submit">Add Bill</Button>
          </div>
        </form>
      </Modal>

      {/* Add Sub Modal */}
      <Modal open={showAddSub} onClose={() => setShowAddSub(false)} title="Add Subscription" size="sm">
        <form onSubmit={addSub} className="space-y-4">
          <Input label="Name" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} placeholder="e.g. Netflix" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (Rs.)" type="number" step="0.01" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} placeholder="0.00" required />
            <Select label="Billing cycle" value={subForm.billing_cycle} onChange={(e) => setSubForm({ ...subForm, billing_cycle: e.target.value })} options={cycleOptions} />
          </div>
          <Input label="Next billing date" type="date" value={subForm.next_billing_date} onChange={(e) => setSubForm({ ...subForm, next_billing_date: e.target.value })} required />
          <Input label="Category" value={subForm.category} onChange={(e) => setSubForm({ ...subForm, category: e.target.value })} placeholder="e.g. entertainment" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddSub(false)}>Cancel</Button>
            <Button type="submit">Add Subscription</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payBill} onClose={() => setPayBill(null)} title="Secure Payment" size="md">
        {payBill && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <Shield className="h-4 w-4 text-success-500" />
              <span>256-bit encrypted secure payment gateway</span>
            </div>
            {/* Bill details */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Bill</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{payBill.name}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Payee</span><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{payBill.payee || 'N/A'}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Consumer ID</span><span className="text-sm font-mono text-gray-900 dark:text-gray-100">{payBill.consumer_id || 'N/A'}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Due Date</span><span className="text-sm text-gray-900 dark:text-gray-100">{new Date(payBill.due_date).toLocaleDateString()}</span></div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Amount Payable</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Rs. {payBill.amount.toFixed(2)}</span>
              </div>
            </div>
            {/* Payment method */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'upi', label: 'UPI', icon: Smartphone },
                  { value: 'card', label: 'Card', icon: CreditCard },
                  { value: 'netbanking', label: 'Net Banking', icon: Building2 },
                ] as const).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${paymentMethod === m.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                      <Icon className={`h-5 w-5 ${paymentMethod === m.value ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium ${paymentMethod === m.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Method-specific form */}
            {paymentMethod === 'upi' && (
              <Input label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" required />
            )}
            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <Input label="Card number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} required />
                <Input label="Name on card" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="ALEX JOHNSON" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Expiry (MM/YY)" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="12/28" maxLength={5} required />
                  <Input label="CVV" type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" maxLength={3} required />
                </div>
              </div>
            )}
            {paymentMethod === 'netbanking' && (
              <Select label="Select bank" value={bankName} onChange={(e) => setBankName(e.target.value)} options={[{ value: '', label: 'Choose bank...' }, { value: 'HDFC', label: 'HDFC Bank' }, { value: 'SBI', label: 'State Bank of India' }, { value: 'ICICI', label: 'ICICI Bank' }, { value: 'Axis', label: 'Axis Bank' }, { value: 'Kotak', label: 'Kotak Mahindra' }]} />
            )}
            <Button onClick={handlePay} loading={paying} className="w-full" size="lg"><Shield className="h-4 w-4" /> Pay Rs. {payBill.amount.toFixed(2)}</Button>
          </div>
        )}
      </Modal>

      {/* Payment Success Modal */}
      <Modal open={!!paymentResult} onClose={() => setPaymentResult(null)} title="Payment Successful" size="sm">
        {paymentResult && (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/40 flex items-center justify-center mx-auto animate-scale-in">
              <CheckCircle2 className="h-9 w-9 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">Rs. {paymentResult.bill.amount.toFixed(2)} Paid</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{paymentResult.bill.name} · Status updated to Paid</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-left space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Transaction ID</span><span className="font-mono text-gray-900 dark:text-gray-100">{paymentResult.transaction.transaction_id}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="text-gray-900 dark:text-gray-100 uppercase">{paymentResult.transaction.method}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="text-gray-900 dark:text-gray-100">{new Date(paymentResult.transaction.created_at).toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => shareViaWhatsApp(`Payment of Rs. ${paymentResult.bill.amount.toFixed(2)} for ${paymentResult.bill.name} successful. Txn ID: ${paymentResult.transaction.transaction_id}`)}>WhatsApp</Button>
              <Button variant="secondary" className="flex-1" onClick={() => shareViaEmail('Payment Receipt', `Payment of Rs. ${paymentResult.bill.amount.toFixed(2)} for ${paymentResult.bill.name} was successful.\n\nTransaction ID: ${paymentResult.transaction.transaction_id}\nDate: ${new Date(paymentResult.transaction.created_at).toLocaleString()}`)}>Email</Button>
            </div>
            <Button className="w-full" onClick={downloadRcpt}><Download className="h-4 w-4" /> Download Receipt</Button>
            <Button variant="ghost" className="w-full" onClick={() => setPaymentResult(null)}>Done</Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteBillId} title="Delete bill?" message="This bill will be permanently removed." onConfirm={deleteBill} onCancel={() => setDeleteBillId(null)} />
      <ConfirmDialog open={!!deleteSubId} title="Delete subscription?" message="This subscription will be permanently removed." onConfirm={deleteSub} onCancel={() => setDeleteSubId(null)} />
    </div>
  );
}
