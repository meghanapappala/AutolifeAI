import { useEffect, useState } from 'react';
import { Plus, CalendarClock, MapPin, Clock, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { createNotification, shareViaWhatsApp, shareViaEmail } from '@/lib/notifications';
import type { Appointment, AppointmentStatus } from '@/types';

export function Appointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '09:00', location: '', reminder_at: '' });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('appointments').select('*').eq('user_id', user.id).order('date', { ascending: true });
    setAppts((data as Appointment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.date) return;
    const { data, error } = await supabase.from('appointments').insert({
      user_id: user.id, title: form.title, description: form.description, date: form.date, time: form.time, location: form.location,
      reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
    }).select().single();
    if (error) { toast('Failed to add appointment', 'error'); return; }
    setAppts((prev) => [...prev, data as Appointment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    await createNotification(user.id, 'Appointment scheduled', `${form.title} on ${form.date} at ${form.time}.`, 'appointment');
    setForm({ title: '', description: '', date: '', time: '09:00', location: '', reminder_at: '' });
    setShowAdd(false);
    toast('Appointment added');
  };

  const updateStatus = async (appt: Appointment, status: AppointmentStatus) => {
    await supabase.from('appointments').update({ status }).eq('id', appt.id);
    setAppts((prev) => prev.map((a) => a.id === appt.id ? { ...a, status } : a));
    toast(`Appointment ${status}`);
  };

  const remove = async () => {
    if (!deleteId) return;
    await supabase.from('appointments').delete().eq('id', deleteId);
    setAppts((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast('Appointment deleted');
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appts.filter((a) => a.status === 'scheduled' && a.date >= today);
  const past = appts.filter((a) => a.status !== 'scheduled' || a.date < today);

  const statusBadge = (s: AppointmentStatus) => {
    const map = { scheduled: 'primary', completed: 'success', cancelled: 'error' } as const;
    return <Badge variant={map[s]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{upcoming.length} upcoming</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Schedule</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : appts.length === 0 ? (
        <Card><EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No appointments" description="Schedule your first appointment and get reminders." action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Schedule</Button>} /></Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Upcoming</h2>
              {upcoming.map((a) => (
                <Card key={a.id} className="p-4 hover:card-shadow-lg transition-all duration-200 animate-slide-up">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">{new Date(a.date).toLocaleDateString('en', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400 leading-none">{new Date(a.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="font-semibold text-gray-900 dark:text-gray-100">{a.title}</p>{statusBadge(a.status)}</div>
                      {a.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{a.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>
                        {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a, 'completed')} title="Mark complete"><CheckCircle2 className="h-4 w-4 text-success-500" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a, 'cancelled')} title="Cancel"><XCircle className="h-4 w-4 text-error-500" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(a.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Past</h2>
              {past.map((a) => (
                <Card key={a.id} className="p-4 opacity-70">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="font-medium text-gray-700 dark:text-gray-300">{a.title}</p>{statusBadge(a.status)}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(a.date).toLocaleDateString()} at {a.time}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule Appointment">
        <form onSubmit={add} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Doctor visit" required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional notes..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Input label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. City Hospital, Room 204" />
          <Input label="Reminder (date & time)" type="datetime-local" value={form.reminder_at} onChange={(e) => setForm({ ...form, reminder_at: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Schedule</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete appointment?" message="This appointment will be permanently removed." onConfirm={remove} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
