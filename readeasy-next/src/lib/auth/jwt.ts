import { decode } from 'jsonwebtoken';

// JWT verification secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

/**
 * Decode a Firebase JWT token without verification
 * In a production environment, you should use Firebase Admin SDK to verify tokens
 * 
 * @param token - The Firebase ID token to decode
 * @returns The decoded token payload
 * @throws Error if the token is invalid
 */
export async function verifyJWT(token: string) {
  try {
    if (!token || token.trim() === '') {
      console.error('[JWT] Empty token provided');
      throw new Error('Empty token provided');
    }
    
    // Simple format check - JWT should have 3 parts separated by dots
    if (!token.split('.').length || token.split('.').length !== 3) {
      console.error('[JWT] Invalid token format');
      throw new Error('Invalid token format');
    }
    
    console.log('[JWT] Decoding Firebase token...');
    
    // For Firebase tokens, we'll just decode without verification for now
    // This is OK for development but in production you should use Firebase Admin SDK
    const decoded = decode(token);
    
    if (!decoded) {
      throw new Error('Failed to decode token');
    }
    
    // Log the structure of the decoded token (without sensitive info)
    const tokenStructure = typeof decoded === 'object' ? 
      {
        has_uid: !!decoded.uid,
        has_sub: !!decoded.sub,
        has_user_id: !!decoded.user_id,
        has_email: !!decoded.email,
        keys: Object.keys(decoded),
        uid_value: decoded.uid || decoded.sub || decoded.user_id || null
      } : 
      { error: 'Decoded token is not an object' };
    
    console.log('[JWT] Token structure:', tokenStructure);
    
    // Fix: If Firebase token doesn't have uid but has sub, map it
    if (typeof decoded === 'object' && !decoded.uid && decoded.sub) {
      console.log('[JWT] Mapping sub to uid:', decoded.sub);
      (decoded as any).uid = decoded.sub;
    }
    
    return decoded;
  } catch (error) {
    console.error('[JWT] Decode failed:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Invalid token');
  }
}

/**
 * Extract user ID from a JWT token without verification
 * This is useful when you just need the user ID without full verification
 * @param token - The JWT token
 * @returns The user ID from the token or null if not found
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    // Decode the token (without verification)
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    
    console.log('[JWT] Raw token payload keys:', Object.keys(payload));
    
    // Return the user ID (could be in uid, sub, or user_id claim)
    return payload.uid || payload.sub || payload.user_id || null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
} 