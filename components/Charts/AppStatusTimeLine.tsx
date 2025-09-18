'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import { tsToDate } from '@/lib/utils';

type Props = { app: ApplicationDoc; events: StatusEvent[] };

function buildSeries(app: ApplicationDoc, events: StatusEvent[]) {
  const sorted = [...events].sort((a, b) => tsToDate(a.at).getTime() - tsToDate(b.at).getTime());
  const first = sorted[0];
  const initialStatus = (first?.from as any) || app.status || 'Saved';

  const data = [
    {
      t: tsToDate(app.createdAt).getTime(),
      date: tsToDate(app.createdAt).toISOString().slice(0, 10),
      status: initialStatus,
      label: 'Created',
    },
    ...sorted.map((ev) => ({
      t: tsToDate(ev.at).getTime(),
      date: tsToDate(ev.at).toISOString().slice(0, 10),
      status: ev.to,
      label: `${ev.from ? `${ev.from} → ` : ''}${ev.to}`,
    })),
  ];

  // Deduplicate if multiple points share the same timestamp/status
  return data.filter((p, i, arr) => i === 0 || p.t !== arr[i - 1].t || p.status !== arr[i - 1].status);
}

export default function AppStatusTimeline({ app, events }: Props) {
  const series = buildSeries(app, events);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" />
          {/* time-based X axis (ms since epoch) */}
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={(t) => new Date(t).toLocaleDateString()}
          />
          {/* categorical Y axis by status */}
          <YAxis type="category" dataKey="status" allowDuplicatedCategory={false} />
          <Tooltip
            formatter={(_, __, item: any) => [item.payload.status, `Date: ${item.payload.date}`]}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
          />
          {/* a single linked line through the status history */}
          <Line type="monotone" dataKey="status" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
