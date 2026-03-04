'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ width: '100%', height: '24rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', border: '1px solid #fee2e2', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#fef2f2' }}>
          <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠️ Chart Rendering Error</span>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {this.state.error?.message || 'An error occurred while rendering this chart'}
          </span>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
