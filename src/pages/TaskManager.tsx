import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Sparkles, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { prioritizeTasks, type PrioritizedTask } from '@/lib/ai';
import { createNotification } from '@/lib/notifications';
import type { Task, Priority, TaskStatus } from '@/types';

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusOptions = [
  { value: 'all', label: 'All Tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Priority, due_date: '', category: 'general', reminder_at: '' });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_date: form.due_date || null,
      category: form.category,
      reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
    }).select().single();
    if (error) { toast('Failed to add task', 'error'); return; }
    setTasks((prev) => [data as Task, ...prev]);
    await createNotification(user.id, 'Task added', `"${form.title}" has been added to your tasks.`, 'task');
    setForm({ title: '', description: '', priority: 'medium', due_date: '', category: 'general', reminder_at: '' });
    setShowAdd(false);
    toast('Task added');
  };

  const toggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    if (newStatus === 'completed') toast('Task completed!');
  };

  const updateStatus = async (task: Task, status: TaskStatus) => {
    await supabase.from('tasks').update({ status }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status } : t));
  };

  const deleteTask = async () => {
    if (!deleteId) return;
    await supabase.from('tasks').delete().eq('id', deleteId);
    setTasks((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
    toast('Task deleted');
  };

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const prioritized: PrioritizedTask[] = prioritizeTasks(filtered);
  const active = tasks.filter((t) => t.status !== 'completed');
  const completed = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Task Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{active.length} active · {completed.length} completed · AI-prioritized</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Task</Button>
      </div>

      {/* AI priority banner */}
      {prioritized.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border-primary-100 dark:border-primary-900/40">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Recommendation</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                Focus on <span className="font-semibold">{prioritized[0].title}</span> — {prioritized[0].reason.toLowerCase()}. This has the highest impact right now.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<CheckCircle2 className="h-7 w-7" />} title="No tasks here" description="Add your first task and let AI help you prioritize it." action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Task</Button>} /></Card>
      ) : (
        <div className="space-y-2">
          {prioritized.map((task, idx) => (
            <Card key={task.id} className="p-4 hover:card-shadow-lg transition-all duration-200 animate-slide-up" >
              <div className="flex items-start gap-3">
                <button onClick={() => toggleStatus(task)} className="mt-0.5 shrink-0">
                  {task.status === 'completed'
                    ? <CheckCircle2 className="h-5 w-5 text-success-500" />
                    : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 hover:text-primary-500" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {filter === 'all' && <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>}
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>
                    <Badge variant={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : task.priority === 'medium' ? 'primary' : 'default'}>{task.priority}</Badge>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {task.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}</span>}
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{task.category}</span>
                    <span className="text-primary-600 dark:text-primary-400">{task.reason}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {task.status !== 'completed' && (
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task, e.target.value as TaskStatus)}
                      className="text-xs h-8 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                  <button onClick={() => setDeleteId(task.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/30 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Task">
        <form onSubmit={addTask} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Finish project report" required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional details..." />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} options={priorityOptions} />
            <Input label="Due date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. work, personal, study" />
          <Input label="Reminder (date & time)" type="datetime-local" value={form.reminder_at} onChange={(e) => setForm({ ...form, reminder_at: e.target.value })} placeholder="When to notify you" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Add Task</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete task?" message="This task will be permanently removed." onConfirm={deleteTask} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
