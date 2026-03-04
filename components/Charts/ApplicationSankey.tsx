'use client';
import { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import type { ApplicationDoc, StatusEvent, Status } from '@/lib/types';
import { STATUS_HEX, STAGES } from '@/lib/status';
import { tsToDate } from '@/lib/utils';

type Props = {
  apps: ApplicationDoc[];
  events: StatusEvent[];
  recentDays?: number; // optional: createdAt >= now - recentDays
  title: string;
};

const STAGE_SET = new Set<Status>(STAGES);

// Build a compact stage sequence for one app, excluding "Saved" and
// ensuring rejected flows end with refusedAt -> Rejected.
function buildStageSequence(app: ApplicationDoc, evs: StatusEvent[]): Status[] {
  const sorted = [...evs].sort((a, b) => tsToDate(a.createdAt).getTime() - tsToDate(b.createdAt).getTime());

  const isStage = (s?: any): s is Status => !!s && STAGE_SET.has(s as Status);

  // 1) Prefer earliest event.from if it's a pipeline stage
  let seed: Status | undefined = sorted.find(e => isStage(e.fromStatus))?.fromStatus as Status | undefined;

  // 2) Else earliest event.to
  if (!seed) seed = sorted.find(e => isStage(e.toStatus))?.toStatus as Status | undefined;

  // 3) Else explicit refusedAt if present (rejected apps without history)
  if (!seed && isStage(app.refusedAt)) seed = app.refusedAt as Status;

  // 4) Else current status if it's already in pipeline (e.g., direct imports)
  if (!seed && isStage(app.status)) seed = app.status as Status;

  // 5) Final fallback: assume entry at Applied
  if (!seed) seed = 'Applied';

  const seq: Status[] = [seed];

  sorted.forEach(e => { if (isStage(e.toStatus) && seq[seq.length - 1] !== e.toStatus) seq.push(e.toStatus as Status); });

  // If currently Rejected, ensure final hop ends at Rejected from the actual stage
  // Only add rejection logic if events didn't already capture it
  if ((app.status as Status) === 'Rejected' && seq[seq.length - 1] !== 'Rejected') {
    const at = isStage(app.refusedAt) ? (app.refusedAt as Status) : seq[seq.length - 1];

    // Only add the refusal stage if it's different from the current last stage
    if (at && at !== 'Rejected' && seq[seq.length - 1] !== at) {
      seq.push(at);
    }

    // Add 'Rejected' as final stage
    seq.push('Rejected');
  }

  // Deduplicate consecutive stages (this handles any remaining edge cases)
  return seq.filter((s, i, a) => i === 0 || s !== a[i - 1]);
}

export default function ApplicationSankey({ apps, events, recentDays, title }: Props) {
  const data = useMemo(() => {

    const cutoff = recentDays ? new Date(new Date().setDate(new Date().getDate() - recentDays)) : null;
    const sourceApps = cutoff ? apps.filter(a => tsToDate(a.createdAt) >= cutoff) : apps;
    // group events by app
    const byApp: Record<string, StatusEvent[]> = {};
    for (const e of events) {
      if (!e.applicationId) continue;
      (byApp[e.applicationId] ||= []).push(e);
    }

    // nodes: all pipeline stages (Saved removed)

    const nodes = [
      { name: 'Start', fill: '#e5e7eb' },
      ...STAGES.map((s) => ({ name: s, fill: STATUS_HEX[s] || '#94a3b8' }))
    ];
    const idx: Record<Status | 'Start', number> = { Start: 0 } as Record<Status | 'Start', number>;
    STAGES.forEach((s, i) => { idx[s] = i + 1; });

    const counts: Record<string, number> = {};
    for (const app of sourceApps) {
      const seq = buildStageSequence(app, byApp[app.id || ''] || []);
      if (!seq.length) continue;

      // Start → first stage (captures entries not inferred from events)
      const first = seq[0];
      counts[`Start→${first}`] = (counts[`Start→${first}`] || 0) + 1;

      // Consecutive stage transitions
      for (let i = 0; i < seq.length - 1; i++) {
        const a = seq[i], b = seq[i + 1];
        const key = `${a}→${b}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    const links = Object.entries(counts).map(([k, v]) => {
      const [a, b] = k.split('→') as [Status | 'Start', Status];
      return { source: idx[a], target: idx[b], value: v };
    });



    const data = {
      nodes,
      links,
    };
    return data;
  }, [apps, events, recentDays]);

  // Custom components with proper keys to fix React warnings
  const renderNode = (props: any) => {
    const { x, y, width, height, payload, index } = props;
    return (
      <g key={`node-${index}-${payload?.name || index}`}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload?.fill || '#94a3b8'}
          rx={2}
        />
        <text
          x={x + width + 8}
          y={y + height / 2}
          dy="0.35em"
          fontSize={12}
          fill="#374151"
          textAnchor="start"
        >
          {payload?.name}
        </text>
      </g>
    );
  };

  const renderLink = (props: any) => {
    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    return (
      <path
        key={`link-${index}`}
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={0.6}
      />
    );
  };

  return (
    <div className="rounded border bg-white p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey 
            data={data}
            nodePadding={24} 
            nodeWidth={14} 
            linkCurvature={0.5}
            margin={{ left: 12, right: 140, top: 12, bottom: 12 }}
            node={renderNode}
            link={renderLink}
          >
            <Tooltip />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
