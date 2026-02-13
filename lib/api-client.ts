// lib/api-client.ts
import { auth } from './firebase';

// Helper to make authenticated API requests
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get current user's ID token
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch (error) {
    console.error('Failed to get ID token:', error);
    throw new Error('Failed to authenticate request');
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
      // Token might be expired, try to refresh
      const refreshedToken = await user.getIdToken(true); // Force refresh
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