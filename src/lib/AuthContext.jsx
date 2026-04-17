import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams, refreshAppParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    // Ensure token from URL is captured into storage before any auth check
    refreshAppParams();
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      refreshAppParams();
      const tokenToUse = appParams.token;

      // Check app public settings
      try {
        const appClient = createAxiosClient({
          baseURL: `/api/apps/public`,
          headers: { 'X-App-Id': appParams.appId },
          token: tokenToUse,
          interceptResponses: true
        });
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
      } catch (appError) {
        console.error('App state check failed:', appError);
        const reason = appError?.data?.extra_data?.reason;
        if (reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else if (reason === 'auth_required' && !tokenToUse) {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
        // Otherwise: continue and let auth check validate the token
      }

      // Always check user auth if we have a token, regardless of publicSettings result
      if (tokenToUse) {
        await checkUserAuth();
      } else {
        setIsAuthenticated(false);
        if (!authError) {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
    } finally {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const clearStoredTokens = () => {
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('base44_access_token');
      sessionStorage.removeItem('token');
    } catch (e) {}
    appParams.token = null;
  };

  const checkUserAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      const reason = error?.data?.extra_data?.reason;
      if (reason === 'user_not_registered') {
        setAuthError({ type: 'user_not_registered', message: error.message });
      } else {
        // Token is invalid/expired — clear it so the app can redirect to login
        clearStoredTokens();
        setAuthError({ type: 'auth_required', message: error.message || 'Authentication required' });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    // Clear our own storage used by app-params
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('base44_access_token');
      sessionStorage.removeItem('token');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }

    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};