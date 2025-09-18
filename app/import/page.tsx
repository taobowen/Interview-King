'use client';
import * as React from 'react';
import Papa from 'papaparse';
import { useUser } from '../../lib/useUser';
import { createApplication } from '@/lib/firestore';
import type { ApplicationDoc } from '@/lib/types';

const REQUIRED = ['title','company','status'];
const OPTIONAL = ['location','jobUrl','createdAt','notes','rejectionReason','priority','jobType','remote','tags'];

function normalize(row:any): Partial<ApplicationDoc> {
  const o:any={ title:row.title?.trim()||'', company:row.company?.trim()||'', status:row.status?.trim()||'Saved' };
  if(row.location) o.location=row.location.trim();
  if(row.jobUrl) o.jobUrl=row.jobUrl.trim();
  if(row.notes) o.notes=row.notes;
  if(row.rejectionReason) o.rejectionReason=row.rejectionReason;
  if(row.priority) o.priority=row.priority;
  if(row.jobType) o.jobType=row.jobType;
  if(row.remote) o.remote=row.remote;
  if(row.tags) o.tags=String(row.tags).split(/[,;|]/).map((s:string)=>s.trim()).filter(Boolean);
  if(row.createdAt){ const t=Date.parse(row.createdAt); if(!isNaN(t)) o.createdAt=new Date(t) as any; else if(!isNaN(Number(row.createdAt))) o.createdAt=new Date(Number(row.createdAt)) as any; }
  return o;
}

export default function ImportCSV() {
  const { uid, loading } = useUser();
  const [rows,setRows]=React.useState<any[]>([]);
  const [errors,setErrors]=React.useState<string[]>([]);
  const [importing,setImporting]=React.useState(false);

  const onFile=(f:File)=>{
    setErrors([]); setRows([]);
    Papa.parse(f,{header:true,skipEmptyLines:true,complete:(res)=>{
      const data=res.data as any[];
      const miss:string[]=[]; const ok:any[]=[];
      data.forEach((r,idx)=>{ const missing=REQUIRED.filter(k=>!String(r[k]||'').trim()); if(missing.length) miss.push(`Row ${idx+1}: missing ${missing.join(', ')}`); else ok.push(r); });
      if(miss.length) setErrors(miss);
      setRows(ok);
    }, error:(e)=>setErrors([String(e)])});
  };

  const doImport=async()=>{
    if(!uid || !rows.length) return;
    setImporting(true);
    for(const r of rows){ await createApplication(uid, normalize(r)); }
    setImporting(false); alert('Import complete');
  };
  
  if (loading) return <p className="text-slate-600">Loading…</p>;

  return <div className="max-w-3xl space-y-4">
    <h1 className="text-xl font-semibold">Import applications (CSV)</h1>
    <div className="rounded border bg-white p-4 space-y-2">
      <p className="text-sm text-slate-700">Required headers: <code>title, company, status</code></p>
      <p className="text-sm text-slate-700">Optional: <code>{OPTIONAL.join(', ')}</code></p>
      <ul className="list-disc ml-5 text-sm text-slate-700">
        <li><code>status</code> one of: Saved, Applied, OA, Screen, Tech, Onsite, Offer, Accepted, Rejected</li>
        <li><code>createdAt</code> accepts ISO string (e.g. 2025-09-17) or millis epoch</li>
        <li><code>tags</code> can be comma/semicolon/pipe-separated</li>
        <li>Rejected rows may include <code>rejectionReason</code> for analytics</li>
      </ul>
      <input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/>
      {errors.length>0 && <div className="text-rose-600 text-sm">{errors.map((e,i)=><div key={i}>{e}</div>)}</div>}
      {rows.length>0 && <div className="text-sm text-slate-700">Ready to import: {rows.length} rows</div>}
      <button disabled={!rows.length||importing} onClick={doImport} className="px-4 py-2 rounded bg-blue-600 text-white">{importing?'Importing…':'Import'}</button>
    </div>
  </div>;
}
