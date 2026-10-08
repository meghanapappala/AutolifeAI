import type { Task, Bill, Appointment, Opportunity, Profile } from '@/types';

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export interface PrioritizedTask extends Task {
  score: number;
  reason: string;
}

export function prioritizeTasks(tasks: Task[]): PrioritizedTask[] {
  const active = tasks.filter((t) => t.status !== 'completed');
  const scored = active.map((t) => {
    const days = daysUntil(t.due_date);
    let score = PRIORITY_WEIGHT[t.priority] * 10;
    let reason = `${t.priority} priority`;
    if (days !== null) {
      if (days < 0) {
        score += 50;
        reason = `Overdue by ${Math.abs(days)} day(s)`;
      } else if (days === 0) {
        score += 30;
        reason = 'Due today';
      } else if (days <= 2) {
        score += 20;
        reason = `Due in ${days} day(s)`;
      } else if (days <= 7) {
        score += 10;
        reason = `Due in ${days} days`;
      } else {
        score += Math.max(0, 5 - Math.floor(days / 7));
        reason = `Due in ${days} days`;
      }
    }
    return { ...t, score, reason };
  });
  return scored.sort((a, b) => b.score - a.score);
}

export interface ScheduleBlock {
  time: string;
  label: string;
  type: 'task' | 'appointment' | 'break' | 'bill';
  detail?: string;
}

export function generateDailySchedule(
  tasks: Task[],
  appointments: Appointment[],
  bills: Bill[]
): ScheduleBlock[] {
  const schedule: ScheduleBlock[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter((a) => a.date === today && a.status === 'scheduled');
  const topTasks = prioritizeTasks(tasks).slice(0, 4);
  const pendingBills = bills.filter((b) => b.status === 'pending' && daysUntil(b.due_date) !== null && (daysUntil(b.due_date) as number) <= 3);

  let hour = 9;
  const slot = () => {
    const h = hour % 24;
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
  };

  if (pendingBills.length > 0) {
    schedule.push({ time: slot(), label: `Pay ${pendingBills[0].name}`, type: 'bill', detail: `₹${pendingBills[0].amount} due soon` });
    hour += 1;
  }
  if (todayAppts.length > 0) {
    const a = todayAppts[0];
    schedule.push({ time: slot(), label: a.title, type: 'appointment', detail: a.location || 'Appointment' });
    hour += 1;
  }
  topTasks.forEach((t, i) => {
    schedule.push({ time: slot(), label: t.title, type: 'task', detail: t.reason });
    hour += 1;
    if (i === 1) {
      schedule.push({ time: slot(), label: 'Break', type: 'break', detail: 'Rest & recharge' });
      hour += 1;
    }
  });
  if (schedule.length === 0) {
    schedule.push({ time: slot(), label: 'No urgent items today', type: 'break', detail: 'Enjoy a relaxed day!' });
  }
  return schedule.slice(0, 8);
}

export interface ProductivityInsight {
  label: string;
  value: string;
  detail: string;
}

export function analyzeProductivity(tasks: Task[]): ProductivityInsight[] {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter((t) => t.status !== 'completed' && daysUntil(t.due_date) !== null && (daysUntil(t.due_date) as number) < 0).length;
  const highPriority = tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;

  return [
    { label: 'Completion Rate', value: `${completionRate}%`, detail: `${completed} of ${total} tasks done` },
    { label: 'Overdue Tasks', value: `${overdue}`, detail: overdue === 0 ? 'All on track' : 'Needs attention' },
    { label: 'High Priority', value: `${highPriority}`, detail: 'Urgent or high priority items' },
    {
      label: 'Momentum',
      value: completionRate >= 70 ? 'Strong' : completionRate >= 40 ? 'Steady' : 'Building',
      detail: completionRate >= 70 ? 'Great progress!' : 'Keep going',
    },
  ];
}

const OPPORTUNITY_BANK: Omit<Opportunity, 'id' | 'user_id' | 'created_at'>[] = [
  { title: 'Frontend Engineer Intern', type: 'internship', provider: 'Google', deadline: null, url: 'https://careers.google.com', description: 'Build delightful UIs for billions of users. React/TypeScript stack.', match_score: 92, location: 'Remote', tags: ['react', 'typescript', 'frontend'] },
  { title: 'Full-Stack Developer', type: 'job', provider: 'Stripe', deadline: null, url: 'https://stripe.com/jobs', description: 'Join the payments platform team. Node, Go, and React.', match_score: 88, location: 'San Francisco', tags: ['node', 'react', 'payments'] },
  { title: 'AI Hackathon 2026', type: 'hackathon', provider: 'Devpost', deadline: null, url: 'https://devpost.com', description: '48-hour build with LLMs. $50k in prizes.', match_score: 95, location: 'Online', tags: ['ai', 'llm', 'hackathon'] },
  { title: 'Advanced React & Systems Design', type: 'course', provider: 'Frontend Masters', deadline: null, url: 'https://frontendmasters.com', description: 'Deep dive into React internals and scalable architecture.', match_score: 84, location: 'Online', tags: ['react', 'architecture', 'course'] },
  { title: 'Backend Engineer Intern', type: 'internship', provider: 'Vercel', deadline: null, url: 'https://vercel.com/careers', description: 'Work on edge functions and the Next.js platform.', match_score: 86, location: 'Remote', tags: ['node', 'edge', 'backend'] },
  { title: 'Product Designer', type: 'job', provider: 'Figma', deadline: null, url: 'https://figma.com/careers', description: 'Design tools used by millions of designers worldwide.', match_score: 79, location: 'Remote', tags: ['design', 'ui', 'product'] },
  { title: 'Web3 Buildathon', type: 'hackathon', provider: 'ETHGlobal', deadline: null, url: 'https://ethglobal.com', description: 'Build decentralized apps. Mentorship from top protocols.', match_score: 81, location: 'Hybrid', tags: ['web3', 'blockchain', 'hackathon'] },
  { title: 'Machine Learning Specialization', type: 'course', provider: 'Coursera', deadline: null, url: 'https://coursera.org', description: 'Stanford ML course by Andrew Ng. From basics to deep learning.', match_score: 90, location: 'Online', tags: ['ml', 'python', 'course'] },
  { title: 'Data Scientist', type: 'job', provider: 'Netflix', deadline: null, url: 'https://jobs.netflix.com', description: 'Build recommendation systems for 200M+ subscribers.', match_score: 83, location: 'Los Gatos', tags: ['python', 'data', 'ml'] },
  { title: 'Open Source Contributor Program', type: 'internship', provider: 'Mozilla', deadline: null, url: 'https://mozilla.org', description: 'Contribute to Firefox and get mentored by core engineers.', match_score: 77, location: 'Remote', tags: ['opensource', 'rust', 'cpp'] },
];

export function recommendOpportunities(profile: Profile | null): Omit<Opportunity, 'id' | 'user_id' | 'created_at'>[] {
  const interests = profile?.career_interests ?? [];
  if (interests.length === 0) return OPPORTUNITY_BANK.slice(0, 6);
  const scored = OPPORTUNITY_BANK.map((o) => {
    const overlap = o.tags.filter((t) => interests.some((i) => i.toLowerCase().includes(t) || t.includes(i.toLowerCase()))).length;
    return { ...o, match_score: Math.min(99, o.match_score + overlap * 3) };
  });
  return scored.sort((a, b) => b.match_score - a.match_score).slice(0, 6);
}

interface AIResponse {
  text: string;
  actions?: { label: string; type: string }[];
}

export function generateAIResponse(
  input: string,
  context: { tasks: Task[]; bills: Bill[]; appointments: Appointment[]; profile: Profile | null }
): AIResponse {
  const lower = input.toLowerCase();
  const topTasks = prioritizeTasks(context.tasks).slice(0, 3);
  const pendingBills = context.bills.filter((b) => b.status === 'pending');
  const upcomingAppts = context.appointments.filter((a) => a.status === 'scheduled');

  if (lower.includes('priorit') || lower.includes('task') || lower.includes('focus')) {
    if (topTasks.length === 0) return { text: "You have no active tasks right now. Want to add one? I can help you break it down." };
    const list = topTasks.map((t, i) => `${i + 1}. ${t.title} — ${t.reason}`).join('\n');
    return { text: `Here's what I'd focus on first:\n\n${list}\n\nStart with #1 — it has the highest impact based on priority and deadline.`, actions: [{ label: 'Open Task Manager', type: 'tasks' }] };
  }
  if (lower.includes('bill') || lower.includes('pay')) {
    if (pendingBills.length === 0) return { text: "All your bills are paid up. Nothing due right now — nice work staying on top of it!" };
    const next = pendingBills.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    return { text: `You have ${pendingBills.length} pending bill(s). The most urgent is **${next.name}** for ₹${next.amount}, due ${next.due_date}. I'd pay that first.`, actions: [{ label: 'Pay Now', type: 'bills' }] };
  }
  if (lower.includes('appointment') || lower.includes('meeting') || lower.includes('schedule')) {
    if (upcomingAppts.length === 0) return { text: "No upcoming appointments scheduled. Would you like to add one?" };
    const list = upcomingAppts.map((a) => `${a.date} at ${a.time} — ${a.title}`).join('\n');
    return { text: `Here are your upcoming appointments:\n\n${list}` };
  }
  if (lower.includes('opportunity') || lower.includes('job') || lower.includes('intern') || lower.includes('career')) {
    const recs = recommendOpportunities(context.profile).slice(0, 3);
    const list = recs.map((o) => `• ${o.title} at ${o.provider} (${o.match_score}% match)`).join('\n');
    return { text: `Based on your profile, here are some opportunities worth exploring:\n\n${list}`, actions: [{ label: 'See All Opportunities', type: 'opportunities' }] };
  }
  if (lower.includes('schedule') || lower.includes('today') || lower.includes('plan')) {
    const schedule = generateDailySchedule(context.tasks, context.appointments, context.bills);
    const list = schedule.map((s) => `${s.time} — ${s.label}`).join('\n');
    return { text: `Here's your suggested plan for today:\n\n${list}` };
  }
  if (lower.includes('productiv') || lower.includes('progress') || lower.includes('how am i')) {
    const insights = analyzeProductivity(context.tasks);
    const list = insights.map((i) => `${i.label}: ${i.value} (${i.detail})`).join('\n');
    return { text: `Here's your productivity snapshot:\n\n${list}` };
  }
  return {
    text: `I'm your AutoLife AI assistant. I can help you prioritize tasks, manage bills, plan your day, find opportunities, and track your productivity.\n\nTry asking me:\n• "What should I focus on today?"\n• "What bills are due?"\n• "Show me job opportunities"\n• "Plan my day"`,
  };
}
