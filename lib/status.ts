import type { Status } from './types';


export const STATUSES: Status[] = ['Saved','Applied','OA','Screen','Tech','Onsite','Offer','Accepted','No response','Rejected','Closed'];
export const STATUS_ORDER: Record<Status, number> = {
Saved:0, Applied:1, OA:2, Screen:3, Tech:4, Onsite:5, Offer:6, Accepted:7, 'No response':8, Rejected:99, Closed:100
};
export const statusColor = (s: Status) => ({
    Saved:'bg-slate-100 text-slate-800',
    Applied:'bg-blue-100 text-blue-800',
    OA:'bg-indigo-100 text-indigo-800',
    Screen:'bg-amber-100 text-amber-800',
    Tech:'bg-purple-100 text-purple-800',
    Onsite:'bg-teal-100 text-teal-800',
    Offer:'bg-green-100 text-green-800',
    Accepted:'bg-emerald-100 text-emerald-800',
    'No response':'bg-orange-100 text-orange-800',
    Rejected:'bg-rose-100 text-rose-800',
    Closed:'bg-gray-100 text-gray-800',
}[s]);

export const INTERVIEW_STAGES: Status[] = ['Screen','Tech','Onsite'];

export const STAGES: Status[] = [
  'Applied','OA','Screen','Tech','Onsite','Offer','Accepted','No response','Rejected','Closed'  
];

export const STATUS_HEX = {
  Saved:'#cbd5e1', Applied:'#60a5fa', OA:'#818cf8', Screen:'#f59e0b',
  Tech:'#a78bfa', Onsite:'#14b8a6', Offer:'#22c55e', Accepted:'#10b981', 'No response':'#f97316', Rejected:'#f43f5e', Closed:'#6b7280',
} as const;

