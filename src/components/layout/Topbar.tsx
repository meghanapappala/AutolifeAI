import { Menu, Sun, Moon, Bell, Search } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';

interface TopbarProps {
  onMenuClick: () => void;
  unreadCount: number;
  onBellClick: () => void;
}

export function Topbar({ onMenuClick, unreadCount, onBellClick }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-gray-200 dark:border-gray-800">
      <div className="h-full flex items-center justify-between px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={onBellClick}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate('profile')}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{profile?.full_name || 'User'}</p>
              <button onClick={() => signOut()} className="text-xs text-gray-500 hover:text-error-600 dark:hover:text-error-400">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
