'use client';
import { useState } from 'react';
import type { ApplicationDoc } from '../lib/types';
import { createApplication } from '../lib/firestore';
import { db } from '../lib/firebase';
import { useEffect } from 'react';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';


export default function ApplicationForm({ uid, onSaved }: { uid: string | undefined; onSaved?: () => void }) {
const [form, setForm] = useState<Partial<ApplicationDoc>>({ status: 'Applied', title: 'Unknown', location: 'Unknown', positionLevel: 'Unknown' });
const [loading, setLoading] = useState(false);
const [priorCount, setPriorCount] = useState(0);
const [priorSamples, setPriorSamples] = useState<{status?: string; title?: string; createdAt?: any}[]>([]);

useEffect(() => {
  let alive = true;
  (async () => {
    const term = (form.company || '').trim();
    if (!uid || term.length < 2) { if (alive) { setPriorCount(0); setPriorSamples([]); } return; }

    const termLower = term.toLowerCase();

    // prefer companyLower==termLower; fallback to exact company match
    const q1 = query(collection(db, `users/${uid}/applications`), where('companyLower', '==', termLower), limit(5));
    const q2 = query(collection(db, `users/${uid}/applications`), where('company', '==', term), limit(5));

    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const docs = [...s1.docs, ...s2.docs].filter((v, i, a) => a.findIndex(d => d.id === v.id) === i);

    if (!alive) return;
    setPriorCount(docs.length);
    setPriorSamples(
      docs
        .map(d => d.data() as any)
        .map(d => ({ status: d.status, title: d.title, createdAt: d.createdAt }))
        .slice(0, 3)
    );
  })();
  return () => { alive = false; };
}, [uid, form.company]);



const update = (k: keyof ApplicationDoc, v: any) => setForm(s => ({ ...s, [k]: v }));


const save = async () => {
    if (!uid) return alert('Please sign in');
        setLoading(true);
    await createApplication(uid, form);
    setForm({ status: 'Applied', title: 'Unknown', location: 'Unknown', positionLevel: 'Unknown', company: '', jobUrl: '', notes: '' });
    setLoading(false);
    onSaved?.();
};


return (
    <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Company" value={form.company||''} onChange={e=>update('company', e.target.value)} />
        <div className="text-xs text-slate-600 -mt-2 mb-1">
        {priorCount > 0
            ? (
            <div>
                You’ve logged <b>{priorCount}</b> application{priorCount>1?'s':''} for “{(form.company||'').trim()}”.
                <div className="mt-1 space-y-0.5">
                {priorSamples.map((s, i) => (
                    <div key={`prior-${i}`}>
                    • {s.title || 'Unknown title'} — {s.status || 'Unknown status'}{s.createdAt ? ` — ${new Date(s.createdAt.toDate ? s.createdAt.toDate() : s.createdAt).toLocaleDateString()}` : ''}
                    </div>
                ))}
                </div>
            </div>
            )
            : (form.company?.trim()?.length ? 'No previous applications found for this company.' : null)
        }
        </div>
        <input className="w-full border rounded px-3 py-2" placeholder="Job URL" value={form.jobUrl||''} onChange={e=>update('jobUrl', e.target.value)} />
        <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Job title</label>
            <select className="border rounded px-2 py-1" value={form.title||''} onChange={e=>update('title', e.target.value)}>
                {['Unknown', 'Back end', 'Front end', 'Full stack','AI', 'Data', 'Other'].map(s=> <option key={s} value={s}>{s}</option>)}
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
                {['Applied','Saved','OA','Screen','Tech','Onsite','Offer','Accepted','Rejected', 'Closed'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        {/* NEW: Notes */}
        <textarea className="w-full border rounded px-3 py-2 h-28" placeholder="Notes (e.g., who referred you, follow-up details)" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
        <button disabled={loading} onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">{loading? 'Saving...' : 'Save'}</button>
    </div>
);
}