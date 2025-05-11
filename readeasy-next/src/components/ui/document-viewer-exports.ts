"use client";

import { DocumentViewer } from './document-viewer';

// Define PageData interface here to match the one in document-viewer.tsx
export interface PageData {
  page_number: number;
  markdown_content: string;
}

export { DocumentViewer };

// This file is a clean module-level export wrapper to avoid syntax issues in the main file
// It allows importing from document-viewer while handling exports cleanly