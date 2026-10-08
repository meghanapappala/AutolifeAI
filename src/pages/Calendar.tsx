import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, toast } from '@/components/ui/Feedback';
import type { CalendarEvent } from '@/types';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Calendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '', color: COLORS[0], location: '' });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('events').select('*').eq('user_id', user.id).order('start_date', { ascending: true });
    setEvents((data as CalendarEvent[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const eventsForDate = (date: string) => events.filter((e) => {
    const start = new Date(e.start_date).toISOString().slice(0, 10);
    const end = new Date(e.end_date).toISOString().slice(0, 10);
    return date >= start && date <= end;
  });

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim() || !form.start_date) return;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date || form.start_date);
    end.setHours(end.getHours() + 1);
    const { data, error } = await supabase.from('events').insert({
      user_id: user.id, title: form.title, description: form.description,
      start_date: start.toISOString(), end_date: end.toISOString(), color: form.color, location: form.location,
    }).select().single();
    if (error) { toast('Failed to add event', 'error'); return; }
    setEvents((prev) => [...prev, data as CalendarEvent]);
    setForm({ title: '', description: '', start_date: '', end_date: '', color: COLORS[0], location: '' });
    setShowAdd(false);
    toast('Event added');
  };

  const remove = async () => {
    if (!deleteId) return;
    await supabase.from('events').delete().eq('id', deleteId);
    setEvents((prev) => prev.filter((ev) => ev.id !== deleteId));
    setDeleteId(null);
    toast('Event deleted');
  };

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{events.length} events scheduled</p>
        </div>
        <Button onClick={() => { setForm({ ...form, start_date: selectedDate || todayStr, end_date: selectedDate || todayStr }); setShowAdd(true); }}><Plus className="h-4 w-4" /> Add Event</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrent(new Date(year, month - 1, 1))}><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { setCurrent(new Date()); setSelectedDate(todayStr); }}>Today</Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrent(new Date(year, month + 1, 1))}><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const ds = dateStr(d);
              const dayEvents = eventsForDate(ds);
              const isToday = ds === todayStr;
              const isSelected = ds === selectedDate;
              return (
                <button key={d} onClick={() => setSelectedDate(ds)} className={`min-h-16 p-1.5 rounded-lg border text-left transition-all ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'} ${isToday && !isSelected ? 'ring-1 ring-primary-400' : ''}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}>{d}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} className="text-xs truncate px-1 py-0.5 rounded" style={{ backgroundColor: ev.color + '20', color: ev.color }}>{ev.title}</div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-gray-400">+{dayEvents.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected date events */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {selectedDate ? new Date(selectedDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
          </h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:card-shadow transition-all">
                  <div className="flex items-start gap-2">
                    <span className="h-3 w-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ev.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>}
                      </div>
                      {ev.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.description}</p>}
                    </div>
                    <button onClick={() => setDeleteId(ev.id)} className="p-1 rounded text-gray-400 hover:text-error-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Event">
        <form onSubmit={addEvent} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Team standup" required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start date" type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="End date" type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900' : ''}`} style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px ${c}` : '' }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Add Event</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete event?" message="This event will be permanently removed." onConfirm={remove} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
