'use client';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { ApplicationDoc, Status, StatusEvent } from '../lib/types';
import StatusBadge from './StatusBadge';
import { tsToDate } from '../lib/utils';
import { useUser } from '../lib/useUser';
import { STATUS_ORDER } from '../lib/status';
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
    const [refreshing, setRefreshing] = useState(false);

    const fetchApplications = async () => {
        if (!uid || loading) return;
        
        setRefreshing(true);
        try {
            const response = await apiClient.get('/api/applications');
            if (response.ok) {
                const data = await response.json();
                setRows(data.applications || []);
            }
        } catch (error) {
            console.error('Failed to fetch applications:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchStatusEvents = async (appId: string) => {
        if (!uid) return;
        
        try {
            const response = await apiClient.get(`/api/status-events/by-app?appId=${appId}`);
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error('Failed to fetch status events:', error);
            setEvents([]);
        }
    };

    useEffect(() => {
        fetchApplications();
        
        // Poll for updates every 30 seconds
        const interval = setInterval(fetchApplications, 30000);
        return () => clearInterval(interval);
    }, [uid, loading]);

    useEffect(() => {
        if (drawerOpen && selected?.id) {
            fetchStatusEvents(selected.id);
        }
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


    const changeStatus = async (id: string, next: Status, current?: Status) => {
        if (!uid) return;
        
        try {
            // First create status event if status is changing
            if (current && current !== next) {
                await apiClient.post('/api/status-events', {
                    appId: id,
                    type: 'status-change',
                    from: current,
                    to: next
                });
            }
            
            // Update application status
            const updateData: any = { status: next };
            if (next === 'Rejected' && current) {
                updateData.refusedAt = current; // store where rejection happened
            }
            
            const response = await apiClient.patch(`/api/applications?id=${id}`, updateData);
            
            if (response.ok) {
                // Refresh applications list
                await fetchApplications();
                // If drawer is open for this app, refresh events too
                if (selected?.id === id && drawerOpen) {
                    await fetchStatusEvents(id);
                }
            }
        } catch (error) {
            console.error('Failed to change status:', error);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleDelete = async (id: string, title?: string, company?: string) => {
        if (!uid) return;
        if (!confirm(`Delete "${title || 'this role'}" at ${company || 'company'}? This cannot be undone.`)) return;
        
        try {
            const response = await apiClient.delete(`/api/applications?id=${id}`);
            
            if (response.ok) {
                // Close drawer if deleted app was selected
                if (selected?.id === id) {
                    setDrawerOpen(false);
                    setSelected(null);
                }
                // Refresh applications list
                await fetchApplications();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            console.error('Failed to delete application:', error);
            alert('Failed to delete application. Please try again.');
        }
    };

    const openDrawer = (row: ApplicationDoc) => { setSelected(row); setDrawerOpen(true); };


    return (
        <div className="space-y-3">
            <div className="flex gap-2 items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search title/company/location"
                    className="flex-1 px-3 py-2 border rounded"
                />
                
                <button
                    onClick={fetchApplications}
                    disabled={refreshing}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {refreshing ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </>
                    )}
                </button>
                
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded px-2 py-2">
                    {['All', 'Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'Rejected', 'Closed'].map((s) => (
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
                            <th className="p-2">Position Level</th>
                            <th className="p-2">Location</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Rejected at</th>
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
                                <td className="p-2">{r.positionLevel || 'Unknown'}</td>
                                <td className="p-2">{r.location}</td>
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge value={r.status as any} />
                                        <select
                                            className="border rounded px-1 py-0.5"
                                            value={r.status}
                                            onChange={(e)=>changeStatus(r.id!, e.target.value as Status, r.status as Status)}
                                        >
                                            {['Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'Rejected', 'Closed'].map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </td>
                                <td className="p-2 text-slate-600">
                                    {r.status === 'Rejected' ? (r.refusedAt || 'Unknown') : '—'}
                                </td>
                                <td className="p-2 text-slate-600">{r.notes || ''}</td>
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
                            {selected.status === 'Rejected' && (
                                <div><b>Rejected at:</b> {selected.refusedAt || 'Unknown'}</div>
                            )}
                            <div><b>Status updated:</b> {tsToDate(selected.statusUpdatedAt || selected.lastActionAt).toLocaleString()}</div>
                            <div><b>Created:</b> {tsToDate(selected.createdAt).toLocaleString()}</div>
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