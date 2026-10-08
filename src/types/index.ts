export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type BillStatus = 'pending' | 'paid' | 'overdue';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type OpportunityType = 'internship' | 'job' | 'hackathon' | 'course';
export type PaymentMethod = 'upi' | 'card' | 'netbanking';
export type NotificationType =
  | 'info'
  | 'reminder'
  | 'opportunity'
  | 'bill'
  | 'task'
  | 'appointment'
  | 'system';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  career_interests: string[];
  phone: string;
  location: string;
  whatsapp_number: string;
  email_notifications: boolean;
  browser_notifications: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  category: string;
  reminder_at: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  status: BillStatus;
  category: string;
  consumer_id: string;
  payee: string;
  recurring: boolean;
  reminder_at: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_cycle: 'weekly' | 'monthly' | 'yearly';
  next_billing_date: string;
  status: 'active' | 'cancelled' | 'paused';
  category: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: AppointmentStatus;
  reminder_at: string | null;
  reminder_sent: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  name: string;
  type: string;
  content: string;
  size_bytes: number;
  tags: string[];
  file_url: string;
  file_path: string;
  mime_type: string;
  is_file: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  color: string;
  location: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface Opportunity {
  id: string;
  user_id: string;
  title: string;
  type: OpportunityType;
  provider: string;
  deadline: string | null;
  url: string;
  description: string;
  match_score: number;
  location: string;
  tags: string[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  bill_id: string | null;
  amount: number;
  method: PaymentMethod;
  transaction_id: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}
