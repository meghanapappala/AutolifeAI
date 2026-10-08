import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, User as UserIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Feedback';
import { generateAIResponse } from '@/lib/ai';
import { navigate } from '@/lib/router';
import type { Task, Bill, Appointment, ChatMessage } from '@/types';

const SUGGESTIONS = [
  'What should I focus on today?',
  'What bills are due?',
  'Show me job opportunities',
  'Plan my day',
  'How is my productivity?',
];

export function AIChat() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [context, setContext] = useState<{ tasks: Task[]; bills: Bill[]; appointments: Appointment[] }>({ tasks: [], bills: [], appointments: [] });
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const [c, t, b, a] = await Promise.all([
      supabase.from('ai_chats').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('bills').select('*').eq('user_id', user.id),
      supabase.from('appointments').select('*').eq('user_id', user.id),
    ]);
    setMessages((c.data as ChatMessage[]) ?? []);
    setContext({ tasks: (t.data as Task[]) ?? [], bills: (b.data as Bill[]) ?? [], appointments: (a.data as Appointment[]) ?? [] });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!user || !text.trim()) return;
    setInput('');
    const userMsg: ChatMessage = { id: 'temp-u', user_id: user.id, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);
    await supabase.from('ai_chats').insert({ user_id: user.id, role: 'user', content: text });

    await new Promise((r) => setTimeout(r, 700));
    const response = generateAIResponse(text, { ...context, profile });
    setThinking(false);

    const assistantMsg: ChatMessage = { id: 'temp-a', user_id: user.id, role: 'assistant', content: response.text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, assistantMsg]);
    await supabase.from('ai_chats').insert({ user_id: user.id, role: 'assistant', content: response.text });
  };

  const clearChat = async () => {
    if (!user) return;
    await supabase.from('ai_chats').delete().eq('user_id', user.id);
    setMessages([]);
    toast('Chat cleared');
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Knows your tasks, bills & appointments</p>
          </div>
        </div>
        {messages.length > 0 && <Button variant="ghost" size="sm" onClick={clearChat}><Trash2 className="h-4 w-4" /> Clear</Button>}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="h-14 w-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <Bot className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">How can I help you today?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">I can prioritize your tasks, manage bills, plan your schedule, and find opportunities.</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gradient-to-br from-primary-500 to-accent-500'}`}>
                  {msg.role === 'user' ? <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {thinking && (
            <div className="flex gap-3 animate-fade-in">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 h-11 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
