"use client";

import { useState } from "react";
import { Button } from "./button";

export function FileUpload({ onFileUpload }: { onFileUpload: (file: File) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="pdf-upload" 
          className="hidden" 
          accept="application/pdf"
          onChange={handleChange}
        />
        
        <label 
          htmlFor="pdf-upload" 
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="w-20 h-20 mb-6 bg-secondary/50 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">Upload PDF</h3>
          <p className="text-base text-foreground/70 mb-4">Drag and drop your file here or click to browse</p>
          <p className="text-sm text-foreground/50 max-w-md mx-auto">
            Your PDF will be processed using our AI to create a simplified reading experience with preserved images and structure.
          </p>
        </label>
      </div>

      {selectedFile && (
        <div className="mt-6 p-6 bg-card rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mr-4 mb-4 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left mb-4 md:mb-0">
              <h4 className="text-lg font-medium text-foreground truncate">{selectedFile.name}</h4>
              <p className="text-sm text-foreground/50">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <Button 
              onClick={handleSubmit}
              className="btn-primary px-6 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Process PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 