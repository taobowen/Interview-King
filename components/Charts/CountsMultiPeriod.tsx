'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ApplicationDoc } from '@/lib/types';
import { tsToDate } from '@/lib/utils';

function rangeDays(n: number) { const a: Date[] = []; const now = new Date(); for (let i = n - 1; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); a.push(d); } return a; }
function rangeMonths(n: number) { const a: Date[] = []; const now = new Date(); for (let i = n - 1; i >= 0; i--) { a.push(new Date(now.getFullYear(), now.getMonth() - i, 1)); } return a; }
function weekKey(d: Date) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - dn); const ys = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); const w = Math.ceil((((x.getTime() - ys.getTime()) / 864e5) + 1) / 7); return `${x.getUTCFullYear()}-W${String(w).padStart(2, '0')}`; }

export default function CountsMultiPeriod({ apps }: { apps: ApplicationDoc[] }) {
  const byDay = rangeDays(30).map(d => {
    const k = d.toISOString().slice(0, 10);
    const count = apps.filter(a => tsToDate(a.createdAt).toISOString().slice(0, 10) === k).length;
    return { label: k.slice(5), count };
  });
  const weekMap: Record<string, number> = {};
  apps.forEach(a => { const k = weekKey(tsToDate(a.createdAt)); weekMap[k] = (weekMap[k] || 0) + 1; });
  const weeks = Object.keys(weekMap).sort().slice(-12).map(k => ({ label: k, count: weekMap[k] }));
  const months = rangeMonths(12).map(d => {
    const y = d.getFullYear(), m = d.getMonth();
    const count = apps.filter(a => { const ad = tsToDate(a.createdAt); return ad.getFullYear() === y && ad.getMonth() === m; }).length;
    return { label: `${y}-${String(m + 1).padStart(2, '0')}`, count };
  });
  const Card = ({ title, data, color }: { title: string; data: any[]; color: string }) => (
    <div className="rounded border bg-white p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card title="Daily (last 30)" data={byDay} color="#60a5fa" />
      <Card title="Weekly (last 12)" data={weeks} color="#34d399" />
      <Card title="Monthly (last 12)" data={months} color="#f59e0b" />
    </div>
  );
}
