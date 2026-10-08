import { useEffect, useState } from 'react';
import { Compass, Plus, Trash2, ExternalLink, MapPin, Calendar, TrendingUp, Briefcase, GraduationCap, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog, EmptyState, toast } from '@/components/ui/Feedback';
import { recommendOpportunities } from '@/lib/ai';
import { createNotification } from '@/lib/notifications';
import type { Opportunity, OpportunityType } from '@/types';

const typeConfig: Record<OpportunityType, { icon: typeof Briefcase; variant: 'primary' | 'accent' | 'warning' | 'success'; label: string }> = {
  internship: { icon: GraduationCap, variant: 'accent', label: 'Internship' },
  job: { icon: Briefcase, variant: 'primary', label: 'Job' },
  hackathon: { icon: Trophy, variant: 'warning', label: 'Hackathon' },
  course: { icon: GraduationCap, variant: 'success', label: 'Course' },
};

const typeOptions = [
  { value: 'internship', label: 'Internship' },
  { value: 'job', label: 'Job' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'course', label: 'Course' },
];

export function Opportunities() {
  const { user, profile } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({ title: '', type: 'job' as OpportunityType, provider: '', deadline: '', url: '', description: '', match_score: 80, location: '', tags: '' });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('opportunities').select('*').eq('user_id', user.id).order('match_score', { ascending: false });
    setOpps((data as Opportunity[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const seedRecommendations = async () => {
    if (!user) return;
    const recs = recommendOpportunities(profile);
    const rows = recs.map((r) => ({ ...r, user_id: user.id }));
    const { data, error } = await supabase.from('opportunities').insert(rows).select();
    if (error) { toast('Failed to add recommendations', 'error'); return; }
    setOpps((prev) => [...(data as Opportunity[]), ...prev].sort((a, b) => b.match_score - a.match_score));
    await createNotification(user.id, 'New opportunities found', `${recs.length} personalized opportunities were added based on your profile.`, 'opportunity');
    toast(`${recs.length} opportunities recommended by AI`);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title.trim()) return;
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { data, error } = await supabase.from('opportunities').insert({
      user_id: user.id, title: form.title, type: form.type, provider: form.provider,
      deadline: form.deadline || null, url: form.url, description: form.description,
      match_score: form.match_score, location: form.location, tags,
    }).select().single();
    if (error) { toast('Failed to add opportunity', 'error'); return; }
    setOpps((prev) => [...prev, data as Opportunity].sort((a, b) => b.match_score - a.match_score));
    setForm({ title: '', type: 'job', provider: '', deadline: '', url: '', description: '', match_score: 80, location: '', tags: '' });
    setShowAdd(false);
    toast('Opportunity added');
  };

  const remove = async () => {
    if (!deleteId) return;
    await supabase.from('opportunities').delete().eq('id', deleteId);
    setOpps((prev) => prev.filter((o) => o.id !== deleteId));
    setDeleteId(null);
    toast('Opportunity removed');
  };

  const filtered = filter === 'all' ? opps : opps.filter((o) => o.type === filter);
  const counts = { all: opps.length, internship: opps.filter((o) => o.type === 'internship').length, job: opps.filter((o) => o.type === 'job').length, hackathon: opps.filter((o) => o.type === 'hackathon').length, course: opps.filter((o) => o.type === 'course').length };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Opportunity Discovery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-recommended internships, jobs, hackathons & courses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={seedRecommendations}><Sparkles className="h-4 w-4" /> Get AI Recommendations</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </div>

      {/* AI banner */}
      <Card className="p-4 bg-gradient-to-r from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 border-accent-100 dark:border-accent-900/40">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center shrink-0"><Compass className="h-5 w-5 text-accent-600 dark:text-accent-400" /></div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">AI-Powered Discovery</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">Click "Get AI Recommendations" to discover opportunities matched to your profile interests: {profile?.career_interests?.length ? profile.career_interests.join(', ') : 'add interests in your profile for better matches'}.</p>
          </div>
        </div>
      </Card>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[{ v: 'all', l: `All (${counts.all})` }, { v: 'internship', l: `Internships (${counts.internship})` }, { v: 'job', l: `Jobs (${counts.job})` }, { v: 'hackathon', l: `Hackathons (${counts.hackathon})` }, { v: 'course', l: `Courses (${counts.course})` }].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.v ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Compass className="h-7 w-7" />} title="No opportunities yet" description="Get AI recommendations based on your profile or add your own." action={<Button onClick={seedRecommendations}><Sparkles className="h-4 w-4" /> Get AI Recommendations</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp) => {
            const cfg = typeConfig[opp.type];
            const Icon = cfg.icon;
            return (
              <Card key={opp.id} className="p-4 hover:card-shadow-lg transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cfg.variant === 'primary' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : cfg.variant === 'accent' ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-600' : cfg.variant === 'warning' ? 'bg-warning-50 dark:bg-warning-900/30 text-warning-600' : 'bg-success-50 dark:bg-success-900/30 text-success-600'}`}><Icon className="h-4.5 w-4.5" /></div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-success-600 dark:text-success-400"><TrendingUp className="h-3.5 w-3.5" /> {opp.match_score}%</div>
                </div>
                <div className="flex-1 mt-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{opp.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opp.provider}</p>
                  {opp.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{opp.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {opp.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {opp.location}</span>}
                    {opp.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(opp.deadline).toLocaleDateString()}</span>}
                  </div>
                  {opp.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{opp.tags.map((t) => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t}</span>)}</div>}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {opp.url && <a href={opp.url} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"><ExternalLink className="h-3.5 w-3.5" /> Apply</a>}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(opp.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Opportunity">
        <form onSubmit={add} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Software Engineer Intern" required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OpportunityType })} options={typeOptions} />
            <Input label="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Google" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            <Input label="Match score" type="number" min="0" max="100" value={form.match_score} onChange={(e) => setForm({ ...form, match_score: parseInt(e.target.value) || 0 })} />
          </div>
          <Input label="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Remote / City" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="react, python, ai" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Add Opportunity</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Remove opportunity?" message="This opportunity will be removed from your list." onConfirm={remove} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
