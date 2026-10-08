import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { TaskManager } from '@/pages/TaskManager';
import { BillsAndSubscriptions } from '@/pages/BillsAndSubscriptions';
import { Appointments } from '@/pages/Appointments';
import { Documents } from '@/pages/Documents';
import { Calendar } from '@/pages/Calendar';
import { AIChat } from '@/pages/AIChat';
import { Notifications } from '@/pages/Notifications';
import { Opportunities } from '@/pages/Opportunities';
import { Analytics } from '@/pages/Analytics';
import { ProfilePage } from '@/pages/ProfilePage';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ToastContainer } from '@/components/ui/Feedback';
import { ReminderScheduler } from '@/components/ReminderScheduler';
import { useRoute, navigate, type Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { NotificationItem } from '@/types';

function AppContent() {
  const { user, loading } = useAuth();
  const route = useRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    (async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false);
      setUnreadCount((data as NotificationItem[])?.length ?? 0);
    })();
  }, [user, route]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 animate-pulse" />
          <p className="text-sm text-gray-500">Loading AutoLife AI...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const pages: Record<Route, React.ReactNode> = {
    dashboard: <Dashboard />,
    tasks: <TaskManager />,
    bills: <BillsAndSubscriptions />,
    appointments: <Appointments />,
    documents: <Documents />,
    calendar: <Calendar />,
    'ai-chat': <AIChat />,
    notifications: <Notifications />,
    opportunities: <Opportunities />,
    analytics: <Analytics />,
    profile: <ProfilePage />,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar current={route} unreadCount={unreadCount} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} unreadCount={unreadCount} onBellClick={() => navigate('notifications')} />
        <main className="flex-1 overflow-y-auto">{pages[route]}</main>
      </div>
      <ToastContainer />
      <ReminderScheduler />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
