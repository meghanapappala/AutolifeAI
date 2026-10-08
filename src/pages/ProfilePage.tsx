import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Save, Plus, X, Sparkles, MessageCircle, Bell, Monitor } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Feedback';
import type { Profile } from '@/types';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<Profile | null>(profile);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(profile); }, [profile]);

  const save = async () => {
    if (!user || !form) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      bio: form.bio,
      phone: form.phone,
      location: form.location,
      career_interests: form.career_interests,
      avatar_url: form.avatar_url,
      whatsapp_number: form.whatsapp_number,
      email_notifications: form.email_notifications,
      browser_notifications: form.browser_notifications,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast('Failed to save profile', 'error'); return; }
    await refreshProfile();
    toast('Profile saved');
  };

  const addInterest = () => {
    if (!form || !newInterest.trim()) return;
    setForm({ ...form, career_interests: [...form.career_interests, newInterest.trim()] });
    setNewInterest('');
  };

  const removeInterest = (i: number) => {
    if (!form) return;
    setForm({ ...form, career_interests: form.career_interests.filter((_, idx) => idx !== i) });
  };

  if (!form) return <div className="p-6">Loading...</div>;

  const initials = (form.full_name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const email = user?.email ?? '';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal info and career interests</p>
      </div>

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{form.full_name || 'Your Name'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1"><Mail className="h-3.5 w-3.5" /> {email}</p>
            {form.location && <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5"><MapPin className="h-3.5 w-3.5" /> {form.location}</p>}
          </div>
          <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save</Button>
        </div>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader title="Personal Information" icon={<User className="h-5 w-5" />} />
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
              <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="pl-9" placeholder="Your name" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="pl-9" placeholder="+1 555 000 0000" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
              <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="pl-9" placeholder="City, Country" />
            </div>
            <Input label="Avatar URL" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
          </div>
          <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
        </div>
      </Card>

      {/* Career interests */}
      <Card>
        <CardHeader title="Career Interests" subtitle="Used by AI to recommend opportunities" icon={<Briefcase className="h-5 w-5" />} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} placeholder="e.g. React, Machine Learning, Product Design" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())} />
            <Button onClick={addInterest} variant="secondary"><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.career_interests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No interests added yet. Add some to get better AI recommendations.</p>
            ) : (
              form.career_interests.map((interest, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium">
                  {interest}
                  <button onClick={() => removeInterest(i)} className="hover:text-primary-900 dark:hover:text-primary-100"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader title="Notification Preferences" subtitle="Where reminders and alerts are sent automatically" icon={<Bell className="h-5 w-5" />} />
        <div className="p-5 space-y-4">
          <div className="relative">
            <MessageCircle className="absolute left-3 top-9 h-4 w-4 text-success-500" />
            <Input label="WhatsApp number (with country code)" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className="pl-9" placeholder="e.g. 919876543210" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Enter your number with country code (no + or spaces). Reminders and notifications will be sent here via WhatsApp.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.email_notifications ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="checkbox" checked={form.email_notifications} onChange={(e) => setForm({ ...form, email_notifications: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Send to {email || 'your email'}</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.browser_notifications ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="checkbox" checked={form.browser_notifications} onChange={(e) => setForm({ ...form, browser_notifications: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
              <Monitor className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Browser popups</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Show popup on screen</p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* AI tip */}
      <Card className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border-primary-100 dark:border-primary-900/40">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" /></div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Tip</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">The more career interests you add, the better your opportunity recommendations will be. Try adding specific skills and roles you're interested in.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
