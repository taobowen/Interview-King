'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '../../../lib/useUser';
import { authenticatedFetch } from '../../../lib/api-client';
import type { ApplicationDoc, Status } from '../../../lib/types';
import { tsToDate } from '../../../lib/utils';

const REJECT_AT_OPTIONS: Status[] = ['Saved','Applied','OA','Screen','Tech','Onsite','Offer'];

function normalizeApplication(raw: any): Partial<ApplicationDoc> | null {
    if (!raw || typeof raw !== 'object') return null;

    return {
        id: raw.id,
        title: raw.title ?? raw.titleText ?? raw.title_text ?? '',
        company: raw.company ?? '',
        location: raw.location ?? '',
        jobUrl: raw.jobUrl ?? raw.job_url ?? raw.link ?? '',
        status: (raw.status ?? 'Saved') as Status,
        notes: raw.notes ?? '',
        statusUpdatedAt: raw.statusUpdatedAt ?? raw.status_updated_at,
        lastActionAt: raw.lastActionAt ?? raw.last_action_at,
        refusedAt: raw.refusedAt ?? raw.refused_at,
    };
}


export default function EditApplicationPage() {
    const params = useParams();
    const router = useRouter();
    const id = (params?.id as string) || '';
    const { uid } = useUser();
    const [form, setForm] = useState<Partial<ApplicationDoc> | null>(null);
    const [loading, setLoading] = useState(true);
    const initialStatus = useRef<Status | undefined>(undefined);
    const [refusedSel, setRefusedSel] = useState<Status>('Applied');


    useEffect(() => {
        if (!uid || !id) return;
        (async () => {
            try {
                // Fetch application from PostgreSQL API
                const response = await authenticatedFetch(`/api/applications?id=${id}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const app = normalizeApplication(
                        data?.application
                        ?? data?.applications?.[0]
                        ?? data?.data?.application
                        ?? data?.data
                    );

                    if (!app) {
                        setForm({});
                        return;
                    }

                    initialStatus.current = app?.status || undefined;
                    setForm(app || {});
                    setRefusedSel(app?.refusedAt || 'Applied');
                }
                
            } catch (error) {
                console.error('Error fetching application:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, [uid, id]);


    const update = (k: keyof ApplicationDoc, v: any) => setForm((s) => ({ ...(s || {}), [k]: v }));


    const save = async () => {
        if (!uid || !id || !form) return;
        
        try {
            const was = initialStatus.current;
            const now = (form.status || 'Saved') as Status;
            
            const updateData = {
                title: form.title || '',
                company: form.company || '',
                location: form.location || '',
                jobUrl: form.jobUrl || '',
                status: now,
                notes: form.notes || '',
                refusedAt: now === 'Rejected' ? new Date().toISOString() : null,
            };

            // Update application via PostgreSQL API
            const response = await authenticatedFetch(`/api/applications?id=${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                // If status changed, create status event via API
                if (was && was !== now) {
                    await authenticatedFetch('/api/status-events', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            appId: id,
                            type: 'status-change',
                            from: was,
                            to: now,
                        }),
                    });
                }
                
                router.push('/applications');
            } else {
                console.error('Failed to update application');
            }
        } catch (error) {
            console.error('Error saving application:', error);
        }
    };

    if (!uid) return <p className="text-slate-600">Please sign in.</p>;
    if (loading || !form) return <p className="text-slate-600">Loading…</p>;

    return (
        <div className="max-w-2xl space-y-3">
            <h1 className="text-xl font-semibold">Edit Application</h1>
            <div className="space-y-1">
                <label className="text-sm text-slate-600">Title</label>
                <input className="w-full border rounded px-3 py-2" placeholder="Job title" value={form.title || ''} onChange={(e) => update('title', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-sm text-slate-600">Company</label>
                <input className="w-full border rounded px-3 py-2" placeholder="Company" value={form.company || ''} onChange={(e) => update('company', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-sm text-slate-600">Location</label>
                <input className="w-full border rounded px-3 py-2" placeholder="Location" value={form.location || ''} onChange={(e) => update('location', e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-sm text-slate-600">Job URL</label>
                <input className="w-full border rounded px-3 py-2" placeholder="Job URL" value={form.jobUrl || ''} onChange={(e) => update('jobUrl', e.target.value)} />
            </div>


            <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Status</label>
                <select className="border rounded px-2 py-1" value={(form.status as any) || 'Saved'} onChange={(e) => update('status', e.target.value)}>
                    {['Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'No response', 'Rejected', 'Closed'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <p className="text-sm text-slate-600">Original status: {initialStatus.current || 'Saved'}</p>
                <p className="text-sm text-slate-600">Status last updated: {tsToDate(form.statusUpdatedAt || form.lastActionAt).toLocaleString()}</p>
            </div>

            {(form.status as any) === 'Rejected' && (
                <div className="grid gap-2">
                    <label className="text-sm text-slate-600">Rejected at</label>
                    <select
                    className="border rounded px-2 py-1 w-full"
                    value={refusedSel}
                    onChange={(e)=> setRefusedSel(e.target.value as Status)}
                    >
                    {REJECT_AT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Notes</label>
            </div>

            <textarea className="w-full border rounded px-3 py-2 h-28" placeholder="Notes" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />


            <div className="flex gap-2 pt-2">
                <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">Save changes</button>
                <button onClick={() => router.back()} className="px-4 py-2 rounded border">Cancel</button>
            </div>
        </div>
    );
}