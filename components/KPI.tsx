'use client';
import { useMemo } from 'react';
import type { ApplicationDoc, StatusEvent, Status } from '@/lib/types';
import { INTERVIEW_STAGES } from '@/lib/status';
import { tsToDate } from '@/lib/utils';

function reachedInterview(app: ApplicationDoc, eventsByApp: Record<string, StatusEvent[]>) {
  // 1) If current status is interview stage
  if (INTERVIEW_STAGES.includes(app.status as Status)) return true;

  // 2) If we recorded where it was refused and that stage is interview
  if (app.refusedAt && INTERVIEW_STAGES.includes(app.refusedAt as Status)) return true;

  // 3) If any historical event reached an interview stage
  const evs = eventsByApp[app.id || ''] || [];
  return evs.some(e => INTERVIEW_STAGES.includes(e.toStatus as Status));
}

export default function KPIs({ apps, events }:{ apps:ApplicationDoc[]; events:StatusEvent[] }) {
  const now = new Date();
  const cutoff = new Date(now); cutoff.setDate(now.getDate()-30);

  const eventsByApp = useMemo(() => {
    const m: Record<string, StatusEvent[]> = {};
    events.forEach(e => { (m[e.applicationId] ||= []).push(e); });
    return m;
  }, [events]);

  const total = apps.length;
  const total30 = apps.filter(a => tsToDate(a.createdAt) >= cutoff).length;

  const interviewed = apps.filter(a => reachedInterview(a, eventsByApp)).length;
  const interviewed30 = apps
    .filter(a => tsToDate(a.createdAt) >= cutoff)
    .filter(a => reachedInterview(a, eventsByApp)).length;

  const rate = total ? ((interviewed/total)*100).toFixed(1) : 0;
  const rate30 = total30 ? ((interviewed30/total30)*100).toFixed(1) : 0;

  const Card = ({label, value, suffix=''}:{label:string; value:number|string; suffix?:string}) => (
    <div className="rounded border bg-white p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}{suffix}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Apps (overall)" value={total} />
      <Card label="Apps (last 30d)" value={total30} />
      <Card label="App→Interview rate (overall)" value={rate} suffix="%" />
      <Card label="App→Interview rate (last 30d)" value={rate30} suffix="%" />
    </div>
  );
}
