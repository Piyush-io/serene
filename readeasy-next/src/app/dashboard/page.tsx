'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/firebase-auth-provider";
import { authConfig } from "@/lib/auth-config";
import { Button } from '@/components/ui/button';

// Proper viewport export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function DashboardPage() {
  const { user, logOut, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fade-in animation on initial load
  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 300);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isClient && !loading) {
      console.log("Auth state in dashboard:", { user, loading });
      
      // Set auth checked to prevent multiple redirects
      if (!authChecked) {
        setAuthChecked(true);
        
        if (!user) {
          console.log("No user found, redirecting to sign in page");
          // Use window.location for more reliable redirect
          setTimeout(() => {
            window.location.href = '/auth/signin';
          }, 500);
        } else {
          console.log("User authenticated, staying on dashboard");
        }
      }
    }
  }, [isClient, loading, user, authChecked]);

  const handleSignOut = async () => {
    try {
      await logOut();
      console.log("User logged out, redirecting to home page");
      // Use window.location for more reliable redirect
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Only show loading state if truly loading, not if we're about to redirect
  if ((loading && !authChecked) || !isClient) {
    return (
      <div className="min-h-screen w-full bg-[#f5f5f0] flex justify-center items-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  // If auth check is done but no user is present, show a message before redirect happens
  if (authChecked && !user) {
    return (
      <div className="min-h-screen w-full bg-[#f5f5f0] flex justify-center items-center">
        <div className="text-center">
          <div className="text-xl mb-4">Please log in to access the dashboard</div>
          <div className="text-sm">Redirecting to login page...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f5f5f0] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#e6e6d8] rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#e6e6d8] rounded-full blur-3xl"></div>
      
      {/* Content */}
      <div className="container mx-auto px-4 min-h-screen flex flex-col">
        {/* Navigation */}
        <div className={`py-6 flex justify-between items-center transition-all duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <Link href="/" className="text-2xl font-bold text-black flex items-center space-x-1">
            <span>Serene</span>
            <div className="h-2 w-2 bg-primary rounded-full mt-1"></div>
          </Link>
          <Button 
                variant="outline"
                onClick={handleSignOut}
                className="text-sm font-medium bg-white border-border hover:bg-card hover:text-red-500 hover:border-red-200 transition-all duration-300 rounded-full py-2 px-5 flex items-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
        </div>
        
        {/* Main content */}
        <div className="flex-1 py-12">
          {/* Header section */}
          <div className={`mb-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-black">
              Welcome, <span className="text-[#8B7355]">{user?.displayName || 'Reader'}</span>
            </h1>
            <p className="text-xl text-black/75 max-w-2xl">
              Manage your documents and customize your reading experience. Upload new content to get started.
            </p>
          </div>
          
          {/* Dashboard sections - simplified */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-1000 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* Upload new document section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#e6e6d8] p-8">
              <h2 className="text-2xl font-semibold mb-6">Get Started</h2>
              <p className="text-black/75 mb-6">
                Upload a document to begin your simplified reading experience with Serene.
              </p>
              <Link 
                href="/"
                className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-black text-white hover:bg-black/80 transition-colors"
              >
                Upload New Document
              </Link>
            </div>
            
            {/* Account section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#e6e6d8] p-8">
              <h2 className="text-2xl font-semibold mb-6">Account</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-black/60">Email</h3>
                  <p>{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 