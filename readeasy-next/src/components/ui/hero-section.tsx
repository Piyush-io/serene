"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authConfig } from "@/lib/auth-config";
import { useAuth } from "@/providers/firebase-auth-provider";
import { motion } from "framer-motion";
import { useSpring, animated } from "@react-spring/web";

// Animation constants
const ANIMATION_CONFIG = {
  duration: 0.6,
  ease: [0.23, 1, 0.32, 1]
};

// Define types for better type safety
interface User {
  photoURL?: string | null;
  displayName?: string | null;
}

// Prop types for components
interface NavbarProps {
  isLoaded: boolean;
  user: User | null;
  loading: boolean;
  onLogout: () => Promise<void>;
  onFAQsClick: () => void;
}

interface HeroTextProps {
  isLoaded: boolean;
  user: User | null;
  onUploadClick: () => void;
  onLearnMoreClick: () => void;
}

interface DocumentPreviewProps {
  isLoaded: boolean;
}

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const { user, loading, logOut } = useAuth();

  // Load animations
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);
  
  // Event handlers
  const triggerEvent = useCallback((name: string) => {
    window.dispatchEvent(new CustomEvent(name));
  }, []);
  
  const handleUploadClick = () => triggerEvent('uploadClicked');
  const handleLearnMoreClick = () => triggerEvent('learnMoreClicked');
  const handleFAQsClick = () => triggerEvent('faqsClicked');

  // Auth handling
  const handleLogout = async () => {
    try {
      await logOut();
      router.push(authConfig.logoutRedirectUrl);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background overflow-hidden relative">
      {/* Background decorations */}
      <motion.div 
        className="absolute -top-32 -right-32 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/30 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      
      {/* Hero content */}
      <div className="container mx-auto px-4 min-h-screen flex flex-col">
        {/* Navigation bar */}
        <Navbar 
          isLoaded={isLoaded} 
          user={user} 
          loading={loading} 
          onLogout={handleLogout}
          onFAQsClick={handleFAQsClick}
        />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center py-12">
          {/* Left side */}
          <HeroText 
            isLoaded={isLoaded}
            user={user}
            onUploadClick={handleUploadClick}
            onLearnMoreClick={handleLearnMoreClick}
          />
          
          {/* Right side */}
          <DocumentPreview isLoaded={isLoaded} />
        </div>
      </div>
    </div>
  );
}

// Navbar Component
function Navbar({ isLoaded, user, loading, onLogout, onFAQsClick }: NavbarProps) {
  const navVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: ANIMATION_CONFIG
    }
  };

  return (
    <motion.div 
      className="py-6 flex justify-between items-center"
      variants={navVariants}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
    >
      <motion.div 
        className="flex items-center space-x-1 relative"
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <span className="text-2xl font-bold tracking-tight relative z-10">Serene</span>
        <div className="h-2 w-2 bg-primary rounded-full mt-1"></div>
      </motion.div>
      
      <div className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="ghost"
            onClick={onFAQsClick}
            className="text-sm font-medium hover:text-primary transition-colors rounded-full bg-secondary/20 px-5 py-2 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            FAQs
          </Button>
        </motion.div>
        
        {loading ? (
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link 
                href={authConfig.loginRedirectUrl} 
                className="text-sm font-medium hover:text-primary transition-colors rounded-full bg-secondary/20 px-5 py-2 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="outline"
                onClick={onLogout}
                className="text-sm font-medium bg-white border-border hover:bg-card hover:text-red-500 hover:border-red-200 transition-all duration-300 rounded-full py-2 px-5 flex items-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </motion.div>
          </div>
        ) : (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link href={authConfig.firebase.signInUrl}>
              <Button className="text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-full py-2 px-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2" variant="default">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Hero Text Component
function HeroText({ isLoaded, user, onUploadClick, onLearnMoreClick }: HeroTextProps) {
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.7,
        delay: i * 0.1,
        ease: [0.165, 0.84, 0.44, 1] 
      }
    })
  };

  // Spring button effect
  const buttonSpringConfig = {
    type: "spring", 
    stiffness: 400, 
    damping: 15
  };

  return (
    <motion.div 
      className="w-full md:w-1/2 mb-12 md:mb-0"
      initial={{ opacity: 0, y: 20 }}
      animate={isLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    >
      <motion.h1 
        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
        custom={0}
        variants={textVariants}
      >
        A smarter way<br />
        <span className="relative inline-block magic-gradient pb-2">
          to read
          <span className="absolute -z-10 bottom-[0.15em] left-0 w-full h-[0.25em] bg-secondary/80 rounded-full blur-[1px]" />
          <motion.span 
            className="absolute -z-20 bottom-[0.15em] left-0 w-full h-[0.35em] bg-secondary rounded-full"
            animate={{
              scaleX: [0.8, 1.05, 0.8],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </span> complex<br />
        documents
      </motion.h1>
      
      <motion.p 
        className="text-xl md:text-2xl text-foreground/75 mb-10 max-w-xl leading-relaxed"
        custom={1}
        variants={textVariants}
      >
        Transform technical content into clear, accessible language that's easy to understand.
      </motion.p>
      
      <motion.div 
        className="flex flex-wrap gap-4"
        custom={2}
        variants={textVariants}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={buttonSpringConfig}
        >
          <Button 
            className="group relative overflow-hidden px-10 py-6 font-medium rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 text-white shadow-md hover:shadow-lg transform hover:-translate-y-1"
            onClick={onUploadClick}
          >
            <span className="relative flex items-center gap-2 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Document
            </span>
          </Button>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={buttonSpringConfig}
        >
          <Button 
            variant="outline"
            className="relative px-6 py-6 font-medium border-2 hover:bg-secondary/10 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-1"
            onClick={onLearnMoreClick}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Learn More
            </span>
          </Button>
        </motion.div>
      </motion.div>
      
      {!user && (
        <motion.div 
          className="mt-4 text-sm text-primary/80"
          custom={3}
          variants={textVariants}
        >
          <Link href={authConfig.firebase.signInUrl} className="hover:underline transition-all hover:text-primary">
            Sign in to access all features
          </Link>
        </motion.div>
      )}
      
      <motion.div 
        className="mt-4 text-sm text-foreground/50"
        custom={4}
        variants={textVariants}
      >
        All features free forever.
      </motion.div>
    </motion.div>
  );
}

// Document Preview Component
function DocumentPreview({ isLoaded }: DocumentPreviewProps) {
  const [hovered, setHovered] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Spring animation
  const [style, api] = useSpring(() => ({
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
    config: { mass: 1, tension: 170, friction: 26 },
  }));

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (!container) return;
    
    setHovered(true);
    const rect = container.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const dampen = 35; // lower = more tilt
    
    setMousePosition({ x: event.clientX, y: event.clientY });
    
    api.start({
      transform: `perspective(1000px) rotateX(${y / dampen}deg) rotateY(${-x / dampen}deg) scale(${hovered ? 1.03 : 1})`,
    });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    api.start({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
    });
  };

  const handleButtonClick = (id: number) => {
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 2000);
  };

  // Header buttons
  const headerButtons = [
    { id: 1, color: "bg-red-400", label: "Close document" },
    { id: 2, color: "bg-yellow-400", label: "Minimize window" },
    { id: 3, color: "bg-green-400", label: "Expand view" },
  ];

  return (
    <div className={`w-full md:w-1/2 flex justify-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
      <div className="w-full max-w-md aspect-[4/3]">
        <animated.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={style}
          className="relative w-full h-full rounded-2xl shadow-xl bg-white dark:bg-card/90 border border-border overflow-hidden backdrop-blur-sm"
        >
          {/* Paper texture overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMCwwLDAsMC4wMykiIHN0cm9rZS13aWR0aD0iMSI+PHBhdGggZD0iTTAgMjAgQyAwIDAgNDAgMCA0MCAyMCBDIDQwIDQwIDAgNDAgMCAyMCIvPjwvZz48L3N2Zz4=')] opacity-50 mix-blend-overlay pointer-events-none"></div>
          
          {/* Particle effect with reduced intensity */}
          <div className="absolute inset-0 z-0 overflow-hidden opacity-70">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10 pointer-events-none"
                style={{
                  width: 1 + Math.random() * 2,
                  height: 1 + Math.random() * 2,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.2
                }}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{
                  duration: 4 + Math.random() * 6,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
              />
            ))}
          </div>

          {/* Document content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-white dark:bg-card/80 backdrop-blur-md border-b border-border/40">
              <div className="flex space-x-2">
                {headerButtons.map((btn) => (
                  <motion.button
                    key={btn.id}
                    onClick={() => handleButtonClick(btn.id)}
                    className={`w-3 h-3 rounded-full ${hovered ? btn.color : 'bg-secondary/60'}`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    title={btn.label}
                  />
                ))}
              </div>
              
              <div className="flex-1 text-center text-xs font-medium text-foreground/80">
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Complex-Document.pdf
                </span>
              </div>
              
              <motion.div
                className="w-4 h-4 rounded-full bg-secondary/30 flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.div>
            </div>

            {/* Body with enhanced content */}
            <div className="flex flex-1 overflow-hidden bg-background/50 backdrop-blur-sm p-4">
              {/* Left pane - Document content */}
              <div className="w-2/3 pr-4 space-y-3 relative">
                <motion.div
                  onClick={() => handleButtonClick(4)}
                  className="h-6 w-1/2 bg-secondary/40 rounded cursor-pointer"
                  whileHover={{ x: 3, backgroundColor: 'rgba(0,0,0,0.1)' }}
                />

                {/* Text content with staggered animation */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="h-3 bg-secondary/30 rounded cursor-pointer"
                    whileHover={{ width: `${98 - i * 3}%`, x: 2, backgroundColor: 'rgba(0,0,0,0.1)' }}
                  />
                ))}

                {/* Interactive card */}
                <motion.div
                  className="h-28 w-full rounded-lg bg-secondary/20 relative overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Simulated document content */}
                  <div className="absolute inset-0 p-3 flex flex-col">
                    <motion.div 
                      className="h-2 w-1/3 bg-black/10 rounded mb-2"
                      whileHover={{ width: "40%" }}
                    />
                    <div className="flex-1 flex gap-2">
                      <div className="w-1/3 flex flex-col justify-between">
                        <motion.div className="h-3 w-full bg-black/10 rounded" />
                        <motion.div className="h-8 w-full bg-black/15 rounded-md" />
                        <motion.div className="h-3 w-2/3 bg-black/10 rounded" />
                      </div>
                      <div className="w-2/3 flex flex-col gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div 
                            key={i}
                            className="h-2 bg-black/10 rounded"
                            style={{ width: `${100 - i * 10}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Bottom lines */}
                <motion.div
                  className="h-3 bg-secondary/30 rounded cursor-pointer"
                  whileHover={{ width: '88%', x: 2, backgroundColor: 'rgba(0,0,0,0.1)' }}
                />
                <motion.div
                  className="h-3 bg-secondary/30 rounded cursor-pointer"
                  whileHover={{ width: '85%', x: 2, backgroundColor: 'rgba(0,0,0,0.1)' }}
                />
              </div>

              {/* Right sidebar/navigation */}
              <div className="w-1/3 bg-card/40 rounded-lg p-3 border border-border/30 flex flex-col">
                <motion.div 
                  className="h-4 w-3/4 bg-secondary/40 rounded mb-3"
                  whileHover={{ width: '65%' }}
                />
                
                {/* Interactive buttons grid */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                  {[6, 7, 8, 9].map((id) => (
                    <motion.button
                      key={id}
                      onClick={() => handleButtonClick(id)}
                      className={`h-10 rounded shadow-sm flex items-center justify-center ${id === 7 ? 'bg-primary/90 text-white' : 'bg-background/80'}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div 
                        className={`w-2 h-2 rounded-sm ${id === 7 ? 'bg-white/80' : 'bg-black/20'}`}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.button>
                  ))}
                </div>
                
                {/* Bottom controls */}
                <div className="mt-auto space-y-2">
                  <motion.div 
                    className="h-4 w-1/2 bg-secondary/40 rounded"
                    whileHover={{ width: '65%' }}
                  />
                  <motion.button
                    onClick={() => handleButtonClick(10)}
                    className="h-8 w-full bg-primary/90 rounded shadow-sm cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </animated.div>
      </div>
    </div>
  );
} 