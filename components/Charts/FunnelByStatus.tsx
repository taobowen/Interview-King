'use client';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { ApplicationDoc } from '../../lib/types';
const PALETTE = ['#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#f43f5e', '#f472b6', '#f97316', '#22c55e', '#06b6d4'];

export default function FunnelByStatus({ apps }: { apps: ApplicationDoc[] }) {
	type PieData = { name: string; value: number };

	const data: PieData[] = Object.values(
		apps.reduce<Record<string, PieData>>((acc, a) => {
			acc[a.status] = acc[a.status] || { name: a.status, value: 0 };
			acc[a.status].value++;
			return acc;
		}, {})
	);

	if (data.length === 0) {
		return (
			<div style={{ height: '16rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<span className="text-slate-500">No data available</span>
			</div>
		);
	}

	return (
		<div style={{ width: '100%', height: '16rem', minHeight: '16rem' }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie data={data} dataKey="value" nameKey="name" outerRadius={100}>
						{data.map((d: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
					</Pie>
					<Tooltip />
					<Legend />
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}