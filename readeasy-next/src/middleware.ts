import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-fallback-secret-key-minimum-32-chars'
);

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  console.log(`[Middleware] Processing ${request.nextUrl.pathname}`);
  
  // Log all cookies received by the middleware
  console.log('[Middleware] Cookies received:', request.cookies.getAll());
  
  // Get session cookie
  const session = request.cookies.get('session');
  console.log(`[Middleware] Session cookie found:`, session ? 'Yes' : 'No');
  
  // Public paths that don't require auth
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/api/auth/set-cookie', // API route for setting cookie should be public
  ];
  
  // Check if the current path is a public path or a static asset
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path) || 
                       request.nextUrl.pathname.startsWith('/images/') || 
                       request.nextUrl.pathname.startsWith('/_next/') ||
                       request.nextUrl.pathname.includes('.'); // Basic check for static files (e.g., favicon.ico)

  // If path is public, let it through regardless of auth state
  if (isPublicPath) {
    console.log(`[Middleware] Public path: ${request.nextUrl.pathname}, allowing through`);
    return NextResponse.next();
  }
  
  // If no session and trying to access protected route, redirect to login
  if (!session) {
    console.log(`[Middleware] No session found for protected route ${request.nextUrl.pathname}, redirecting to login`);
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('returnTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(session.value, secret);
    console.log(`[Middleware] Session verified for user: ${payload.uid}`);
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Invalid session token:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('returnTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    // Apply middleware to all routes except API routes needed for auth setup
    // Match all paths except specific public ones and static assets
    '/((?!api/auth/set-cookie|_next/static|_next/image|images|favicon.ico|auth).*)',
    // Explicitly include protected paths to ensure they are covered
    '/dashboard/:path*',
    '/document/:path*',
    '/settings/:path*',
    '/api/protected/:path*',
  ],
}; 