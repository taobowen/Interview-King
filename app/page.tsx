// Dashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import CountsMultiPeriod from '@/components/Charts/CountsMultiPeriod';
import StatusUpdatesTimeline from '@/components/Charts/StatusUpdatesTimeline';
import FunnelByStatus from '@/components/Charts/FunnelByStatus';
import ApplicationSankey from '@/components/Charts/ApplicationSankey';
import KPIs from '@/components/KPI';
import { useUser } from '@/lib/useUser';
import { ChartErrorBoundary } from '@/components/Charts/ChartErrorBoundary';

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
      setEvents(eventsData.statusEvents || []);
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
  
  if (!uid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            <h1 className="text-5xl sm:text-6xl font-bold text-white">
              Master Your Job Search
            </h1>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Track applications, monitor progress, and win your dream job with intelligent analytics and insights.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Get Started Today
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Application Tracking</h3>
              <p className="text-purple-200">
                Keep all your job applications in one place. Track company names, positions, status, and interview progress effortlessly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                📈
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Analytics & Insights</h3>
              <p className="text-purple-200">
                Visualize your job search funnel with interactive charts. See conversion rates, application trends, and interview success metrics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all relative">
              <div className="absolute top-4 right-4 bg-yellow-500/80 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                BETA
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                📧
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Auto Status Updates</h3>
              <p className="text-purple-200">
                Smart Gmail crawling service that automatically updates your application status based on HR feedback emails. Coming soon!
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                🎯
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Interview Tracking</h3>
              <p className="text-purple-200">
                Monitor your interview pipeline from initial application to final offer. Track interview rounds and outcomes.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                📅
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Timeline View</h3>
              <p className="text-purple-200">
                See when companies responded and how your job search evolved over time with detailed status update timelines.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-2xl mb-4">
                💼
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bulk Import</h3>
              <p className="text-purple-200">
                Quickly import your existing applications with our bulk import feature. Get started tracking in minutes.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold text-white text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sign Up</h3>
              <p className="text-purple-200">Create your free account in seconds with email or social login.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track Your Applications</h3>
              <p className="text-purple-200">Add jobs you've applied to with company details and status.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-2">View Insights</h3>
              <p className="text-purple-200">Analyze your progress with interactive dashboards and metrics.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-12 border border-purple-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your job search?</h2>
            <p className="text-purple-200 mb-8">Join thousands of job seekers achieving their goals with Interview King.</p>
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              Start Your Journey
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-purple-200 text-sm">
            <p>Interview King © 2026. Your personal job search intelligence platform.</p>
          </div>
        </div>
      </div>
    );
  }
  
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
        <ChartErrorBoundary>
          <ApplicationSankey apps={apps} events={events} title="Overall application progress (Sankey)" />
        </ChartErrorBoundary>
        <ChartErrorBoundary>
          <ApplicationSankey apps={apps} events={events} recentDays={30} title="Recent 30 days application progress (Sankey)" />
        </ChartErrorBoundary>
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
