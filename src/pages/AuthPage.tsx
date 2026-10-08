import { useState } from 'react';
import { Bot, Mail, Lock, User as UserIcon, Sparkles, Calendar, CheckSquare, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Feedback';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'register' && !fullName.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }
    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, fullName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      toast(mode === 'login' ? 'Welcome back!' : 'Account created!', 'success');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-20 h-80 w-80 rounded-full bg-accent-300 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AutoLife AI</h1>
            <p className="text-sm text-white/70">Autonomous Life Admin</p>
          </div>
        </div>
        <div className="relative z-10 text-white space-y-6">
          <h2 className="text-4xl font-bold leading-tight">Your AI agent for a more organized, opportunity-rich life.</h2>
          <p className="text-lg text-white/80">Manage tasks, bills, appointments, and discover opportunities — all in one beautifully designed workspace.</p>
          <div className="space-y-3 pt-4">
            {[
              { icon: CheckSquare, text: 'AI-prioritized task management' },
              { icon: Calendar, text: 'Smart daily schedules & reminders' },
              { icon: Compass, text: 'Personalized job & internship discovery' },
              { icon: Sparkles, text: 'AI assistant that learns your patterns' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/50">© 2026 AutoLife AI. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-950">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">AutoLife AI</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
            {mode === 'login' ? 'Sign in to continue to your dashboard' : 'Start managing your life with AI'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="pl-9"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                minLength={6}
                required
              />
            </div>
            {error && (
              <div className="px-3 py-2 rounded-lg bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 text-sm">
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
