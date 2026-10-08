import {
  LayoutDashboard, CheckSquare, CreditCard, CalendarClock, FileText,
  Calendar, Sparkles, Bell, Compass, BarChart3, User, Bot,
} from 'lucide-react';
import type { Route } from '@/lib/router';
import { navigate } from '@/lib/router';

interface NavItem {
  route: Route;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'tasks', label: 'Task Manager', icon: CheckSquare },
  { route: 'bills', label: 'Bills & Subscriptions', icon: CreditCard },
  { route: 'appointments', label: 'Appointments', icon: CalendarClock },
  { route: 'documents', label: 'Documents', icon: FileText },
  { route: 'calendar', label: 'Calendar', icon: Calendar },
  { route: 'ai-chat', label: 'AI Assistant', icon: Sparkles },
  { route: 'opportunities', label: 'Opportunities', icon: Compass },
  { route: 'analytics', label: 'Analytics', icon: BarChart3 },
  { route: 'notifications', label: 'Notifications', icon: Bell },
  { route: 'profile', label: 'Profile', icon: User },
];

interface SidebarProps {
  current: Route;
  unreadCount: number;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ current, unreadCount, open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white leading-tight">AutoLife AI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Life Admin Agent</p>
          </div>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.route;
            return (
              <button
                key={item.route}
                onClick={() => { navigate(item.route); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.route === 'notifications' && unreadCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-error-500 text-white text-xs flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
