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
    // Ensure we pick up any access_token present in the URL (e.g. after email/password login redirect)
    // before running the initial auth check. This fixes cases where the token arrives after module init.
    refreshAppParams();
    checkAppState();
    
    // Also recheck auth state when token in storage changes (after login redirect)
    const handleStorageChange = () => {
      refreshAppParams();
      checkAppState();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Refresh params to get fresh token from URL (after login)
      refreshAppParams();
      const tokenToUse = appParams.token;
      
      console.log('[AUTH DEBUG] checkAppState start', {
        hasToken: !!tokenToUse,
        tokenPreview: tokenToUse ? tokenToUse.substring(0, 20) + '...' : null,
        url: window.location.href,
        hasUrlToken: window.location.search.includes('access_token'),
      });
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: tokenToUse, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        console.log('[AUTH DEBUG] public settings OK', { hasToken: !!tokenToUse });
        setAppPublicSettings(publicSettings);
        setAuthError(null); // Clear any previous errors
        
        // If we got the app public settings successfully, check if user is authenticated
        if (tokenToUse) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('[AUTH DEBUG] App state check failed:', {
          status: appError.status,
          message: appError.message,
          data: appError.data,
          reason: appError.data?.extra_data?.reason,
        });
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else if (appError.status === 401 || appError.status === 403) {
          // Token expired, invalid, or auth check failed - try to validate user with token
          if (tokenToUse) {
            // Try to validate the user with the token we have
            await checkUserAuth();
          } else {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
          }
          setIsLoadingPublicSettings(false);
          return;
        } else {
          // Don't set generic unknown error - just fail silently
          setAuthError(null);
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      console.log('[AUTH DEBUG] auth.me success', { email: currentUser?.email, role: currentUser?.role });
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('[AUTH DEBUG] User auth check failed:', {
        status: error.status,
        message: error.message,
        data: error.data,
        reason: error.data?.extra_data?.reason,
      });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // Only set error if there's a specific reason from the backend
      if (error.status === 401 || error.status === 403) {
        if (error.data?.extra_data?.reason) {
          setAuthError({
            type: error.data.extra_data.reason,
            message: error.message
          });
        }
        // Otherwise don't set error — let it be null until we explicitly need auth
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