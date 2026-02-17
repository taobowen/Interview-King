'use client';
import ApplicationForm from '../../components/ApplicationForm';
import { useUser } from '../../lib/useUser';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase.client';

export default function AddPage() {
    const { uid, loading } = useUser();
    const [last12hCount, setLast12hCount] = useState(0);

    useEffect(() => {
        if (!uid) return;
        
        const fetchRecentCount = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                
                const token = await user.getIdToken();
                const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
                
                const response = await fetch(`/api/applications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Filter applications from last 12 hours
                    const recentApps = data.applications.filter((app: any) => 
                        new Date(app.createdAt) > twelveHoursAgo
                    );
                    setLast12hCount(recentApps.length);
                }
            } catch (error) {
                console.error('Error fetching recent applications:', error);
            }
        };
        
        fetchRecentCount();
    }, [uid]);

    if (loading) return <p className="text-slate-600">Loading…</p>;
    return (
        <div className="max-w-xl">
            <h1 className="text-xl font-semibold mb-1">Add a Job</h1>
            <p className="text-xs text-slate-500 mb-3">
                Submitted in last 12h: <span className="font-semibold">{last12hCount}</span>
            </p>
            <p className="text-sm text-slate-600 mb-4">Paste a job URL and basic info. (Auto‑metadata can be wired to a Cloud Function later.)</p>
            <ApplicationForm uid={uid ?? undefined} />
        </div>
    );
}