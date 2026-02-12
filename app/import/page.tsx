'use client';
import * as React from 'react';
import Papa from 'papaparse';
import { useUser } from '../../lib/useUser';
import { createApplication, deleteAllApplications } from '@/lib/firestore';
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
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [importComplete, setImportComplete] = React.useState(false);

  const onFile=(f:File)=>{
    setErrors([]); setRows([]); setImportComplete(false);
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
    
    if (importMode === 'replace') {
      try {
        await deleteAllApplications(uid);
      } catch (error) {
        console.error('Error deleting existing data:', error);
        alert('Error clearing existing data. Import cancelled.');
        setImporting(false);
        return;
      }
    }
    
    try {
      for(const r of rows) { 
        await createApplication(uid, normalize(r)); 
      }
      setImportComplete(true);
      setRows([]);
      setErrors([]);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error during import. Some data may not have been imported.');
    }
    
    setImporting(false);
  };
  
  if (loading) return <p className="text-slate-600">Loading…</p>;

  return <div className="max-w-4xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold text-slate-900">Import Applications from CSV</h1>
    
    {importComplete && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-green-800">Import Successful!</h3>
        </div>
        <p className="mt-1 text-green-700">Your applications have been imported successfully. You can now view them in your dashboard.</p>
        <button 
          onClick={() => setImportComplete(false)}
          className="mt-3 text-sm text-green-800 hover:text-green-900 underline"
        >
          Import another file
        </button>
      </div>
    )}

    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">CSV Format Requirements</h2>
          <div className="bg-slate-50 rounded-md p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Required columns:</p>
              <code className="text-sm bg-white px-2 py-1 rounded border text-slate-800">title, company, status</code>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Optional columns:</p>
              <code className="text-sm bg-white px-2 py-1 rounded border text-slate-800">{OPTIONAL.join(', ')}</code>
            </div>
            <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">
              <li><code className="bg-white px-1 rounded">status</code> must be one of: Saved, Applied, OA, Screen, Tech, Onsite, Offer, Accepted, Rejected, Closed</li>
              <li><code className="bg-white px-1 rounded">createdAt</code> accepts ISO string (e.g. 2025-09-17) or milliseconds epoch</li>
              <li><code className="bg-white px-1 rounded">tags</code> can be comma/semicolon/pipe-separated</li>
              <li>Rejected applications may include <code className="bg-white px-1 rounded">rejectionReason</code> for analytics</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-900">Import Mode</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="add"
                checked={importMode === 'add'}
                onChange={(e) => setImportMode(e.target.value as 'add' | 'replace')}
                className="mr-2"
              />
              <div>
                <span className="font-medium text-slate-700">Add to existing data</span>
                <p className="text-sm text-slate-600">Keep current applications and add imported ones</p>
              </div>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(e) => setImportMode(e.target.value as 'add' | 'replace')}
                className="mr-2"
              />
              <div>
                <span className="font-medium text-slate-700">Replace all data</span>
                <p className="text-sm text-slate-600">⚠️ Delete current applications and replace with imported ones</p>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-900">Select CSV File</h3>
          <div className="relative">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="csvFile"
            />
            <label 
              htmlFor="csvFile" 
              className="flex items-center justify-center w-full px-6 py-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
            >
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">Choose CSV file</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">CSV files only</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              <div className="mt-2 text-sm text-red-700 space-y-1">
                {errors.map((e,i)=><div key={i}>• {e}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Ready to Import</h3>
              <p className="text-sm text-blue-700">Found {rows.length} valid applications to import</p>
              {importMode === 'replace' && (
                <p className="text-sm text-red-600 mt-1 font-medium">⚠️ This will delete ALL your existing applications first</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button 
          disabled={!rows.length || importing} 
          onClick={doImport} 
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
        >
          {importing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Importing...
            </>
          ) : (
            `${importMode === 'replace' ? 'Replace All & ' : ''}Import ${rows.length} Applications`
          )}
        </button>
      </div>
    </div>
  </div>;
}
