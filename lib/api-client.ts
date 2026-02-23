'use client';

// lib/api-client.ts
import { fetchAuthSession } from 'aws-amplify/auth';

// Helper to make authenticated API requests to Next.js API routes
// Uses access_token (recommended for API authorization)
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get current user's access token from Amplify (access_token for API authorization)
  let token: string;
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    token = accessToken; // Using access_token for API authorization
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw new Error('User not authenticated');
  }

  // Prepare headers with Authorization token
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Make the authenticated request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle authentication errors with token refresh
  if (response.status === 401) {
    try {
      // Token might be expired, try to refresh by getting a new session
      const refreshedSession = await fetchAuthSession({ forceRefresh: true });
      const refreshedToken = refreshedSession.tokens?.accessToken?.toString();
      
      if (!refreshedToken) {
        throw new Error('Failed to refresh token');
      }
      
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          'Authorization': `Bearer ${refreshedToken}`,
        },
      });
      
      if (retryResponse.status === 401) {
        throw new Error('Authentication failed - please sign in again');
      }
      
      return retryResponse;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw new Error('Authentication failed - please sign in again');
    }
  }

  return response;
}

// Convenience methods for common HTTP operations
export const apiClient = {
  get: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { method: 'GET', ...options }),
    
  post: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
    
  put: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
    
  patch: (url: string, data?: any, options?: RequestInit) => 
    authenticatedFetch(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
    
  delete: (url: string, options?: RequestInit) => 
    authenticatedFetch(url, { method: 'DELETE', ...options }),
};

export default apiClient;