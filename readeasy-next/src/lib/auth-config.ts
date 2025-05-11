// Configuration for Firebase authentication redirects and options
export const authConfig = {
  // URL to redirect to after login
  loginRedirectUrl: '/dashboard',
  
  // URL to redirect to after logout
  logoutRedirectUrl: '/',
  
  // Firebase auth related options
  firebase: {
    // Login page
    signInUrl: '/auth/signin',
    
    // Sign up page
    signUpUrl: '/auth/signup',
    
    // Reset password page
    resetPasswordUrl: '/auth/reset-password',
  }
};