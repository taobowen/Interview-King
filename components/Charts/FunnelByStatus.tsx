'use client';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ApplicationDoc } from '../../lib/types';


export default function FunnelByStatus({ apps }: { apps: ApplicationDoc[] }) {
type PieData = { name: string; value: number };

const data: PieData[] = Object.values(
  apps.reduce<Record<string, PieData>>((acc, a) => {
	acc[a.status] = acc[a.status] || { name: a.status, value: 0 };
	acc[a.status].value++;
	return acc;
  }, {})
);


return (
<div className="h-64">
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie data={data} dataKey="value" nameKey="name" outerRadius={100} />
<Tooltip />
<Legend />
</PieChart>
</ResponsiveContainer>
</div>
);
}