'use client';
import { useMemo, useCallback, useState, useEffect } from 'react';
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [apps, events, recentDays]);

  const data = useMemo(() => {
    try {
      if (!apps || apps.length === 0) {
        return { nodes: [], links: [], valid: true };
      }

      const cutoff = recentDays ? new Date(new Date().setDate(new Date().getDate() - recentDays)) : null;
      const sourceApps = cutoff ? apps.filter(a => tsToDate(a.createdAt) >= cutoff) : apps;
      
      if (sourceApps.length === 0) {
        return { nodes: [], links: [], valid: true };
      }

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
      let processedApps = 0;
      const MAX_APPS = 10000; // Safety limit
      
      for (const app of sourceApps) {
        if (processedApps++ > MAX_APPS) {
          console.warn('Too many apps, stopping Sankey processing');
          break;
        }

        const seq = buildStageSequence(app, byApp[app.id || ''] || []);
        if (!seq || seq.length === 0) continue;

        // Validate sequence doesn't have issues
        if (seq.length > 50) {
          console.warn('Sequence too long, skipping app:', app.id);
          continue;
        }

        // Start → first stage (captures entries not inferred from events)
        const first = seq[0];
        if (first && idx[first] !== undefined) {
          counts[`Start→${first}`] = (counts[`Start→${first}`] || 0) + 1;
        }

        // Consecutive stage transitions
        for (let i = 0; i < seq.length - 1; i++) {
          const a = seq[i], b = seq[i + 1];
          if (!a || !b || idx[a] === undefined || idx[b] === undefined) continue;
          const key = `${a}→${b}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }

      const links = Object.entries(counts)
        .map(([k, v]) => {
          const parts = k.split('→');
          if (parts.length !== 2) return null;
          const [a, b] = parts as [Status | 'Start', Status];
          const sourceIdx = idx[a];
          const targetIdx = idx[b];
          
          // Skip invalid or self-referencing links
          if (sourceIdx === undefined || targetIdx === undefined || !v || v < 0 || sourceIdx === targetIdx) {
            return null;
          }
          return { source: sourceIdx, target: targetIdx, value: Math.max(0, v) };
        })
        .filter((link): link is { source: number; target: number; value: number } => link !== null);

      // Validate the final data structure
      if (links.length > 500) {
        console.warn('Too many links, data may be corrupted');
        return { nodes: [], links: [], valid: false };
      }

      // Check for circular references
      const linkMap = new Map<number, Set<number>>();
      for (const link of links) {
        if (!linkMap.has(link.source)) linkMap.set(link.source, new Set());
        linkMap.get(link.source)!.add(link.target);
      }

      // Simple cycle detection
      const visited = new Set<number>();
      const recStack = new Set<number>();
      const hasCycle = (node: number, depth = 0): boolean => {
        if (depth > 100) return true; // Safety limit
        if (recStack.has(node)) return true;
        if (visited.has(node)) return false;
        
        visited.add(node);
        recStack.add(node);
        
        const neighbors = linkMap.get(node);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (hasCycle(neighbor, depth + 1)) return true;
          }
        }
        
        recStack.delete(node);
        return false;
      };

      for (let i = 0; i < nodes.length; i++) {
        if (hasCycle(i)) {
          console.error('Cycle detected in Sankey data, refusing to render');
          return { nodes: [], links: [], valid: false };
        }
      }

      return { nodes, links, valid: true };
    } catch (err) {
      console.error('Error building Sankey data:', err);
      setHasError(true);
      return { nodes: [], links: [], valid: false };
    }
  }, [apps, events, recentDays]);

  // Custom components with proper keys to fix React warnings
  const renderNode = useCallback((props: any) => {
    const { x, y, width, height, payload, index } = props;
    if (!payload || typeof x !== 'number' || typeof y !== 'number') return <g />;
    const w = Math.max(0, width || 0);
    const h = Math.max(0, height || 0);
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={payload.fill || '#94a3b8'} rx={2} />
        {w > 0 && h > 0 && (
          <text x={x + w + 8} y={y + h / 2} dy="0.35em" fontSize={12} fill="#374151" textAnchor="start">
            {payload.name}
          </text>
        )}
      </g>
    );
  }, []);

  const renderLink = useCallback((props: any) => {
    const { sourceX, sourceY, targetX, targetY, sourceControlX, targetControlX, linkWidth } = props;
    if (typeof sourceX !== 'number' || typeof sourceY !== 'number' || typeof targetX !== 'number' || typeof targetY !== 'number') {
      return <path d="" />;
    }
    const cX1 = typeof sourceControlX === 'number' ? sourceControlX : sourceX;
    const cX2 = typeof targetControlX === 'number' ? targetControlX : targetX;
    return (
      <path
        d={`M${sourceX},${sourceY}C${cX1},${sourceY} ${cX2},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={Math.max(0.5, linkWidth || 1)}
        strokeOpacity={0.6}
      />
    );
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {hasError || data.valid === false ? (
        <div style={{ width: '100%', height: '24rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="text-red-600 font-semibold">⚠️ Chart Error</span>
          <span className="text-slate-500 text-sm">Data validation failed - chart disabled for safety</span>
          <button 
            onClick={() => setHasError(false)}
            className="mt-2 px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
          >
            Retry
          </button>
        </div>
      ) : data.nodes.length === 0 || data.links.length === 0 ? (
        <div style={{ width: '100%', height: '24rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-slate-500">No data available</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: '24rem', minHeight: '24rem', minWidth: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Sankey 
              data={{ nodes: data.nodes, links: data.links }}
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
      )}
    </div>
  );
}
