// auth-store.ts
// A simple in-memory cache. 
// Keys = requestId, Values = { status, user?, token?, error? }

interface AuthState {
  status: 'pending' | 'success' | 'error';
  user?: any;
  token?: string;
  error?: string;
  timestamp: number;
}

const store = new Map<string, AuthState>();

export const authStore = {
  // Create a pending entry
  init: (id: string) => {
    store.set(id, { status: 'pending', timestamp: Date.now() });
    
    // Auto-cleanup: Delete this entry after 5 minutes to prevent memory leaks
    setTimeout(() => store.delete(id), 5 * 60 * 1000); 
  },

  // Save success data
  success: (id: string, user: any, token: string) => {
    store.set(id, { status: 'success', user, token, timestamp: Date.now() });
  },

  // Save error
  fail: (id: string, error: string) => {
    store.set(id, { status: 'error', error, timestamp: Date.now() });
  },

  // Retrieve and delete (one-time use)
  get: (id: string) => {
    return store.get(id);
  },
  
  // Cleanup
  delete: (id: string) => store.delete(id)
};