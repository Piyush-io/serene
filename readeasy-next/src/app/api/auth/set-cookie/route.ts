import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
// Remove Firebase Admin import
// import { adminAuth } from '@/lib/firebase/firebase-admin';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-fallback-secret-key-minimum-32-chars'
);

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Processing set-cookie request');
    const { user } = await request.json();
    
    if (!user || !user.uid) {
      console.error('[API] User data is missing');
      return NextResponse.json({ error: 'User data is required' }, { status: 400 });
    }
    
    // Create a JWT token
    const token = await new SignJWT({ 
      uid: user.uid,
      email: user.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('14d') // 2 weeks
      .sign(secret);
    
    // Create a response with the token
    const response = NextResponse.json({ 
      success: true,
      message: 'Session cookie set successfully'
    });
    
    // Set cookie options
    const cookieOptions = {
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 14 // 2 weeks
    };
    
    // Set the session cookie
    response.cookies.set(cookieOptions);
    
    return response;
  } catch (error: any) {
    console.error('[API] Error in auth endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Session cookie cleared successfully'
  });
  
  // Clear the session cookie
  response.cookies.delete('session');
  
  return response;
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, {
    status: 204,
  });
  
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
} 