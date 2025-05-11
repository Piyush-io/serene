import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth-config';

// This handler redirects any requests to the old Auth0 login URL to the new Firebase signin page
export async function GET(request: NextRequest) {
  console.log('Redirecting from deprecated Auth0 login to Firebase auth');
  
  // Get returnTo parameter if it exists
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const redirectUrl = new URL(authConfig.firebase.signInUrl, request.nextUrl.origin);
  
  // Preserve returnTo parameter if it exists
  if (returnTo) {
    redirectUrl.searchParams.set('returnTo', returnTo);
  }
  
  // Create redirect response
  return NextResponse.redirect(redirectUrl);
} 