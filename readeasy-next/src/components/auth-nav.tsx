'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { authConfig } from '@/lib/auth-config';
import { useAuth } from '@/providers/firebase-auth-provider';
import { useRouter } from 'next/navigation';

export function AuthNav() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logOut();
      router.push(authConfig.logoutRedirectUrl);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link 
          href={authConfig.loginRedirectUrl} 
          className="hover:underline text-sm"
        >
          Dashboard
        </Link>
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="w-8 h-8 rounded-full"
          />
        )}
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 text-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <Link 
      href={authConfig.firebase.signInUrl} 
      className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 text-sm"
    >
      Sign In
    </Link>
  );
} 