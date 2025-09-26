'use client';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { ApplicationDoc } from '@/lib/types';

const PALETTE = ['#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#f43f5e', '#f472b6', '#f97316', '#22c55e', '#06b6d4'];

export default function RejectionReasonsPie({ apps }: { apps: ApplicationDoc[] }) {
  type PieData = { name: string; value: number };
  const data: PieData[] = Object.values(
    apps
      .filter(a => a.status === 'Rejected')
      .reduce<Record<string, PieData>>((acc, a) => {
        const k = (a.rejectionReason || 'Unknown').trim() || 'Unknown';
        acc[k] = acc[k] || { name: k, value: 0 };
        acc[k].value++;
        return acc;
      }, {})
  );
  if (!data.length) return <div className="rounded border bg-white p-4"><h3 className="font-semibold">Rejection reasons</h3><p className="text-sm text-slate-600">No data yet.</p></div>;
  return <div className="rounded border bg-white p-4">
    <h3 className="mb-2 font-semibold">Rejection reasons</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={100}>
          {data.map((d: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie><Tooltip /><Legend /></PieChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
