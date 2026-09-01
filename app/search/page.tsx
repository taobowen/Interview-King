'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useUser } from '@/lib/useUser';
import { apiClient } from '@/lib/api-client';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import AppStatusTimeline from '@/components/Charts/AppStatusTimeLine';
import StatusBadge from '@/components/StatusBadge';

type SearchApp = ApplicationDoc & {
  titleText?: string;
  appliedDate?: string;
  notes?: string;
  jobUrl?: string;
};

type JobPreview = {
  url: string;
  ok: boolean;
  title: string | null;
  text: string | null;
  error?: string;
};

type ResultCard = {
  app: SearchApp;
  events: StatusEvent[];
  preview: JobPreview | null;
};

function formatDate(value?: string | Date | null): string {
  if (!value) return 'Unknown';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Unknown';
  return dt.toLocaleDateString();
}

export default function CompanySearchPage() {
  const { uid, loading: userLoading } = useUser();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultCard[]>([]);

  const heading = useMemo(() => {
    if (!query.trim()) return 'Search a company';
    return `${results.length} role${results.length === 1 ? '' : 's'} at ${query.trim()}`;
  }, [query, results.length]);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    const company = query.trim();
    if (!company || !uid) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchRes = await apiClient.get(`/api/applications/search?company=${encodeURIComponent(company)}&limit=50`);
      if (!searchRes.ok) throw new Error('Failed to search applications');
      const searchJson = await searchRes.json();
      const apps: SearchApp[] = searchJson.applications || [];

      const cards = await Promise.all(apps.map(async (app) => {
        const eventsRes = await apiClient.get(`/api/status-events/by-app?appId=${app.id}`);
        const eventsJson = eventsRes.ok ? await eventsRes.json() : { statusEvents: [] };
        const events: StatusEvent[] = eventsJson.statusEvents || [];

        let preview: JobPreview | null = null;
        if (app.jobUrl) {
          try {
            const previewRes = await fetch(`/api/job-preview?url=${encodeURIComponent(app.jobUrl)}`);
            preview = await previewRes.json();
          } catch {
            preview = { url: app.jobUrl, ok: false, title: null, text: null, error: 'preview failed' };
          }
        }

        return { app, events, preview };
      }));

      setResults(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-slate-500">Loading…</div>;
  }

  if (!uid) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-slate-600">Sign in to search your interview history.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">What happened with this company?</h1>
      <p className="mt-2 text-slate-600">
        Type a company name. You get every application, the status timeline, and whatever job description we can recover from the posting link.
      </p>

      <form onSubmit={onSearch} className="mt-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Company name"
          className="w-full rounded-xl border border-slate-300 px-5 py-4 text-xl shadow-sm focus:border-slate-900 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-4 rounded-lg bg-slate-900 px-5 py-2.5 text-white disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="mt-4 text-rose-600">{error}</p>}

      <div className="mt-10 space-y-8">
        {results.length > 0 && <h2 className="text-lg font-medium text-slate-800">{heading}</h2>}
        {results.map(({ app, events, preview }) => (
          <article key={app.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{app.title || app.titleText || 'Untitled role'}</h3>
                <p className="text-slate-600">{app.company}{app.location ? ` · ${app.location}` : ''}</p>
              </div>
              <StatusBadge value={app.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <dt className="text-slate-500">Applied / created</dt>
                <dd>{formatDate(app.appliedDate || app.appliedAt || app.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last status update</dt>
                <dd>{formatDate(app.statusUpdatedAt || app.lastActionAt)}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <h4 className="mb-2 text-sm font-medium text-slate-700">Interview process</h4>
              <AppStatusTimeline app={app} events={events} />
            </div>

            <div className="mt-5">
              <h4 className="mb-2 text-sm font-medium text-slate-700">Job description</h4>
              {app.jobUrl && (
                <a href={app.jobUrl} target="_blank" rel="noreferrer" className="break-all text-sm text-blue-700 underline">
                  {app.jobUrl}
                </a>
              )}
              {preview?.title && <p className="mt-2 font-medium">{preview.title}</p>}
              {preview?.text ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.text}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  {app.notes || 'No posting text available. The job link is the best source if it is still live.'}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
