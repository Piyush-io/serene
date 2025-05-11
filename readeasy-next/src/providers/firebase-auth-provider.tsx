import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { 
  onAuthStateChange, 
  signInUser, 
  signInWithGoogle, 
  signOutUser, 
  registerUser,
  resetPassword,
  getCurrentUser
} from '@/lib/firebase/auth';

// Constants for localStorage keys
const AUTH_TOKEN_STORAGE_KEY = "readeasy_auth_token";

// Types
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGooglePopup: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signInWithGooglePopup: async () => {},
  signUp: async () => {},
  logOut: async () => {},
  sendPasswordReset: async () => {},
});

// Hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Set server-side session cookie
async function setSessionCookie(user: User): Promise<void> {
  try {
    console.log("Setting session cookie for user:", user.uid);
    
    // Get the Firebase token and store it in localStorage for API calls
    const token = await user.getIdToken(true);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    console.log("Firebase token stored in localStorage");
    console.log("Token begins with:", token.substring(0, 10) + "...");

    // Debug: Log token structure
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      console.log("Token payload keys:", Object.keys(tokenPayload));
      console.log("Token has uid?", !!tokenPayload.uid);
      console.log("Token has sub?", !!tokenPayload.sub);
      console.log("Token user_id:", tokenPayload.user_id);
      // Add the user ID to sessionStorage for backup access
      sessionStorage.setItem('current_user_id', user.uid);
    } catch (e) {
      console.error("Failed to parse token payload:", e);
    }
    
    // Send user data to set cookie
    const response = await fetch('/api/auth/set-cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Include the token in the header
      },
      body: JSON.stringify({ 
        user: {
          uid: user.uid,
          email: user.email
        }
      }),
    });
    
    if (!response.ok) {
      console.error("Failed to set session cookie, status:", response.status);
      // Don't throw - we want to continue even if cookie setting fails
      console.log("Continuing authentication flow despite cookie error");
      return; // Exit function without throwing
    }
    
    console.log("Session cookie set successfully");
  } catch (error) {
    console.error('Error setting session cookie:', error);
    // Don't throw - we want to continue even if cookie setting fails
    console.log("Continuing authentication flow despite cookie error");
    return; // Exit function without throwing
  }
}

// Clear server-side session cookie
async function clearSessionCookie(): Promise<void> {
  try {
    console.log("Clearing session cookie");
    // Remove token from localStorage
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    console.log("Firebase token removed from localStorage");
    
    await fetch('/api/auth/set-cookie', {
      method: 'DELETE',
    });
    console.log("Session cookie cleared successfully");
  } catch (error) {
    console.error('Error clearing session cookie:', error);
    // Continue anyway - don't block logout process
  }
}

// Provider component
export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start loading
  const [error, setError] = useState<string | null>(null);
  const [cookieSetAttempted, setCookieSetAttempted] = useState(false);
  let isMounted = true; // Define isMounted at the component level

  // Setup auth state observer on mount
  useEffect(() => {
    console.log("Setting up Firebase auth state observer");
    isMounted = true; // Set to true on mount
    
    const unsubscribe = onAuthStateChange(async (authUser) => {
      console.log("Auth state changed:", authUser ? `User: ${authUser.uid}` : "No user");
      
      if (isMounted) {
        setUser(authUser); // Update user state immediately
        
        if (authUser) {
          // User is signed in, attempt to set cookie
          setCookieSetAttempted(false); // Reset attempt flag
          setLoading(true); // Enter loading state while setting cookie
          await setSessionCookie(authUser);
          setCookieSetAttempted(true);
          if(isMounted) setLoading(false); // Exit loading state after attempt
        } else {
          // User is signed out, clear cookie
          setCookieSetAttempted(false); // Reset attempt flag
          setLoading(true); // Enter loading state while clearing cookie
          await clearSessionCookie();
          setCookieSetAttempted(true);
           if(isMounted) setLoading(false); // Exit loading state after attempt
        }
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false; // Set to false on unmount
      unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true); // Set loading before sign-in attempt
      setError(null);
      const user = await signInUser(email, password);
      // Auth state change observer will handle setting the cookie
      // setLoading(false) will be handled by the observer effect
    } catch (err: any) {
      setError(err.message);
       if(isMounted) setLoading(false); // Ensure loading stops on error
      throw err;
    } 
  };

  // Sign in with Google
  const signInWithGooglePopup = async () => {
    try {
      setLoading(true); // Set loading before sign-in attempt
      setError(null);
      const user = await signInWithGoogle();
      // Auth state change observer will handle setting the cookie
      // setLoading(false) will be handled by the observer effect
    } catch (err: any) {
      setError(err.message);
      if(isMounted) setLoading(false); // Ensure loading stops on error
      throw err;
    } 
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true); // Set loading before sign-up attempt
      setError(null);
      const user = await registerUser(email, password);
      // Auth state change observer will handle setting the cookie
       // setLoading(false) will be handled by the observer effect
    } catch (err: any) {
      setError(err.message);
      if(isMounted) setLoading(false); // Ensure loading stops on error
      throw err;
    } 
  };

  // Sign out
  const logOut = async () => {
    try {
      setLoading(true); // Set loading before sign-out attempt
      setError(null);
      await signOutUser();
      // Auth state change observer will handle clearing the cookie
       // setLoading(false) will be handled by the observer effect
    } catch (err: any) {
      setError(err.message);
       if(isMounted) setLoading(false); // Ensure loading stops on error
      throw err;
    } 
  };

  // Send password reset email
  const sendPasswordReset = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await resetPassword(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    // Adjust loading state: only be non-loading if auth state is determined AND cookie attempt finished
    loading: loading || !cookieSetAttempted, 
    error,
    signIn,
    signInWithGooglePopup,
    signUp,
    logOut,
    sendPasswordReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 