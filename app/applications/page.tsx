'use client';
import ApplicationTable from '../../components/ApplicationTable';
import { useUser } from '../../lib/useUser';


export default function ApplicationsPage() {
    const { uid, loading } = useUser();
    if (!uid) return <p className="text-slate-600">Sign in to manage your applications.</p>;
    if (loading) return <p className="text-slate-600">Loading…</p>;
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Applications</h1>
                <a href="/add" className="px-3 py-2 rounded bg-blue-600 text-white">Add</a>
            </div>
            <ApplicationTable />
        </div>
    );
}