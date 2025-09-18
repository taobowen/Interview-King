'use client';
import ApplicationForm from '../../components/ApplicationForm';
import { useUser } from '../../lib/useUser';


export default function AddPage() {
    const { uid, loading } = useUser();
    if (loading) return <p className="text-slate-600">Loading…</p>;
    return (
        <div className="max-w-xl">
            <h1 className="text-xl font-semibold mb-3">Add a Job</h1>
            <p className="text-sm text-slate-600 mb-4">Paste a job URL and basic info. (Auto‑metadata can be wired to a Cloud Function later.)</p>
            <ApplicationForm uid={uid} />
        </div>
    );
}