'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ApplicationDoc } from '../../lib/types';
import { tsToDate, isoWeekKey } from '../../lib/utils';


export default function AppsPerWeek({ apps }: { apps: ApplicationDoc[] }) {
    const byWeek = Object.values(apps.reduce((acc: any, a) => {
        const d = tsToDate(a.createdAt);
        const wk = isoWeekKey(d);
        acc[wk] = acc[wk] || { week: wk, count: 0 };
        acc[wk].count++;
        return acc;
    }, {})).sort((a: any, b: any) => a.week.localeCompare(b.week));


    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byWeek as any}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}