'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '../../../lib/useUser';
import type { ApplicationDoc, Status } from '../../../lib/types';
import { tsToDate } from '../../../lib/utils';

import { getApplication, updateApplication, addStatusEvent } from '../../../lib/firestore';
export default function EditApplicationPage() {
    const params = useParams();
    const router = useRouter();
    const id = (params?.id as string) || '';
    const { uid } = useUser();
    const [form, setForm] = useState<Partial<ApplicationDoc> | null>(null);
    const [loading, setLoading] = useState(true);
    const initialStatus = useRef<Status | undefined>(undefined);



    useEffect(() => {
        if (!uid || !id) return;
        (async () => {
            const doc = await getApplication(uid, id);
            initialStatus.current = (doc?.status as Status) || undefined;
            setForm(doc || {});
            setLoading(false);
        })();
    }, [uid, id]);


    const update = (k: keyof ApplicationDoc, v: any) => setForm((s) => ({ ...(s || {}), [k]: v }));


    const save = async () => {
        if (!uid || !id || !form) return;
        const patch: any = {
            title: form.title || '',
            company: form.company || '',
            location: form.location || '',
            jobUrl: form.jobUrl || '',
            status: (form.status || 'Saved') as Status,
            notes: form.notes || '',
            rejectionReason: form.rejectionReason || '',
        };
        if (initialStatus.current && initialStatus.current !== patch.status) {
            patch.statusUpdatedAt = new Date() as any;
            await addStatusEvent(uid, { appId: id, type: 'status-change', from: initialStatus.current, to: patch.status });
        }
        await updateApplication(uid, id, patch);
        router.push('/applications');
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