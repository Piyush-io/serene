import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth-config';

// This handler redirects any requests to the old Auth0 callback URL to the new signin page
export async function GET(request: NextRequest) {
  console.log('Redirecting from deprecated Auth0 callback to Firebase auth');
  // Create redirect response
  return NextResponse.redirect(new URL(authConfig.firebase.signInUrl, request.nextUrl.origin));
} 