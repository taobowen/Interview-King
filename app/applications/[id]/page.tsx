'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '../../../lib/useUser';
import { auth } from '../../../lib/firebase';
import type { ApplicationDoc, Status } from '../../../lib/types';
import { tsToDate } from '../../../lib/utils';

const REJECT_AT_OPTIONS: Status[] = ['Saved','Applied','OA','Screen','Tech','Onsite','Offer'];


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
                const user = auth.currentUser;
                if (!user) return;
                
                const token = await user.getIdToken();
                const response = await fetch(`/api/applications?id=${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const app = data.application;
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
            const user = auth.currentUser;
            if (!user) return;
            
            const token = await user.getIdToken();
            const was = initialStatus.current;
            const now = (form.status || 'Saved') as Status;
            
            const updateData = {
                title: form.title || '',
                company: form.company || '',
                location: form.location || '',
                jobUrl: form.jobUrl || '',
                status: now,
                notes: form.notes || '',
                refusedAt: now === 'Rejected' ? new Date(refusedSel).toISOString() : null,
            };

            // Update application via PostgreSQL API
            const response = await fetch(`/api/applications?id=${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                // If status changed, create status event via API
                if (was && was !== now) {
                    await fetch('/api/status-events', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
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
            <input className="w-full border rounded px-3 py-2" placeholder="Job title" value={form.title || ''} onChange={(e) => update('title', e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Company" value={form.company || ''} onChange={(e) => update('company', e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Location" value={form.location || ''} onChange={(e) => update('location', e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Job URL" value={form.jobUrl || ''} onChange={(e) => update('jobUrl', e.target.value)} />


            <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Status</label>
                <select className="border rounded px-2 py-1" value={(form.status as any) || 'Saved'} onChange={(e) => update('status', e.target.value)}>
                    {['Saved', 'Applied', 'OA', 'Screen', 'Tech', 'Onsite', 'Offer', 'Accepted', 'Rejected'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
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