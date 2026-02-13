// Dashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import CountsMultiPeriod from '@/components/Charts/CountsMultiPeriod';
import StatusUpdatesTimeline from '@/components/Charts/StatusUpdatesTimeline';
import FunnelByStatus from '@/components/Charts/FunnelByStatus';
import ApplicationSankey from '@/components/Charts/ApplicationSankey';
import KPIs from '@/components/KPI';
import { useUser } from '@/lib/useUser';

export default function Dashboard() {
  const [apps, setApps] = useState<ApplicationDoc[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uid, loading: userLoading } = useUser();

  const fetchData = async () => {
    if (!uid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [appsResponse, eventsResponse] = await Promise.all([
        apiClient.get('/api/applications'),
        apiClient.get('/api/status-events')
      ]);
      
      if (!appsResponse.ok || !eventsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const appsData = await appsResponse.json();
      const eventsData = await eventsResponse.json();
      
      setApps(appsData.applications || []);
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Poll for updates every 5 minutes (less aggressive)
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [uid]);

  if (userLoading) return <p className="text-slate-600">Loading…</p>;
  if (!uid) return <p className="text-slate-600">Please sign in to view your dashboard.</p>;
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-600">Loading dashboard data...</p>
        </div>
      )}
      
      <KPIs apps={apps} events={events} />
      <div className="grid md:grid-cols-2 gap-6">
        <ApplicationSankey apps={apps} events={events} title="Overall application progress (Sankey)" />
        <ApplicationSankey apps={apps} events={events} recentDays={30} title="Recent 30 days application progress (Sankey)" />
      </div>
      <CountsMultiPeriod apps={apps} />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Application Status Distribution</h3>
          <FunnelByStatus apps={apps} />
        </div>
        <StatusUpdatesTimeline events={events} />
      </div>
    </div>
  );
}
