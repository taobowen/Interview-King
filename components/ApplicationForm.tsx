'use client';
import { useState, useEffect } from 'react';
import type { ApplicationDoc } from '../lib/types';
import { apiClient } from '../lib/api-client';
import { tsToDate } from '../lib/utils';

interface JobTitle {
  id: string;
  title: string;
  sortOrder: number;
}


export default function ApplicationForm({ uid, onSaved }: { uid: string | undefined; onSaved?: () => void }) {
const [form, setForm] = useState<Partial<ApplicationDoc>>({ status: 'Applied', title: 'Unknown', location: 'Unknown', positionLevel: 'Unknown' });
const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>('');
const [loading, setLoading] = useState(false);
const [priorCount, setPriorCount] = useState(0);
const [priorSamples, setPriorSamples] = useState<{status?: string; title?: string; createdAt?: any}[]>([]);
const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
const [showJobTitleManager, setShowJobTitleManager] = useState(false);
const [newJobTitle, setNewJobTitle] = useState('');
const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);

// Job title management functions
const fetchJobTitles = async () => {
  if (!uid) return;
  try {
    const response = await apiClient.get('/api/job-titles');
    if (response.ok) {
      const data = await response.json();
      setJobTitles(data.jobTitles || []);
    }
  } catch (error) {
    console.error('Failed to fetch job titles:', error);
  }
};

const addJobTitle = async () => {
  if (!newJobTitle.trim() || !uid) return;
  try {
    const response = await apiClient.post('/api/job-titles', {
      title: newJobTitle.trim(),
      sortOrder: jobTitles.length
    });
    if (response.ok) {
      await fetchJobTitles();
      setNewJobTitle('');
    }
  } catch (error) {
    console.error('Failed to add job title:', error);
  }
};

const updateJobTitle = async (id: string, title: string) => {
  if (!title.trim() || !uid) return;
  try {
    const response = await apiClient.patch(`/api/job-titles?id=${id}`, {
      title: title.trim()
    });
    if (response.ok) {
      await fetchJobTitles();
      setEditingJobTitle(null);
    }
  } catch (error) {
    console.error('Failed to update job title:', error);
  }
};

const deleteJobTitle = async (id: string) => {
  if (!uid) return;
  try {
    const response = await apiClient.delete(`/api/job-titles?id=${id}`);
    if (response.ok) {
      await fetchJobTitles();
    }
  } catch (error) {
    console.error('Failed to delete job title:', error);
  }
};

useEffect(() => {
  if (uid) {
    fetchJobTitles();
  }
}, [uid]);

useEffect(() => {
  let alive = true;
  (async () => {
    const term = (form.company || '').trim();
    if (!uid || term.length < 2) { 
      if (alive) { 
        setPriorCount(0); 
        setPriorSamples([]); 
      } 
      return; 
    }

    try {
      // Call API to get previous applications for this company
      const response = await apiClient.get(`/api/applications/search?company=${encodeURIComponent(term)}`);
      const data = await response.json();
      
      if (!alive) return;
      
      setPriorCount(data.applications?.length || 0);
      setPriorSamples(
        (data.applications || [])
          .map((d: any) => ({ 
            status: d.status, 
            title: d.title, 
            createdAt: d.createdAt
          }))
          .slice(0, 3)
      );
    } catch (error) {
      console.error('Failed to fetch previous applications:', error);
      if (alive) {
        setPriorCount(0);
        setPriorSamples([]);
      }
    }
  })();
  return () => { alive = false; };
}, [uid, form.company]);



const update = (k: keyof ApplicationDoc, v: any) => setForm(s => ({ ...s, [k]: v }));


const save = async () => {
    if (!uid) return alert('Please sign in');
    
    // Validate: Must have either custom title text or selected job title
    if (!form.title && !selectedJobTitleId) {
        alert('Please select or enter a job title');
        return;
    }
    
    setLoading(true);
    
    try {
        const payload: any = {
            company: form.company,
            location: form.location,
            link: form.jobUrl,
            status: form.status,
            notes: form.notes
        };
        
        // Send either titleId (if selected from dropdown) or titleText (if custom)
        if (selectedJobTitleId) {
            payload.titleId = selectedJobTitleId;
        } else {
            payload.titleText = form.title;
        }
        
        const response = await apiClient.post('/api/applications', payload);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save application');
        }
        
        setForm({ 
            status: 'Applied', 
            title: 'Unknown', 
            location: 'Unknown', 
            positionLevel: 'Unknown', 
            company: '', 
            jobUrl: '', 
            notes: '' 
        });
        setSelectedJobTitleId('');
        onSaved?.();
    } catch (error) {
        console.error('Failed to save application:', error);
        alert('Failed to save application. Please try again.');
    } finally {
        setLoading(false);
    }
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
                    • {s.title || 'Unknown title'} — {s.status || 'Unknown status'}{s.createdAt ? ` — ${tsToDate(s.createdAt).toLocaleDateString()}` : ''}
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
            <select 
                className="border rounded px-2 py-1 flex-1" 
                value={selectedJobTitleId} 
                onChange={e => {
                    const id = e.target.value;
                    setSelectedJobTitleId(id);
                    if (id) {
                        const selectedTitle = jobTitles.find(jt => jt.id === id);
                        if (selectedTitle) {
                            update('title', selectedTitle.title);
                        }
                    } else {
                        update('title', '');
                    }
                }}
            >
                <option value="">Select or enter custom...</option>
                {jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.title}</option>)}
            </select>
            <button 
                type="button"
                onClick={() => setShowJobTitleManager(!showJobTitleManager)}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
                Manage
            </button>
        </div>
        
        {/* Custom title text input (shown when no job title selected) */}
        {!selectedJobTitleId && (
            <input 
                className="w-full border rounded px-3 py-2" 
                placeholder="Or enter custom job title..." 
                value={form.title||''} 
                onChange={e=>update('title', e.target.value)} 
            />
        )}
        
        {/* Job Title Management Panel */}
        {showJobTitleManager && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Manage Job Titles</h4>
                
                {/* Add new job title */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="New job title..."
                        value={newJobTitle}
                        onChange={(e) => setNewJobTitle(e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addJobTitle()}
                    />
                    <button
                        type="button"
                        onClick={addJobTitle}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                        Add
                    </button>
                </div>
                
                {/* Existing job titles */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {jobTitles.map((jt) => (
                        <div key={jt.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                            {editingJobTitle?.id === jt.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editingJobTitle.title}
                                        onChange={(e) => setEditingJobTitle({...editingJobTitle, title: e.target.value})}
                                        className="flex-1 border rounded px-2 py-1 text-sm"
                                        onKeyPress={(e) => e.key === 'Enter' && updateJobTitle(jt.id, editingJobTitle.title)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateJobTitle(jt.id, editingJobTitle.title)}
                                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingJobTitle(null)}
                                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-sm">{jt.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => setEditingJobTitle(jt)}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteJobTitle(jt.id)}
                                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    {jobTitles.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No custom job titles yet. Add some above!
                        </p>
                    )}
                </div>
            </div>
        )}
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
            {['Applied','Saved','OA','Screen','Tech','Onsite','Offer','Accepted','No response','Rejected', 'Closed'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        {/* NEW: Notes */}
        <textarea className="w-full border rounded px-3 py-2 h-28" placeholder="Notes (e.g., who referred you, follow-up details)" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} />
        <button disabled={loading} onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">{loading? 'Saving...' : 'Save'}</button>
    </div>
);
}