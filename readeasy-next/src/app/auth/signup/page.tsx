'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/firebase-auth-provider';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const { signUp, signInWithGooglePopup } = useAuth();

  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 300);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      await signUp(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);
    
    try {
      await signInWithGooglePopup();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f5f0] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#e6e6d8] rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-[#e6e6d8] rounded-full blur-3xl"></div>
      
      {/* Content */}
      <div className="container mx-auto px-4 min-h-screen flex flex-col">
        {/* Navigation */}
        <div className={`py-6 flex justify-between items-center transition-all duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <Link href="/" className="text-2xl font-bold text-black">Serene</Link>
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center py-12">
          {/* Left side */}
          <div className={`w-full md:w-1/2 mb-12 md:mb-0 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 text-black">
              Join <br />
              <span className="text-[#8B7355]">Serene</span> <br />
              today
            </h1>
            <p className="text-xl md:text-2xl text-black/75 mb-10 max-w-xl">
              Create an account to unlock premium features and enjoy a customized reading experience.
            </p>
          </div>
          
          {/* Right side form */}
          <div className={`w-full md:w-1/2 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden p-8 border border-[#e6e6d8]">
              {error && (
                <div className="rounded-md bg-[#f8f0e3] border border-[#8B7355] p-4 text-sm text-black mb-6">
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSignUp}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-black">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-[#e6e6d8] px-3 py-2 shadow-sm bg-[#f5f5f0] focus:border-[#8B7355] focus:outline-none focus:ring-1 focus:ring-[#8B7355]"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-black">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-[#e6e6d8] px-3 py-2 shadow-sm bg-[#f5f5f0] focus:border-[#8B7355] focus:outline-none focus:ring-1 focus:ring-[#8B7355]"
                    />
                    <p className="mt-1 text-xs text-black/60">
                      Must be at least 8 characters
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-black">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-[#e6e6d8] px-3 py-2 shadow-sm bg-[#f5f5f0] focus:border-[#8B7355] focus:outline-none focus:ring-1 focus:ring-[#8B7355]"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full justify-center rounded-md border border-transparent bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:ring-offset-2 disabled:bg-black/50 transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Sign up'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e6e6d8]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-black/60">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-md border border-[#e6e6d8] bg-white px-4 py-3 text-sm font-medium text-black shadow-sm hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:ring-offset-2 transition-colors"
                  >
                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                        fill="#8B7355"
                      />
                      <path
                        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                        fill="#8B7355"
                      />
                      <path
                        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                        fill="#8B7355"
                      />
                      <path
                        d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24 12.0004 24Z"
                        fill="#8B7355"
                      />
                    </svg>
                    Google
                  </button>
                </div>
              </div>

              <div className="mt-6 text-center text-sm">
                <p className="text-black/70">
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="font-medium text-[#8B7355] hover:text-black">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 