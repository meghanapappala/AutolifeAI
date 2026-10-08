import type { NotificationItem, NotificationType, Profile } from '@/types';
import { supabase } from './supabase';

/**
 * Fetch a user's profile so we know where to send WhatsApp / email / browser
 * notifications. Returns null if the profile doesn't exist yet.
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as Profile) ?? null;
}

/**
 * Create an in-app notification AND automatically route it to the user's
 * enabled channels — browser popup, WhatsApp, and email — using the contact
 * info stored in their profile (whatsapp_number) and auth email.
 *
 * This is the single function every part of the app calls when something
 * happens (task added, bill paid, appointment scheduled, reminder fired, etc.).
 * The routing is automatic: if the user has a WhatsApp number in their profile,
 * WhatsApp opens with the message pre-filled; if they have email notifications
 * enabled, the email client opens; if browser notifications are granted, a
 * popup appears.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  // 1. Always save the in-app notification
  await supabase.from('notifications').insert({ user_id: userId, title, message, type });

  // 2. Fetch profile to know which channels are enabled + contact info
  const profile = await fetchProfile(userId);
  if (!profile) return;

  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? '';

  const browserEnabled = profile.browser_notifications ?? true;
  const emailEnabled = profile.email_notifications ?? true;
  const whatsappNumber = profile.whatsapp_number || undefined;

  const formattedBody = `${message}\n\n— AutoLife AI`;

  // 3. Browser popup notification (immediate, no window open needed)
  if (browserEnabled) {
    showBrowserNotification(title, message);
  }

  // 4. WhatsApp — opens with pre-filled message to the user's number
  if (whatsappNumber) {
    sendWhatsApp(whatsappNumber, `*${title}*\n\n${formattedBody}`);
  }

  // 5. Email — opens email client with pre-filled subject and body
  if (emailEnabled && email) {
    sendEmail(email, title, formattedBody);
  }
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showBrowserNotification(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/vite.svg' });
  }
}

/** Open WhatsApp with a pre-filled message to a specific number (or the user's own number). */
export function sendWhatsApp(number: string | undefined, text: string): void {
  const clean = (number || '').replace(/[^\d]/g, '');
  const base = clean ? `https://wa.me/${clean}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Generic share-to-WhatsApp (no specific recipient, lets user pick in WhatsApp). */
export function shareViaWhatsApp(text: string): void {
  sendWhatsApp(undefined, text);
}

/** Open the user's email client with a pre-filled reminder message. */
export function sendEmail(to: string | undefined, subject: string, body: string): void {
  const recipient = to || '';
  const url = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Generic share-to-email (no specific recipient). */
export function shareViaEmail(subject: string, body: string): void {
  sendEmail(undefined, subject, body);
}

/**
 * Fire a reminder through all enabled channels. Used by ReminderScheduler.
 * Calls createNotification which handles the routing automatically, plus
 * an explicit browser popup for immediacy.
 */
export async function fireReminder(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  channels: { whatsappNumber?: string; email?: string; browserEnabled: boolean }
): Promise<void> {
  // Save in-app notification + auto-route via createNotification
  await createNotification(userId, title, message, type);

  // Explicit browser popup for reminders (immediate visibility)
  if (channels.browserEnabled) {
    showBrowserNotification(title, message);
  }
}

/** Compute a default reminder time: 1 hour before a due date / appointment. */
export function defaultReminderAt(dueDate: string, time?: string): string {
  const base = time ? `${dueDate}T${time}` : dueDate;
  const d = new Date(base);
  d.setHours(d.getHours() - 1);
  return d.toISOString().slice(0, 16);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function unreadCount(notifs: NotificationItem[]): number {
  return notifs.filter((n) => !n.read).length;
}
