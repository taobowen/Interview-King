'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StatusEvent } from '@/lib/types';

export default function StatusUpdatesTimeline({events}:{events:StatusEvent[]}) {
  const map:Record<string,number>={};
  events.forEach(ev=>{
    const dt = ev.at?.toDate?.() ? ev.at.toDate() : (ev.at?.seconds ? new Date(ev.at.seconds*1000) : new Date());
    const key = dt.toISOString().slice(0,10);
    map[key]=(map[key]||0)+1;
  });
  const data = Object.keys(map).sort().map(k=>({day:k, updates:map[k]}));

  return <div className="rounded border bg-white p-4">
    <h3 className="mb-2 font-semibold">Status updates per day</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day"/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="updates"/></LineChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
