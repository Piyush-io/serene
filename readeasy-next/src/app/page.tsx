"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "@/components/ui/hero-section";
import { FileUpload } from "@/components/ui/file-upload";
import { ProcessingProgress } from "@/components/ui/processing-progress";
import { DocumentViewer, PageData } from "@/components/ui/document-viewer-exports";
import { logger } from "@/lib/logger";
import { getUserToken } from "@/lib/firebase/auth";

enum AppState {
  WELCOME,
  UPLOADING,
  PROCESSING,
  VIEWING,
  FAQ,
  LEARN_MORE,
  ERROR,
  LOADING_STATE
}

const JOB_ID_STORAGE_KEY = "readeasy_last_job_id";
const APP_STATE_STORAGE_KEY = "readeasy_last_app_state";
const AUTH_TOKEN_STORAGE_KEY = "readeasy_auth_token";

// Helper to get token (replace with your actual auth logic)
const getAuthToken = async (): Promise<string | null> => {
  // First try to get token from Firebase
  const firebaseToken = await getUserToken();
  if (firebaseToken) {
    logger.debug("Using Firebase auth token");
    return firebaseToken;
  }

  // Fallback to localStorage if Firebase token not available
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (localToken) {
      logger.debug("Using localStorage auth token");
      return localToken;
    }
  }

  logger.warn("No auth token available");
  return null;
};

export default function Home() {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING_STATE);
  const [fileName, setFileName] = useState<string>("");
  const [processedPages, setProcessedPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPageProcessing, setCurrentPageProcessing] = useState<number>(0);
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  // --- Effect to save app state ---
  useEffect(() => {
    if (appState === AppState.VIEWING && currentJobId) {
      localStorage.setItem(APP_STATE_STORAGE_KEY, AppState[appState]);
      localStorage.setItem(JOB_ID_STORAGE_KEY, currentJobId);
    } else if (appState !== AppState.LOADING_STATE && appState !== AppState.PROCESSING) {
      localStorage.removeItem(APP_STATE_STORAGE_KEY);
    }
  }, [appState, currentJobId]);

  // --- Effect for loading state on initial mount ---
  useEffect(() => {
    let isMounted = true;
    let stopPollingFunc: (() => void) | null = null;

    const loadPreviousState = async () => {
      const storedJobId = localStorage.getItem(JOB_ID_STORAGE_KEY);
      const storedAppState = localStorage.getItem(APP_STATE_STORAGE_KEY);
      
      if (storedAppState === AppState[AppState.VIEWING] && storedJobId) {
        logger.info(`Last state VIEWING with job ${storedJobId}. Loading...`);
        if (!isMounted) return;
        setCurrentJobId(storedJobId);
        setAppState(AppState.LOADING_STATE);

        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
          const currentAuthToken = await getAuthToken();
          
          const response = await fetch(`${backendUrl}/api/v1/process/${storedJobId}`, {
            headers: {
              "Authorization": currentAuthToken ? `Bearer ${currentAuthToken}` : "",
            }
          });
          if (!isMounted) return;
          const status = response.status;
          const responseData = await response.json();
          if (!isMounted) return;

          if (status === 404) {
            logger.info("Previous job not found or expired.");
            localStorage.removeItem(JOB_ID_STORAGE_KEY);
            localStorage.removeItem(APP_STATE_STORAGE_KEY);
            setAppState(AppState.WELCOME);
          } else if (status === 202) {
            logger.info("Previous job was found but still processing. Starting polling...");
            setFileName(responseData.file_name || "Loading...");
            stopPollingFunc = pollForResult(storedJobId, backendUrl);
            setAppState(AppState.PROCESSING);
          } else if (status === 200 && responseData.status === 'completed') {
            logger.info("Successfully loaded previous job state.");
            if (responseData.result) {
              setFileName(responseData.result.file_name);
              setProcessedPages(responseData.result.pages);
              setTotalPages(responseData.result.total_pages);
              setIsProcessingComplete(true);
              setAppState(AppState.VIEWING);
            } else {
              throw new Error("Completed job response format is incorrect (missing result).");
            }
          } else {
            const detail = responseData.detail || `HTTP ${status}`;
            logger.error(`Failed to load previous job state: ${status} - ${detail}`);
            localStorage.removeItem(JOB_ID_STORAGE_KEY);
            localStorage.removeItem(APP_STATE_STORAGE_KEY);
            setErrorMessage(`Failed to load previous session: ${detail}. Please upload again.`);
            setAppState(AppState.ERROR);
          }
        } catch (error) {
          logger.error("Exception loading state:", error);
          localStorage.removeItem(JOB_ID_STORAGE_KEY);
          localStorage.removeItem(APP_STATE_STORAGE_KEY);
          setErrorMessage(`Exception loading state: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setAppState(AppState.ERROR);
        }
      } else {
        logger.info("No previous VIEWING state found. Starting fresh.");
        if (storedJobId) localStorage.removeItem(JOB_ID_STORAGE_KEY);
        if (storedAppState) localStorage.removeItem(APP_STATE_STORAGE_KEY);
        setAppState(AppState.WELCOME);
      }
    };

    loadPreviousState();

    const handleUploadClick = () => setAppState(AppState.UPLOADING);
    const handleLearnMoreClick = () => setAppState(AppState.LEARN_MORE);
    const handleFAQsClick = () => setAppState(AppState.FAQ);

    window.addEventListener('uploadClicked', handleUploadClick);
    window.addEventListener('learnMoreClicked', handleLearnMoreClick);
    window.addEventListener('faqsClicked', handleFAQsClick);

    return () => {
      isMounted = false;
      window.removeEventListener('uploadClicked', handleUploadClick);
      window.removeEventListener('learnMoreClicked', handleLearnMoreClick);
      window.removeEventListener('faqsClicked', handleFAQsClick);
      if (stopPollingFunc) {
        logger.debug("Cleaning up polling interval from mount effect.");
        stopPollingFunc();
      }
    };
  }, []);

  // --- Effect for Polling Cleanup (Dedicated) ---
  useEffect(() => {
    const shouldBePolling = appState === AppState.PROCESSING && !isProcessingComplete;

    if (!shouldBePolling && pollingIntervalId) {
      logger.debug(`Clearing polling interval. State: ${AppState[appState]}, isComplete: ${isProcessingComplete}`);
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    return () => {
      if (pollingIntervalId) {
        logger.debug("Clearing polling interval on unmount.");
      }
    };
  }, [appState, isProcessingComplete, pollingIntervalId]);

  // --- Function to Poll for Results ---
  const pollForResult = (jobId: string, backendUrl: string): (() => void) => {
    logger.info(`Starting polling for job ${jobId}...`);

    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
    }

    let localIntervalId: NodeJS.Timeout | null = null;

    const poll = async () => {
        logger.debug(`Checking job ${jobId}`);
        try {
          // Get the latest auth token on every poll to ensure we're authenticated
          const currentAuthToken = await getAuthToken();

          const pollResponse = await fetch(`${backendUrl}/api/v1/process/${jobId}`, {
            headers: {
              "Authorization": currentAuthToken ? `Bearer ${currentAuthToken}` : "",
            }
          });
          const status = pollResponse.status;
          const responseData = await pollResponse.json();

          if (status === 200) {
            logger.info("Job completed.", responseData);
            if (localIntervalId) {
                logger.debug("Clearing interval inside completion.");
                clearInterval(localIntervalId);
            }
            setPollingIntervalId(null);

            if (responseData.status === 'completed' && responseData.result) {
              setFileName(responseData.result.file_name);
              setProcessedPages(responseData.result.pages);
              setTotalPages(responseData.result.total_pages);
              setCurrentJobId(jobId);
              localStorage.setItem(JOB_ID_STORAGE_KEY, jobId);
              setCurrentPageProcessing(responseData.result.total_pages);
              logger.debug(`Setting isProcessingComplete = true. Current AppState: ${AppState[appState]}`);
              setIsProcessingComplete(true);
              logger.debug("Processing complete. State should remain PROCESSING.");
            } else {
              logger.error("200 OK, but completed job format incorrect.");
              throw new Error("200 OK, but completed job format incorrect.");
            }
          } else if (status === 202) {
            logger.debug(`Job status: ${responseData.status}. Progress: ${responseData.current_page}/${responseData.total_pages}`);
            if (responseData.status === 'processing') {
              setCurrentPageProcessing(responseData.current_page || 0);
              setTotalPages(responseData.total_pages || 1);
              setFileName(responseData.file_name || fileName);
            } else if (responseData.status === 'queued') {
              setCurrentPageProcessing(0);
              setTotalPages(1);
              setFileName(responseData.file_name || fileName);
            }
          } else {
            logger.error(`Polling failed: ${status} - ${responseData.detail || 'Unknown error'}`);
            if (localIntervalId) clearInterval(localIntervalId);
            setPollingIntervalId(null);
            setErrorMessage(`Polling failed: ${responseData.detail || status}`);
            setAppState(AppState.ERROR);
            localStorage.removeItem(JOB_ID_STORAGE_KEY);
            localStorage.removeItem(APP_STATE_STORAGE_KEY);
          }
        } catch (error) {
          logger.error("Polling exception caught:", error);
          if (localIntervalId) clearInterval(localIntervalId);
          setPollingIntervalId(null);
          setErrorMessage(error instanceof Error ? error.message : "Polling exception.");
          setAppState(AppState.ERROR);
          localStorage.removeItem(JOB_ID_STORAGE_KEY);
          localStorage.removeItem(APP_STATE_STORAGE_KEY);
        }
    };

    poll();
    localIntervalId = setInterval(poll, 3000);
    setPollingIntervalId(localIntervalId);

    return () => {
        if (localIntervalId) {
            logger.debug(`Cleanup Function for ${jobId}: Clearing interval.`);
            clearInterval(localIntervalId);
        }
    };
  };

  // Handle file upload - Now polls backend
  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setAppState(AppState.PROCESSING);
    setErrorMessage("");
    setIsProcessingComplete(false);
    setCurrentPageProcessing(0);
    setTotalPages(0);
    setCurrentJobId(null);
    localStorage.removeItem(JOB_ID_STORAGE_KEY);
    localStorage.removeItem(APP_STATE_STORAGE_KEY);

    // Detect document type from filename for better OCR refinement
    let documentType = "default";
    const fileName = file.name.toLowerCase();

    if (fileName.includes("cheat") || fileName.includes("guide") || fileName.includes("sheet")) {
      documentType = "cheatsheet";
    } else if (fileName.includes("paper") || fileName.includes("research") || fileName.includes("study")) {
      documentType = "academic paper";
    } else if (fileName.includes("book") || fileName.includes("novel") || fileName.includes("text")) {
      documentType = "book";
    } else if (fileName.includes("report") || fileName.includes("business") || fileName.includes("analysis")) {
      documentType = "report";
    }

    logger.info(`Detected document type: ${documentType}`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
      const currentAuthToken = await getAuthToken();
      
      logger.info(`Using auth token starting with: ${currentAuthToken ? currentAuthToken.substring(0, 10) + '...' : 'none'}`);
      
      const response = await fetch(`${backendUrl}/api/v1/process/`, {
        method: "POST",
        headers: {
          "Authorization": currentAuthToken ? `Bearer ${currentAuthToken}` : "",
        },
        body: formData,
      });

      if (response.status === 202) {
        const data = await response.json();
        const jobId = data.job_id;
        logger.info("Processing started with Job ID:", jobId);
        setCurrentJobId(jobId);
        setAppState(AppState.PROCESSING);
        pollForResult(jobId, backendUrl);

      } else {
          let errorDetail = "Failed to start processing.";
          try {
              const errorData = await response.json();
              errorDetail = errorData.detail || errorDetail;
          } catch (jsonError) { errorDetail = response.statusText; }
          throw new Error(`HTTP error ${response.status}: ${errorDetail}`);
      }

    } catch (error) {
      logger.error("Upload failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  // Handle returning to welcome/upload screen
  const handleGoHome = () => {
    setAppState(AppState.WELCOME);
    setFileName("");
    setProcessedPages([]);
    setTotalPages(0);
    setCurrentPageProcessing(0);
    setIsProcessingComplete(false);
    setErrorMessage("");
    setCurrentJobId(null);
    localStorage.removeItem(JOB_ID_STORAGE_KEY);
    localStorage.removeItem(APP_STATE_STORAGE_KEY);
  };

  // --- Action to trigger viewing ---
  const handleStartReading = () => {
      logger.debug(`Start Reading button clicked! isComplete: ${isProcessingComplete}, pages: ${processedPages?.length}`);
      if (isProcessingComplete && processedPages && processedPages.length > 0) {
          logger.info("Conditions met. Setting AppState to VIEWING.");
          setAppState(AppState.VIEWING);
      } else {
          logger.warn("Conditions not met for viewing. State not changed.");
      }
  };

  // --- Render Logic ---
  const renderContent = () => {
    logger.debug(`Rendering state: ${AppState[appState]}, isComplete: ${isProcessingComplete}`);
    switch (appState) {
      case AppState.LOADING_STATE:
        return <div className="h-screen flex items-center justify-center"><p>Loading session...</p></div>;
      case AppState.WELCOME:
        return <HeroSection />;
      case AppState.UPLOADING:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
            <div className="w-full max-w-xl bg-white dark:bg-card rounded-2xl shadow-xl p-8 border border-border">
              <h2 className="text-2xl font-semibold mb-2">Upload Document</h2>
              <p className="text-foreground/70 mb-8">Supported formats: PDF (max 50MB)</p>
              <FileUpload onFileUpload={handleFileUpload} />
              <button 
                onClick={handleGoHome} 
                className="mt-10 text-foreground/60 hover:text-foreground/80 flex items-center mx-auto group transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>
          </div>
        );
      case AppState.PROCESSING:
        logger.debug(`Rendering PROCESSING. isComplete: ${isProcessingComplete}`);
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
            <div className="w-full max-w-xl bg-white dark:bg-card rounded-2xl shadow-xl p-8 border border-border">
              <ProcessingProgress
                totalPages={totalPages || 1}
                currentPage={currentPageProcessing}
                isComplete={isProcessingComplete}
                onCompleteAction={handleStartReading}
              />
            </div>
          </div>
        );
      case AppState.VIEWING:
        logger.debug(`Rendering VIEWING. Pages ready: ${!!(processedPages && processedPages.length > 0)}`);
        if (!processedPages || processedPages.length === 0) {
           logger.warn("State is VIEWING, but processedPages not ready. Showing loading...");
           return (
            <div className="h-screen flex items-center justify-center">
              <p>Loading document content...</p>
            </div>
           );
        }
        return (
          <div className="h-screen p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <button onClick={handleGoHome} className="text-foreground/60 hover:text-foreground/80 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Upload another document
              </button>
            </div>
            <div className="flex-grow overflow-hidden">
              <DocumentViewer pages={processedPages} fileName={fileName} />
            </div>
          </div>
        );
      case AppState.FAQ:
         return (
           <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
             <div className="max-w-2xl w-full bg-white dark:bg-card rounded-2xl shadow-xl p-8 border border-border">
               <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-semibold flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   Frequently Asked Questions
                 </h2>
                 <button onClick={handleGoHome} className="text-foreground/60 hover:text-foreground/80 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               <div className="space-y-6">
                 <div className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                     <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">Q</span>
                     What is Serene?
                   </h3>
                   <p className="text-foreground/80">Serene is a PDF simplification tool that helps you understand complex documents by converting technical language into simpler, more readable text while preserving images and document structure.</p>
                 </div>

                 <div className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                     <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">Q</span>
                     How does the simplification work?
                   </h3>
                   <p className="text-foreground/80">Our AI identifies complex terminology, jargon, and sentence structures, then rewrites them to be more accessible without changing the meaning of the original text.</p>
                 </div>

                 <div className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                     <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">Q</span>
                     Is there a limit to file size?
                   </h3>
                   <p className="text-foreground/80">Currently we support PDF files up to 50MB in size, which covers most documents. For larger files, please contact our support team.</p>
                 </div>

                 <div className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                     <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">Q</span>
                     How many pages can I process?
                   </h3>
                   <p className="text-foreground/80">There are no limits to the number of pages you can process. Our service is completely free to use.</p>
                 </div>
               </div>
               <div className="mt-8 flex justify-center">
                 <button 
                   onClick={handleGoHome} 
                   className="flex items-center gap-2 bg-primary text-white py-2 px-6 rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                   </svg>
                   Return to Home
                 </button>
               </div>
             </div>
           </div>
         );
      case AppState.LEARN_MORE:
         return (
           <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
             <div className="max-w-2xl w-full bg-white dark:bg-card rounded-2xl shadow-xl p-8 border border-border">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About Serene
                </h2>
                <button onClick={handleGoHome} className="text-foreground/60 hover:text-foreground/80 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                <div className="bg-secondary/10 rounded-lg p-5 border border-secondary/30">
                  <p className="text-foreground/80 italic">Serene uses advanced natural language processing to make complex documents easier to understand. Our technology analyzes text, identifies difficult concepts and rewrites them in simpler language while preserving the original meaning.</p>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Key Features
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-foreground/80">
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Text simplification that maintains meaning
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Preservation of images and tables
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Side-by-side comparison view
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Downloadable simplified PDFs
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Support for technical documents
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mt-0.5">✓</span>
                      Free to use, no limitations
                    </li>
                  </ul>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    How It Works
                  </h3>
                  <p className="text-foreground/80 mb-3">When you upload a PDF, our systems extract the text and images, analyze the content, and process it for simplification. The AI rewrites complex sentences, replaces jargon with everyday language, and generates a new, easier-to-read version of your document.</p>

                  <div className="flex flex-wrap gap-4 justify-center my-4">
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground/70">Upload</span>
                    </div>
                    <div className="flex items-center px-2">→</div>
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground/70">Process</span>
                    </div>
                    <div className="flex items-center px-2">→</div>
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-sm text-foreground/70">Read</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex justify-center">
                <button 
                  onClick={() => setAppState(AppState.UPLOADING)} 
                  className="flex items-center gap-2 bg-primary text-white py-3 px-8 rounded-lg shadow-md hover:bg-primary/90 transition-colors text-base font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Try It Now
                </button>
              </div>
             </div>
           </div>
         );
      case AppState.ERROR:
        return (
           <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-background/80">
               <div className="max-w-md w-full bg-white dark:bg-card rounded-2xl shadow-xl p-8 border border-red-200 dark:border-red-900/30">
                   <div className="flex items-center justify-center mb-6">
                     <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                     </div>
                   </div>
                   <h2 className="text-xl font-medium mb-3 text-center">Processing Failed</h2>
                   <p className="mb-6 text-foreground/80 text-center">{errorMessage}</p>
                   
                   <div className="flex flex-col space-y-3">
                     <button 
                       onClick={handleGoHome} 
                       className="flex items-center justify-center gap-2 bg-primary text-white py-3 px-6 rounded-lg shadow-md hover:bg-primary/90 transition-colors w-full"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                       </svg>
                       Return Home
                     </button>
                     
                     <button 
                       onClick={() => setAppState(AppState.UPLOADING)} 
                       className="flex items-center justify-center gap-2 bg-transparent border border-primary/70 text-primary py-3 px-6 rounded-lg hover:bg-primary/10 transition-colors w-full"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       Try Again
                     </button>
                   </div>
               </div>
           </div>
        );
      default:
        return <HeroSection />;
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {renderContent()}
    </main>
  );
}
