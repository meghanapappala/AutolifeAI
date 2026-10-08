import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fireReminder } from '@/lib/notifications';
import type { Task, Bill, Appointment, Profile } from '@/types';

interface ReminderRow {
  id: string;
  kind: 'task' | 'bill' | 'appointment';
  title: string;
  reminder_at: string;
}

const CHECK_INTERVAL = 30000; // 30 seconds

export function ReminderScheduler() {
  const { user, profile } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date().toISOString();
      const prof = profile as Profile | null;

      // Gather all items with a reminder_at that has passed and hasn't been sent
      const [tasksRes, billsRes, apptsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('reminder_sent', false).not('reminder_at', 'is', null),
        supabase.from('bills').select('*').eq('user_id', user.id).eq('reminder_sent', false).not('reminder_at', 'is', null),
        supabase.from('appointments').select('*').eq('user_id', user.id).eq('reminder_sent', false).not('reminder_at', 'is', null),
      ]);

      const due: ReminderRow[] = [];
      const channels = {
        whatsappNumber: prof?.whatsapp_number || undefined,
        email: user.email || undefined,
        browserEnabled: prof?.browser_notifications ?? true,
      };

      (tasksRes.data as Task[])?.forEach((t) => {
        if (t.reminder_at && new Date(t.reminder_at) <= new Date(now)) {
          due.push({ id: t.id, kind: 'task', title: t.title, reminder_at: t.reminder_at });
        }
      });
      (billsRes.data as Bill[])?.forEach((b) => {
        if (b.reminder_at && new Date(b.reminder_at) <= new Date(now)) {
          due.push({ id: b.id, kind: 'bill', title: b.name, reminder_at: b.reminder_at });
        }
      });
      (apptsRes.data as Appointment[])?.forEach((a) => {
        if (a.reminder_at && new Date(a.reminder_at) <= new Date(now)) {
          due.push({ id: a.id, kind: 'appointment', title: a.title, reminder_at: a.reminder_at });
        }
      });

      for (const item of due) {
        let message = '';
        let type: 'task' | 'bill' | 'appointment' = 'task';
        if (item.kind === 'task') {
          message = `Your task "${item.title}" is due soon. Don't forget to complete it!`;
          type = 'task';
        } else if (item.kind === 'bill') {
          message = `Your bill "${item.title}" is due soon. Please pay it before the deadline.`;
          type = 'bill';
        } else {
          message = `You have an appointment: "${item.title}" coming up. Be ready on time!`;
          type = 'appointment';
        }

        await fireReminder(user.id, `Reminder: ${item.title}`, message, type, channels);

        // Mark reminder as sent so it doesn't fire again
        const table = item.kind === 'task' ? 'tasks' : item.kind === 'bill' ? 'bills' : 'appointments';
        await supabase.from(table).update({ reminder_sent: true }).eq('id', item.id);
      }
    };

    // Check immediately on mount, then every 30 seconds
    checkReminders();
    timerRef.current = setInterval(checkReminders, CHECK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, profile]);

  return null;
}
