import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth-config';

// This handler redirects any requests to the old Auth0 logout URL to the home page
// After redirecting, users will see the UI in logged-out state
export async function GET(request: NextRequest) {
  console.log('Redirecting from deprecated Auth0 logout to home page');
  
  // Create redirect response - redirect to home page after logout
  return NextResponse.redirect(new URL(authConfig.logoutRedirectUrl, request.nextUrl.origin));
} 