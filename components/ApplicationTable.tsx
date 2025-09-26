'use client';
import { useEffect, useMemo, useState } from 'react';
import { listenApplications, updateApplication, deleteApplication, listenStatusEventsForApp } from '../lib/firestore';
import type { ApplicationDoc, Status, StatusEvent } from '../lib/types';
import StatusBadge from './StatusBadge';
import { tsToDate } from '../lib/utils';
import { addStatusEvent } from '@/lib/firestore';
import { useUser } from '../lib/useUser';
import { STATUS_ORDER, REJECT_REASONS } from '../lib/status';
import AppStatusTimeline from './Charts/AppStatusTimeLine';

export default function ApplicationTable() {
    const { uid, loading } = useUser();
    const [rows, setRows] = useState<ApplicationDoc[]>([]);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<Status | 'All'>('All');
    const [sortKey, setSortKey] = useState<'createdAt' | 'statusUpdatedAt' | 'status'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<ApplicationDoc | null>(null);
    const [events, setEvents] = useState<StatusEvent[]>([]);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
    const [rejectCustom, setRejectCustom] = useState<string>('');

    useEffect(() => {
        if (!uid || loading) return;
        const unsub = listenApplications(uid, setRows);
        return () => unsub();
    }, [uid, loading]);

    useEffect(() => {
        if (!uid || !drawerOpen || !selected?.id) return;
        const unsub = listenStatusEventsForApp(uid, selected.id, setEvents);
        return () => unsub();
    }, [uid, drawerOpen, selected?.id]);

    const filtered = useMemo(() => rows.filter(r => {
        const passStatus = filter === 'All' || r.status === filter;
        const text = `${r.title || ''} ${r.company || ''} ${r.location || ''} ${r.notes || ''}`.toLowerCase();
        return passStatus && text.includes(q.toLowerCase());
    }), [rows, q, filter]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            if (sortKey === 'status') {
                const va = STATUS_ORDER[a.status as Status] ?? 0;
                const vb = STATUS_ORDER[b.status as Status] ?? 0;
                return sortDir === 'asc' ? va - vb : vb - va;
            }
            const da = tsToDate((a as any)[sortKey]).getTime();
            const db = tsToDate((b as any)[sortKey]).getTime();
            return sortDir === 'asc' ? da - db : db - da;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);


    const changeStatus = async (id: string, s: Status, current?: Status) => {
        if (!uid) return;
        if (current && current !== s) await addStatusEvent(uid, { appId: id, type: 'status-change', from: current, to: s });
        await updateApplication(uid, id, { status: s });
    };

    const handleDelete = async (id: string, title?: string, company?: string) => {
        if (!uid) return;
        if (!confirm(`Delete "${title || 'this role'}" at ${company || 'company'}? This cannot be undone.`)) return;
        await deleteApplication(uid, id);
    };

    const openDrawer = (row: ApplicationDoc) => { setSelected(row); setDrawerOpen(true); };


    return (
        <div className="space-y-3">
            <div className="flex gap-2 items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search title/company/location"
                    className="border rounded px-3 py-2 w-full"
                />
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded px-2 py-2">
                    {['All', 'Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'Rejected'].map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="border rounded px-2 py-2">
                    <option value="createdAt">Create date</option>
                    <option value="statusUpdatedAt">Update date</option>
                    <option value="status">Status</option>
                </select>
                <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="border rounded px-2 py-2">
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left border-b">
                            <th className="p-2">Company</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Location</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Notes</th>
                            <th className="p-2">Created</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r) => (
                            <tr key={r.id} className="border-b hover:bg-slate-50">
                                <td className="p-2 font-medium">{r.company}</td>
                                <td className="p-2">{r.title}</td>
                                <td className="p-2">{r.location}</td>
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge value={r.status as any} />
                                        <select
                                            className="border rounded px-1 py-0.5"
                                            value={r.status}
                                            onChange={(e) => {
                                                const next = e.target.value as Status;
                                                if (next === 'Rejected') { setRejectingId(r.id!); setRejectReason(REJECT_REASONS[0]); return; }
                                                changeStatus(r.id!, next);
                                            }}
                                        >
                                            {['Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'Rejected'].map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                        {rejectingId === r.id && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <select className="border rounded px-2 py-1" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                                                    {REJECT_REASONS.map(x => <option key={x} value={x}>{x}</option>)}
                                                </select>
                                                {rejectReason === 'Other' && (
                                                    <input className="border rounded px-2 py-1" placeholder="Custom reason" value={rejectCustom}
                                                        onChange={e => setRejectCustom(e.target.value)} />
                                                )}
                                                <button className="px-2 py-1 rounded bg-rose-600 text-white" onClick={async () => {
                                                    if (!uid) return;
                                                    const reason = (rejectReason === 'Other' ? rejectCustom.trim() : rejectReason) || 'Unknown';
                                                    await updateApplication(uid, r.id!, { status: 'Rejected', rejectionReason: reason, lastActionAt: new Date() as any });
                                                    setRejectingId(null); setRejectCustom('');
                                                }}>Confirm</button>
                                                <button className="px-2 py-1 rounded border" onClick={() => { setRejectingId(null); setRejectCustom(''); }}>Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2 max-w-xs truncate text-slate-700">{r.notes || ''}</td>
                                <td className="p-2 text-slate-600">{tsToDate(r.createdAt).toLocaleDateString()}</td>
                                <td className="p-2">
                                    <div className="flex gap-3">
                                        <button className="underline" onClick={() => openDrawer(r)}>Details</button> {/* NEW */}
                                        <a className="underline" href={`/applications/${r.id}`}>Edit</a>
                                        <button className="underline cursor-pointer" onClick={() => handleDelete(r.id!, r.title, r.company)}>
                                            Delete
                                        </button>
                                        {r.jobUrl && (
                                            <a className="underline" href={r.jobUrl} target="_blank" rel="noreferrer">
                                                Open
                                            </a>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {drawerOpen && selected && (
                <div className="fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)}></div>
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Details – {selected.company} • {selected.title}</h3>
                            <button onClick={() => setDrawerOpen(false)} className="px-2 py-1 border rounded">Close</button>
                        </div>
                        <div className="text-sm text-slate-600">
                            <div><b>Status:</b> {selected.status}</div>
                            <div><b>Status updated:</b> {tsToDate(selected.statusUpdatedAt || selected.lastActionAt).toLocaleString()}</div>
                            <div><b>Created:</b> {tsToDate(selected.createdAt).toLocaleString()}</div>
                            {selected.rejectionReason && <div><b>Rejection reason:</b> {selected.rejectionReason}</div>}
                            {selected.notes && <div className="mt-1"><b>Notes:</b> {selected.notes}</div>}
                        </div>
                        <div className="border rounded p-3">
                            <h4 className="font-medium mb-2">Status history</h4>
                            <AppStatusTimeline app={selected} events={events} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}