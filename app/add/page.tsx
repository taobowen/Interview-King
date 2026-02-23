'use client';
import ApplicationForm from '../../components/ApplicationForm';
import { useUser } from '../../lib/useUser';
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';

export default function AddPage() {
    const { uid, loading } = useUser();
    const [last12hCount, setLast12hCount] = useState(0);

    const fetchRecentCount = async () => {
        if (!uid) return;
        
        try {
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            
            const response = await authenticatedFetch(`/api/applications`);
            
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

    useEffect(() => {
        fetchRecentCount();
    }, [uid]);

    const handleApplicationSaved = () => {
        // Refetch the count when a new application is saved
        fetchRecentCount();
    };

    if (loading) return <p className="text-slate-600">Loading…</p>;
    return (
        <div className="max-w-xl">
            <h1 className="text-xl font-semibold mb-1">Add a Job</h1>
            <p className="text-xs text-slate-500 mb-3">
                Submitted in last 12h: <span className="font-semibold">{last12hCount}</span>
            </p>
            <p className="text-sm text-slate-600 mb-4">Paste a job URL and basic info. (Auto‑metadata can be wired to a Cloud Function later.)</p>
            <ApplicationForm uid={uid ?? undefined} onSaved={handleApplicationSaved} />
        </div>
    );
}