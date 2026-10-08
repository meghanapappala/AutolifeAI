import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, Mail, MessageCircle, Monitor } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { formatRelativeTime, requestBrowserPermission, showBrowserNotification, shareViaWhatsApp, shareViaEmail } from '@/lib/notifications';
import type { NotificationItem, NotificationType } from '@/types';

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'accent' }> = {
  info: { icon: Bell, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800', variant: 'default' },
  reminder: { icon: Bell, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30', variant: 'primary' },
  opportunity: { icon: Bell, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/30', variant: 'accent' },
  bill: { icon: Bell, color: 'text-warning-600 bg-warning-50 dark:bg-warning-900/30', variant: 'warning' },
  task: { icon: Bell, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/30', variant: 'primary' },
  appointment: { icon: Bell, color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/30', variant: 'accent' },
  system: { icon: Bell, color: 'text-gray-500 bg-gray-100 dark:bg-gray-800', variant: 'default' },
};

export function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearAll, setClearAll] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotifs((data as NotificationItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    setBrowserEnabled('Notification' in window && Notification.permission === 'granted');
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    toast('All marked as read');
  };

  const markRead = async (n: NotificationItem) => {
    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
  };

  const remove = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const clear = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifs([]);
    setClearAll(false);
    toast('All notifications cleared');
  };

  const enableBrowser = async () => {
    const ok = await requestBrowserPermission();
    setBrowserEnabled(ok);
    if (ok) { showBrowserNotification('AutoLife AI', 'Browser notifications enabled!'); toast('Browser notifications enabled'); }
    else toast('Permission denied', 'error');
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{unread} unread · {notifs.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {notifs.length > 0 && <Button variant="secondary" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
          {notifs.length > 0 && <Button variant="ghost" size="sm" onClick={() => setClearAll(true)}><Trash2 className="h-4 w-4" /> Clear all</Button>}
        </div>
      </div>

      {/* Notification channels */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Notification Channels</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${browserEnabled ? 'border-success-200 dark:border-success-900/40 bg-success-50 dark:bg-success-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${browserEnabled ? 'bg-success-100 dark:bg-success-900/40 text-success-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><Monitor className="h-4.5 w-4.5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Browser</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{browserEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            {!browserEnabled && <Button size="sm" variant="ghost" onClick={enableBrowser}>Enable</Button>}
          </div>
          <button onClick={() => shareViaWhatsApp('AutoLife AI — check your reminders in the app!')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <div className="h-9 w-9 rounded-lg bg-success-100 dark:bg-success-900/40 text-success-600 flex items-center justify-center"><MessageCircle className="h-4.5 w-4.5" /></div>
            <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">WhatsApp</p><p className="text-xs text-gray-500 dark:text-gray-400">Share reminders</p></div>
          </button>
          <button onClick={() => shareViaEmail('AutoLife AI Reminder', 'Check your AutoLife AI dashboard for your latest reminders.')} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center"><Mail className="h-4.5 w-4.5" /></div>
            <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</p><p className="text-xs text-gray-500 dark:text-gray-400">Share reminders</p></div>
          </button>
        </div>
      </Card>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : notifs.length === 0 ? (
        <Card><EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="You're all caught up! Notifications about tasks, bills, and appointments will appear here." /></Card>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const cfg = typeConfig[n.type];
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className={`p-4 transition-all ${!n.read ? 'border-primary-200 dark:border-primary-900/40' : ''} hover:card-shadow-lg`}>
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}><Icon className="h-4.5 w-4.5" /></div>
                  <div className="flex-1 min-w-0" onClick={() => !n.read && markRead(n)}>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${n.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={cfg.variant}>{n.type}</Badge>
                      <span className="text-xs text-gray-400">{formatRelativeTime(n.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/30 transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={clearAll} title="Clear all notifications?" message="All notifications will be permanently removed." onConfirm={clear} onCancel={() => setClearAll(false)} />
    </div>
  );
}
