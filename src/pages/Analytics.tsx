import { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Target, ArrowRight, Calendar, CreditCard, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BarChart, DonutChart, ProgressRing } from '@/components/ui/Charts';
import { analyzeProductivity, prioritizeTasks } from '@/lib/ai';
import { navigate } from '@/lib/router';
import type { Task, Bill, Appointment, Opportunity } from '@/types';

type StatFilter = 'all' | 'completed' | 'in_progress' | 'pending' | null;

export function Analytics() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [appts, setAppointments] = useState<Appointment[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatFilter>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [t, b, a, o] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('bills').select('*').eq('user_id', user.id),
        supabase.from('appointments').select('*').eq('user_id', user.id),
        supabase.from('opportunities').select('*').eq('user_id', user.id),
      ]);
      setTasks((t.data as Task[]) ?? []);
      setBills((b.data as Bill[]) ?? []);
      setAppointments((a.data as Appointment[]) ?? []);
      setOpps((o.data as Opportunity[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>;
  }

  const insights = analyzeProductivity(tasks);
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completed = completedTasks.length;
  const pending = pendingTasks.length;
  const inProgress = inProgressTasks.length;

  // Weekly completion (last 7 days)
  const weekData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.status === 'completed' && t.created_at.slice(0, 10) === ds).length;
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), value: count };
  });

  // Task priority distribution
  const priorityData = [
    { label: 'Urgent', value: tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length, color: '#ef4444' },
    { label: 'High', value: tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length, color: '#f59e0b' },
    { label: 'Medium', value: tasks.filter((t) => t.priority === 'medium' && t.status !== 'completed').length, color: '#3b82f6' },
    { label: 'Low', value: tasks.filter((t) => t.priority === 'low' && t.status !== 'completed').length, color: '#9ca3af' },
  ];

  const paidBills = bills.filter((b) => b.status === 'paid');
  const pendingBills = bills.filter((b) => b.status === 'pending');

  const oppData = [
    { label: 'Internships', value: opps.filter((o) => o.type === 'internship').length, color: '#06b6d4' },
    { label: 'Jobs', value: opps.filter((o) => o.type === 'job').length, color: '#3b82f6' },
    { label: 'Hackathons', value: opps.filter((o) => o.type === 'hackathon').length, color: '#f59e0b' },
    { label: 'Courses', value: opps.filter((o) => o.type === 'course').length, color: '#22c55e' },
  ].filter((d) => d.value > 0);

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: Target, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30', filter: 'all' as StatFilter },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success-600 bg-success-50 dark:bg-success-900/30', filter: 'completed' as StatFilter },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/30', filter: 'in_progress' as StatFilter },
    { label: 'Pending', value: pending, icon: AlertCircle, color: 'text-warning-600 bg-warning-50 dark:bg-warning-900/30', filter: 'pending' as StatFilter },
  ];

  // Filtered task list for the modal
  const filteredTasks = activeFilter === 'all' ? tasks : activeFilter === 'completed' ? completedTasks : activeFilter === 'in_progress' ? inProgressTasks : activeFilter === 'pending' ? pendingTasks : [];
  const prioritizedFiltered = activeFilter === 'pending' || activeFilter === 'in_progress' ? prioritizeTasks(filteredTasks) : filteredTasks;
  const modalTitle = activeFilter === 'all' ? 'All Tasks' : activeFilter === 'completed' ? 'Completed Tasks' : activeFilter === 'in_progress' ? 'In Progress Tasks' : 'Pending Tasks';

  const priorityBadgeVariant = (p: string) => p === 'urgent' ? 'error' : p === 'high' ? 'warning' : p === 'medium' ? 'primary' : 'default';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered insights into your productivity and life admin. Click any stat to see details.</p>
      </div>

      {/* Stat cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} hover className="p-4" onClick={() => setActiveFilter(s.filter)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="h-5 w-5" /></div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                View details <ArrowRight className="h-3 w-3" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* AI insights */}
      <Card>
        <CardHeader title="AI Productivity Insights" icon={<TrendingUp className="h-5 w-5" />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {insights.map((ins) => (
            <div key={ins.label} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{ins.value}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{ins.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ins.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Task Completion</h3>
          <div className="flex items-center justify-around">
            <ProgressRing value={completed} max={tasks.length || 1} size={140} label="completed" />
            <div className="space-y-2">
              <button onClick={() => setActiveFilter('completed')} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <span className="h-3 w-3 rounded-full bg-success-500" /><span className="text-sm text-gray-600 dark:text-gray-300">Completed: {completed}</span>
              </button>
              <button onClick={() => setActiveFilter('in_progress')} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <span className="h-3 w-3 rounded-full bg-accent-500" /><span className="text-sm text-gray-600 dark:text-gray-300">In Progress: {inProgress}</span>
              </button>
              <button onClick={() => setActiveFilter('pending')} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <span className="h-3 w-3 rounded-full bg-warning-500" /><span className="text-sm text-gray-600 dark:text-gray-300">Pending: {pending}</span>
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Weekly Completion Trend</h3>
          <BarChart data={weekData} height={180} />
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Priority Distribution</h3>
          {priorityData.every((d) => d.value === 0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No active tasks to analyze.</p>
          ) : (
            <DonutChart segments={priorityData} />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Bills Overview</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('bills')} className="w-full flex items-center justify-between p-3 rounded-lg bg-success-50 dark:bg-success-900/20 hover:opacity-80 transition-opacity">
              <span className="text-sm text-gray-700 dark:text-gray-300">Paid Bills</span>
              <Badge variant="success">{paidBills.length}</Badge>
            </button>
            <button onClick={() => navigate('bills')} className="w-full flex items-center justify-between p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 hover:opacity-80 transition-opacity">
              <span className="text-sm text-gray-700 dark:text-gray-300">Pending Bills</span>
              <Badge variant="warning">{pendingBills.length}</Badge>
            </button>
            <button onClick={() => navigate('bills')} className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:opacity-80 transition-opacity">
              <span className="text-sm text-gray-700 dark:text-gray-300">Total Bills</span>
              <Badge>{bills.length}</Badge>
            </button>
          </div>
        </Card>
      </div>

      {oppData.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Opportunities by Type</h3>
          <DonutChart segments={oppData} />
        </Card>
      )}

      {/* Task detail modal */}
      <Modal open={activeFilter !== null} onClose={() => setActiveFilter(null)} title={modalTitle} size="lg">
        {prioritizedFiltered.length === 0 ? (
          <div className="py-10 text-center">
            <Circle className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks in this category.</p>
          </div>
        ) : (
          <>
            {activeFilter === 'pending' && (
              <div className="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-700 dark:text-primary-300">
                <span className="font-medium">AI suggests:</span> Start with "{(prioritizeTasks(pendingTasks)[0] as { title: string })?.title ?? '—'}" — it has the highest priority score.
              </div>
            )}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {prioritizedFiltered.map((task, idx) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-success-500" /> : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(activeFilter === 'pending' || activeFilter === 'in_progress') && <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>}
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>
                      <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                      <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'accent' : 'warning'}>{task.status.replace('_', ' ')}</Badge>
                    </div>
                    {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {task.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}</span>}
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{task.category}</span>
                      {'reason' in task && task.reason && <span className="text-primary-600 dark:text-primary-400">{(task as { reason: string }).reason}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setActiveFilter(null)}>Close</Button>
              <Button onClick={() => { setActiveFilter(null); navigate('tasks'); }}>Open Task Manager <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
