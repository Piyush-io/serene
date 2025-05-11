'use client';

import { FirebaseAuthProvider } from './firebase-auth-provider';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
} 