"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";

interface ProcessingProgressProps {
  totalPages: number;
  currentPage: number;
  isComplete: boolean;
  onCompleteAction?: () => void;
}

export function ProcessingProgress({ totalPages, currentPage, isComplete, onCompleteAction }: ProcessingProgressProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Calculate progress percentage
  const progress = Math.round((currentPage / totalPages) * 100);
  
  useEffect(() => {
    // When processing is complete, trigger final animation
    if (isComplete) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Processing Document</h3>
          <span className="text-sm font-medium bg-secondary/30 text-foreground/80 px-2 py-1 rounded-full">
            {isComplete ? "Complete" : `${progress}%`}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-2 bg-secondary/30 rounded-full mb-5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? "bg-primary/80" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex flex-col space-y-3">
          {/* Current activity indicator */}
          <div className="flex items-center">
            <div className={`relative w-6 h-6 mr-3 flex-shrink-0 ${
              currentPage > 0 ? "bg-primary" : "bg-secondary/40"
            } rounded-full flex items-center justify-center`}>
              {currentPage > 0 && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm">Parsing PDF structure</span>
          </div>
          
          <div className="flex items-center">
            <div className={`relative w-6 h-6 mr-3 flex-shrink-0 ${
              progress >= 30 ? "bg-primary" : "bg-secondary/40"
            } rounded-full flex items-center justify-center`}>
              {progress >= 30 && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm">Extracting text and images with Mistral OCR</span>
          </div>
          
          <div className="flex items-center">
            <div className={`relative w-6 h-6 mr-3 flex-shrink-0 ${
              progress >= 60 ? "bg-primary" : "bg-secondary/40"
            } rounded-full flex items-center justify-center`}>
              {progress >= 60 && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm">Simplifying text and removing jargon</span>
          </div>
          
          <div className="flex items-center">
            <div className={`relative w-6 h-6 mr-3 flex-shrink-0 ${progress >= 95 ? "bg-primary" : "bg-secondary/40"} rounded-full flex items-center justify-center`}>
              {progress >= 95 && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-sm">Preparing reading view</span>
          </div>
        </div>

        {/* Live processing indicator */}
        {!isComplete && (
          <div className="mt-6 flex items-center">
            <div className="flex space-x-1 mr-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
            </div>
            <span className="text-sm text-foreground/60">
              Processing page {Math.min(currentPage, totalPages)} of {totalPages}
            </span>
          </div>
        )}
        
        {/* Complete message */}
        {isComplete && (
          <div className={`mt-6 text-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-black-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-medium text-foreground/90 mb-6">Your document is ready to read!</p>
            {onCompleteAction && (
              <Button
                onClick={onCompleteAction}
                className="btn-primary px-8 py-3 text-lg" // Use primary button style
              >
                Start Reading
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 