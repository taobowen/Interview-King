import type { Status } from './types';


export const STATUSES: Status[] = ['Saved','Applied','OA','Screen','Tech','Onsite','Offer','Accepted','Rejected'];
export const STATUS_ORDER: Record<Status, number> = {
Saved:0, Applied:1, OA:2, Screen:3, Tech:4, Onsite:5, Offer:6, Accepted:7, Rejected:99
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
    Rejected:'bg-rose-100 text-rose-800'
}[s]);

export const REJECT_REASONS = ['Competition', 'Failed OA', 'Failed interview', 'Not a fit', 'Compensation', 'Other'];