import { useEffect, useState } from 'react';
import {
  CheckSquare, CreditCard, CalendarClock, Sparkles, TrendingUp,
  AlertCircle, ArrowRight, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Charts';
import { prioritizeTasks, generateDailySchedule, analyzeProductivity, type ScheduleBlock, type PrioritizedTask } from '@/lib/ai';
import { navigate } from '@/lib/router';
import type { Task, Bill, Appointment, NotificationItem } from '@/types';

export function Dashboard() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [t, b, a, n] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('bills').select('*').eq('user_id', user.id),
        supabase.from('appointments').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);
      setTasks((t.data as Task[]) ?? []);
      setBills((b.data as Bill[]) ?? []);
      setAppointments((a.data as Appointment[]) ?? []);
      setNotifs((n.data as NotificationItem[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const prioritized: PrioritizedTask[] = prioritizeTasks(tasks);
  const schedule: ScheduleBlock[] = generateDailySchedule(tasks, appointments, bills);
  const insights = analyzeProductivity(tasks);
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingBills = bills.filter((b) => b.status === 'pending');
  const upcomingAppts = appointments.filter((a) => a.status === 'scheduled');
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = upcomingAppts.filter((a) => a.date === today);

  const stats = [
    { label: 'Active Tasks', value: tasks.filter((t) => t.status !== 'completed').length, icon: CheckSquare, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30', route: 'tasks' as const },
    { label: 'Pending Bills', value: pendingBills.length, icon: CreditCard, color: 'text-warning-600 bg-warning-50 dark:bg-warning-900/30', route: 'bills' as const },
    { label: 'Appointments', value: upcomingAppts.length, icon: CalendarClock, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/30', route: 'appointments' as const },
    { label: 'Completed', value: completedTasks, icon: TrendingUp, color: 'text-success-600 bg-success-50 dark:bg-success-900/30', route: 'analytics' as const },
  ];

  if (loading) {
    return <div className="p-6 animate-pulse space-y-4"><div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" /><div className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800" /></div>;
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{greeting}, {firstName}.</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's your life at a glance. {todayAppts.length > 0 && `You have ${todayAppts.length} appointment(s) today.`}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} hover onClick={() => navigate(s.route)} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI Daily Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader title="AI Daily Schedule" subtitle="Optimized plan based on your priorities" icon={<Sparkles className="h-5 w-5" />} action={<Button variant="ghost" size="sm" onClick={() => navigate('ai-chat')}>Ask AI <ArrowRight className="h-3.5 w-3.5" /></Button>} />
          <div className="p-5">
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No schedule yet. Add tasks to get a plan.</p>
            ) : (
              <div className="space-y-1">
                {schedule.map((block, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">{block.time}</span>
                    </div>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      block.type === 'task' ? 'bg-primary-500' : block.type === 'appointment' ? 'bg-accent-500' : block.type === 'bill' ? 'bg-warning-500' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{block.label}</p>
                      {block.detail && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{block.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Productivity ring */}
        <Card>
          <CardHeader title="Productivity" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-5 flex flex-col items-center gap-4">
            <ProgressRing value={completedTasks} max={tasks.length || 1} label="completed" />
            <div className="w-full space-y-2">
              {insights.map((ins) => (
                <div key={ins.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{ins.label}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{ins.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priority tasks */}
        <Card>
          <CardHeader title="Priority Tasks" subtitle="AI-ranked by urgency" icon={<AlertCircle className="h-5 w-5" />} action={<Button variant="ghost" size="sm" onClick={() => navigate('tasks')}>View all</Button>} />
          <div className="p-5 space-y-2">
            {prioritized.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active tasks. Add one in Task Manager.</p>
            ) : (
              prioritized.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${t.priority === 'urgent' ? 'bg-error-500' : t.priority === 'high' ? 'bg-warning-500' : t.priority === 'medium' ? 'bg-primary-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.reason}</p>
                  </div>
                  <Badge variant={t.priority === 'urgent' ? 'error' : t.priority === 'high' ? 'warning' : 'default'}>{t.priority}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent notifications */}
        <Card>
          <CardHeader title="Recent Activity" icon={<Sparkles className="h-5 w-5" />} action={<Button variant="ghost" size="sm" onClick={() => navigate('notifications')}>View all</Button>} />
          <div className="p-5 space-y-2">
            {notifs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
