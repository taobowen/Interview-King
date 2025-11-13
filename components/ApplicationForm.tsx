'use client';
import { useState } from 'react';
import type { ApplicationDoc } from '../lib/types';
import { createApplication } from '../lib/firestore';


export default function ApplicationForm({ uid, onSaved }: { uid: string | undefined; onSaved?: () => void }) {
const [form, setForm] = useState<Partial<ApplicationDoc>>({ status: 'Saved' });
const [loading, setLoading] = useState(false);


const update = (k: keyof ApplicationDoc, v: any) => setForm(s => ({ ...s, [k]: v }));


const save = async () => {
    if (!uid) return alert('Please sign in');
        setLoading(true);
    await createApplication(uid, form);
    setForm({ status: 'Saved' });
    setLoading(false);
    onSaved?.();
};


return (
    <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Company" value={form.company||''} onChange={e=>update('company', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Job URL" value={form.jobUrl||''} onChange={e=>update('jobUrl', e.target.value)} />
        <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Job title</label>
            <select className="border rounded px-2 py-1" value={form.title||''} onChange={e=>update('title', e.target.value)}>
                {['Front end', 'Full stack','SDE','AI','Data', 'Other'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Location</label>
            <select className="border rounded px-2 py-1" value={form.location||''} onChange={e=>update('location', e.target.value)}>
                {['Unknown', 'Toronto', 'GTA','Vancouver', 'Canada', 'Remote', 'Other'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
         <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Position Level</label>
            <select className="border rounded px-2 py-1" value={form.positionLevel||''} onChange={e=>update('positionLevel', e.target.value)}>
                {['Unknown', 'NG', 'Junior','Mid','Senior', 'Staff', 'Other'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Status</label>
            <select className="border rounded px-2 py-1" value={form.status} onChange={e=>update('status', e.target.value)}>
                {['Saved','Applied','OA','Screen','Tech','Onsite','Offer','Accepted','Rejected'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        {/* NEW: Notes */}
        <textarea className="w-full border rounded px-3 py-2 h-28" placeholder="Notes (e.g., who referred you, follow-up details)" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
        <button disabled={loading} onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">{loading? 'Saving...' : 'Save'}</button>
    </div>
);
}