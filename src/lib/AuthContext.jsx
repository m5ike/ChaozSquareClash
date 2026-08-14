import { createContext, useContext, useState, useEffect } from 'react';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client.js';
import { getAccessToken } from '@base44/sdk/dist/utils/auth-utils.js';
import { base44, auth } from '@/api/base44Client.js';

// Parametry aplikace — appId sdílíme s base44 klientem; access token může
// přijít v URL (?access_token=...), uloží se do localStorage a z URL se smaže.
const appParams = {
  appId: base44.getConfig().appId,
  token: getAccessToken(),
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  // Ověří stav aplikace (veřejná nastavení) a případně přihlášeného uživatele
  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      // Původní nasazení volá same-origin ("/api/apps/public" na *.base44.app);
      // lokálně míříme na platformní API dle serverUrl z konfigurace SDK.
      const serverUrl = base44.getConfig().serverUrl || 'https://base44.app';
      const publicClient = createAxiosClient({
        baseURL: `${serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId,
        },
        token: appParams.token,
        interceptResponses: true,
      });
      try {
        const settings = await publicClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(settings);
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (error) {
        console.error('App state check failed:', error);
        if (error.status === 403 && error.data?.extra_data?.reason) {
          const reason = error.data.extra_data.reason;
          setAuthError(
            reason === 'auth_required'
              ? { type: 'auth_required', message: 'Authentication required' }
              : reason === 'user_not_registered'
                ? { type: 'user_not_registered', message: 'User not registered for this app' }
                : { type: reason, message: error.message }
          );
        } else {
          setAuthError({ type: 'unknown', message: error.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // Načte aktuálního uživatele přes base44.auth.me()
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      auth.logout(window.location.href);
    } else {
      auth.logout();
    }
  };

  const navigateToLogin = () => {
    auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Obrazovka pro uživatele, který nemá k aplikaci přístup
export const UserNotRegistered = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
    <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
        <p className="text-slate-600 mb-8">
          You are not registered to use this application. Please contact the app administrator to request access.
        </p>
        <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
          <p>If you believe this is an error, you can:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Verify you are logged in with the correct account</li>
            <li>Contact the app administrator for access</li>
            <li>Try logging out and back in again</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);
