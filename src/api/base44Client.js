import { createClient } from '@base44/sdk';
import { appParams, refreshAppParams } from '@/lib/app-params';

// Create a client that dynamically gets the token from appParams
// This ensures the token is always fresh, even after login
export const base44 = createClient({
  get appId() { return appParams.appId; },
  get token() { return appParams.token; },
  get functionsVersion() { return appParams.functionsVersion; },
  serverUrl: '',
  requiresAuth: true,
  get appBaseUrl() { return appParams.appBaseUrl; }
});