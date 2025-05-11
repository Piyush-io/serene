import { auth } from './firebase-config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken
} from 'firebase/auth';

// Register a new user with email and password
export const registerUser = async (email: string, password: string): Promise<User> => {
  try {
    console.log(`[Auth] Registering user: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`[Auth] User registered successfully: ${userCredential.user.uid}`);
    return userCredential.user;
  } catch (error: any) {
    console.error(`[Auth] Registration error:`, error);
    throw new Error(error.message || 'Failed to register user');
  }
};

// Sign in a user with email and password
export const signInUser = async (email: string, password: string): Promise<User> => {
  try {
    console.log(`[Auth] Signing in user: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`[Auth] User signed in successfully: ${userCredential.user.uid}`);
    
    // Force token refresh to ensure we have the latest auth state
    await userCredential.user.getIdToken(true);
    
    return userCredential.user;
  } catch (error: any) {
    console.error(`[Auth] Sign in error:`, error);
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    console.log(`[Auth] Initiating Google sign in`);
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    console.log(`[Auth] Google sign in successful: ${userCredential.user.uid}`);
    
    // Force token refresh
    await userCredential.user.getIdToken(true);
    
    return userCredential.user;
  } catch (error: any) {
    console.error(`[Auth] Google sign in error:`, error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

// Sign out the current user
export const signOutUser = async (): Promise<void> => {
  try {
    console.log(`[Auth] Signing out user`);
    await signOut(auth);
    console.log(`[Auth] User signed out successfully`);
  } catch (error: any) {
    console.error(`[Auth] Sign out error:`, error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

// Update user profile (display name and photo URL)
export const updateUserProfile = async (
  displayName?: string | null,
  photoURL?: string | null
): Promise<void> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }
    
    console.log(`[Auth] Updating profile for: ${auth.currentUser.uid}`);
    await updateProfile(auth.currentUser, {
      displayName: displayName || auth.currentUser.displayName,
      photoURL: photoURL || auth.currentUser.photoURL,
    });
    console.log(`[Auth] Profile updated successfully`);
  } catch (error: any) {
    console.error(`[Auth] Profile update error:`, error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    console.log(`[Auth] Sending password reset email to: ${email}`);
    await sendPasswordResetEmail(auth, email);
    console.log(`[Auth] Password reset email sent successfully`);
  } catch (error: any) {
    console.error(`[Auth] Password reset error:`, error);
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

// Get the current authenticated user (null if not authenticated)
export const getCurrentUser = (): User | null => {
  const user = auth.currentUser;
  console.log(`[Auth] getCurrentUser called:`, user ? `User: ${user.uid}` : 'No user');
  return user;
};

// Get user token
export const getUserToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log(`[Auth] getUserToken: No current user`);
      return null;
    }
    
    const token = await user.getIdToken();
    console.log(`[Auth] Token retrieved successfully`);
    return token;
  } catch (error) {
    console.error(`[Auth] getUserToken error:`, error);
    return null;
  }
};

// Wait for auth to initialize
export const waitForAuthInit = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      console.log(`[Auth] Auth initialized:`, user ? `User: ${user.uid}` : 'No user');
      resolve(user);
    });
  });
};

// Subscribe to auth state changes (for use in React context)
export const onAuthStateChange = (callback: (user: User | null) => void): () => void => {
  console.log(`[Auth] Setting up auth state change listener`);
  return onAuthStateChanged(auth, (user) => {
    console.log(`[Auth] Auth state changed:`, user ? `User: ${user.uid}` : 'No user');
    callback(user);
  });
}; 