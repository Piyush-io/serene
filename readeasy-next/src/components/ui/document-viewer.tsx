"use client";

import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  CheckIcon,
  ClipboardIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
  CogIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon, // For Reset
  XMarkIcon, // For closing dialog
  Bars3Icon, // For mobile sidebar toggle
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added for dialog structure
  DialogClose,
} from "./dialog";
import { Toaster, toast } from "react-hot-toast";
import { getUserToken } from "@/lib/firebase/auth";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import "katex/dist/katex.min.css";

// Add custom styles for LaTeX content
const mathStyles = `
.katex-display {
  color: var(--foreground);
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0;
  margin: 1rem 0;
  text-align: center;
}
.katex {
  color: var(--foreground);
  font-size: 1.05em;
  text-rendering: auto;
}
/* Ensure all math elements are visible */
.math {
  display: block;
  color: var(--foreground);
  font-size: 1.05em;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 1rem 0;
}
.math-inline {
  display: inline-block;
  color: var(--foreground);
  font-size: 1.05em;
  margin: 0 0.15em;
}
.math.math-display {
  display: block;
}

/* Fix spacing in math display */
.katex-display > .katex {
  display: inline-block;
  max-width: 100%;
}

/* Fix overflow issues */
.katex-display .katex-html {
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Handle line breaks better */
.katex-display .base {
  margin: 0.25em 0;
}

/* Prevent long formulas from overflowing */
.katex-display {
  white-space: normal;
}

/* Fix text and min rendering in LaTeX */
.katex .mord.text {
  font-family: var(--font-sans);
}

.katex .mop {
  margin-right: 0.16667em;
}

/* Enhanced table styles */
.custom-table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  --muted: hsl(var(--muted));
  --foreground: hsl(var(--foreground));
  --border: hsl(var(--border));
  --muted-foreground-5: hsl(var(--muted-foreground) / 0.05);
  --muted-hover: hsl(var(--muted) / 0.2);
  --table-border: hsl(var(--border));
}

.custom-table {
  border-collapse: collapse; 
  width: 100%;
  font-size: 0.95em;
  border: 1px solid hsl(var(--border));
}

.custom-table th {
  position: sticky;
  top: 0;
  background-color: hsl(var(--background));
  color: var(--foreground);
  font-weight: 600;
  text-align: left;
  padding: 0.75rem 1rem;
  border: 1px solid hsl(var(--border));
  border-bottom-width: 2px;
  white-space: nowrap;
}

.custom-table td {
  padding: 0.75rem 1rem;
  border: 1px solid hsl(var(--border));
  vertical-align: top;
}

.custom-table tbody tr:hover {
  background-color: hsl(var(--muted) / 0.1);
}

/* Text alignment classes for table cells */
.table-cell-left { text-align: left; }
.table-cell-center { text-align: center; }
.table-cell-right { text-align: right; }

/* For tables detected outside of custom wrapper */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
  border: 1px solid hsl(var(--border));
  --muted: hsl(var(--muted));
  --foreground: hsl(var(--foreground));
  --border: hsl(var(--border));
  --muted-foreground-5: hsl(var(--muted-foreground) / 0.05);
  --muted-hover: hsl(var(--muted) / 0.2);
  --table-border: hsl(var(--border));
}

th {
  background-color: hsl(var(--background));
  color: var(--foreground);
  font-weight: 600;
  text-align: left;
  padding: 0.75rem 1rem;
  border: 1px solid hsl(var(--border));
  border-bottom-width: 2px;
  position: sticky;
  top: 0;
}

tr {
  border: 1px solid hsl(var(--border));
}

td {
  padding: 0.75rem 1rem;
  border: 1px solid hsl(var(--border));
  vertical-align: top;
}

/* Simplify row styling - no alternating colors */
tbody tr:hover {
  background-color: hsl(var(--muted) / 0.1);
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* Fix last line visibility */
main {
  padding-bottom: 180px !important; /* Increased bottom padding */
  scroll-padding-bottom: 100px; /* Ensures bottom content is properly visible when scrolled */
}
`;

// Helper function to detect Mistral image references (Unused in this snippet, but kept if needed)
// const isMistralImageReference = (text: string) => {
//   if (!text) return false;
//   return /^img_\d+$/.test(text);
// };

// Define constants outside the component for clarity
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";
const IMAGE_API_PREFIX = "/api/v1/images";
const STATIC_IMAGE_PREFIX = "/static/temp_images";

const resolveImageUrl = (src: string): string => {
  if (!src) return "";

  if (src.startsWith("data:image/")) {
    return src;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (!src.includes(BACKEND_BASE_URL) && src.match(/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i)) {
        return `${BACKEND_BASE_URL}/api/v1/proxy/image?url=${encodeURIComponent(src)}`;
    }
    return src; // Use as is (either our backend URL or an external one not needing proxy)
  }
  
  if (src.startsWith("/api/v1/images/") || src.startsWith("/static/temp_images/")) {
      return `${BACKEND_BASE_URL}${src}`;
  }

  if (src.match(/^img-.*\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    console.warn(`resolveImageUrl: Received simple filename '{src}', resolving against API endpoint. Backend should provide full URLs.`);
    return `${BACKEND_BASE_URL}${IMAGE_API_PREFIX}/${src}`;
  }
  
  const imgIdMatch = src.match(/img_(\d+)/i);
  if (imgIdMatch) {
    console.warn(`resolveImageUrl: Received legacy 'img_XXX' ref '{src}'. Backend should resolve this.`);
    return `${BACKEND_BASE_URL}${IMAGE_API_PREFIX}/${imgIdMatch[0]}`;
  }

  console.warn(`resolveImageUrl: Unhandled src format '{src}'. Returning as is.`);
  return src;
};

/**
 * Advanced table processing function to detect and format markdown tables
 * @param markdown The markdown content to process
 * @returns Processed markdown with properly formatted tables
 */
const processTableMarkdown = (markdown: string): string => {
  if (!markdown) return "";
  
  const lines = markdown.split('\n');
  const processedLines: string[] = [];
  
  let inTable = false;
  let tableLines: string[] = [];
  let tableStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const isPotentialTableLine = line.startsWith('|') && line.endsWith('|') && line.length > 2;
    
    if (isPotentialTableLine) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
        tableLines = [line];
    } else {
        tableLines.push(line);
      }
    } else {
      if (inTable) {
        if (tableLines.length >= 2) {
          const processedTable = formatTable(tableLines);
          processedLines.push(''); // Empty line before table
          processedLines.push(...processedTable);
          processedLines.push(''); // Empty line after table
        } else {
          for (let j = tableStartIndex; j < i; j++) {
            processedLines.push(lines[j]);
          }
        }
        inTable = false;
        tableLines = [];
      }
      
      processedLines.push(line);
    }
  }
  
  if (inTable && tableLines.length >= 2) {
    const processedTable = formatTable(tableLines);
    processedLines.push(''); // Empty line before table
    processedLines.push(...processedTable);
    processedLines.push(''); // Empty line after table
  } else if (inTable) {
    for (let j = tableStartIndex; j < lines.length; j++) {
      processedLines.push(lines[j]);
    }
  }
  
  return processedLines.join('\n');
};

/**
 * Format table with proper alignment and structure
 * @param tableLines Array of lines that form a markdown table
 * @returns Properly formatted table lines
 */
const formatTable = (tableLines: string[]): string[] => {
  if (tableLines.length < 2) {
    return tableLines; // Not enough lines for a proper table
  }
  
  const cleanedLines = tableLines.map(line => {
    return line
      .replace(/\[UNK\]:|<unk>|<pad>|\[PAD\]/g, "")
      .replace(/→\s*T\s*→/g, "→")
      .replace(/\|\s*\|\s*\|/g, "| |") // Replace empty adjacent cells
      .replace(/\|\s*/g, "| ")
      .replace(/\s*\|/g, " |")
      .trim();
  });
  
  const headerLine = cleanedLines[0];
  const headerParts = headerLine.split('|').filter(part => part.trim() !== '');
  const columnCount = headerParts.length;
  
  if (columnCount === 0) {
    return tableLines; // No valid columns, return original
  }
  
  const alignmentLine = cleanedLines.length > 1 ? cleanedLines[1] : '';
  const isSecondLineAlignmentRow = alignmentLine.includes('---') || 
                                   alignmentLine.includes(':-') || 
                                   alignmentLine.includes('-:');
  
  const alignments: ('left' | 'center' | 'right')[] = [];
  
  if (isSecondLineAlignmentRow) {
    const alignmentParts = alignmentLine.split('|').filter(part => part.trim() !== '');
    
    for (let i = 0; i < columnCount; i++) {
      const part = i < alignmentParts.length ? alignmentParts[i].trim() : '---';
      
      if (part.startsWith(':') && part.endsWith(':')) {
        alignments.push('center');
      } else if (part.endsWith(':')) {
        alignments.push('right');
      } else {
        alignments.push('left');
      }
    }
  } else {
    alignments.fill('left', 0, columnCount);
  }
  
  const formattedHeaders = headerParts.map(header => header.trim());
  const formattedHeaderLine = `| ${formattedHeaders.join(' | ')} |`;
  
  const separators = alignments.map(align => {
    switch (align) {
      case 'center': return ':---:';
      case 'right': return '---:';
      default: return '---';
    }
  });
  const formattedSeparatorLine = `| ${separators.join(' | ')} |`;
  
  const formattedTable: string[] = [formattedHeaderLine, formattedSeparatorLine];
  
  const startRow = isSecondLineAlignmentRow ? 2 : 1;
  
  for (let i = startRow; i < cleanedLines.length; i++) {
    const currentLine = cleanedLines[i];
    if (!currentLine.trim()) continue; // Skip empty lines
    
    const rowParts = currentLine.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    let rowCells = rowParts.map(cell => cell.trim());
    
    while (rowCells.length < columnCount) {
      rowCells.push(''); // Add empty cells to match column count
    }
    
    if (rowCells.length > columnCount) {
      rowCells = rowCells.slice(0, columnCount);
    }
    
    const formattedRow = `| ${rowCells.join(' | ')} |`;
    formattedTable.push(formattedRow);
  }
  
  return formattedTable;
};

const sanitizeMarkdown = (markdown: string): string => {
  if (!markdown) return "";

  let sanitized = markdown
    .replace(/<think[^>]*>.*?<\/think>/gi, "")
    .replace(/<unknown[^>]*>.*?<\/unknown>/gi, "")
    .replace(/\[UNK\]:/g, "") 
    .replace(/\[PAD\]/g, "") 
    .replace(/<internal[^>]*>.*?<\/internal>/gi, "")
    .replace(/<eval[^>]*>.*?<\/eval>/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  sanitized = sanitized
    .replace(/!\[(.*?)\]\((.*?)\)+/g, (match, alt, url) => { // Fix extra closing parens
      const cleanUrl = url.replace(/\)+$/, "");
      return `![${alt}](${cleanUrl})`;
    })
    .replace(/\[Image[^\]]*\]\(([^)]+)\)/gi, (match, url) => { // Add missing exclamation
      if (!match.startsWith("!")) return `!${match}`;
      return match;
    });

  sanitized = sanitized
    .replace(/^(#{1,6})([^#\s])/gm, "$1 $2")
    .replace(/\b(CERTIFICATE|CERTIFY|COMPLETED)\b/g, "**$1**")
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/``([^`]+)``/g, "`$1`")
    .replace(/\|\s*-\s+/g, "| • ");

  sanitized = processTableMarkdown(sanitized); // Table processing remains crucial
  
  sanitized = sanitized.replace(/→\s*T\s*→/g, "→");

  return sanitized;
};

const ImageFallback = ({
  alt,
  description,
}: {
  alt: string;
  description?: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4 bg-muted/20 border border-border rounded-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-muted-foreground/70"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="text-xs text-muted-foreground text-center">
        <span className="font-normal">{alt}</span>
        {description && (
          <span className="block text-muted-foreground/70 mt-1">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

const MarkdownComponents = {
  p: ({ node, ...props }: any) => (
    <p className="mb-4 leading-relaxed text-foreground" {...props} />
  ),

  wrapper: ({ node, ...props }: any) => {
    const content = props.children?.join?.("") || "";
    const isCertificate =
      content.includes("CERTIFICATE") && content.includes("CERTIFY");
    if (isCertificate) {
      return (
        <div className="certificate-container p-8 border border-border rounded-lg bg-card my-8 shadow-lg max-w-4xl mx-auto">
          <div className="certificate-content text-center" {...props} />
        </div>
      );
    }
    return <div className="markdown-wrapper" {...props} />;
  },

  // FIX: Heading colors
  h1: ({ node, ...props }: any) => (
    <h1 className="text-foreground font-semibold mt-6 mb-4" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-foreground font-semibold mt-5 mb-3" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-foreground font-semibold mt-4 mb-2" {...props} />
  ),
  h4: ({ node, ...props }: any) => (
    <h4 className="text-foreground font-semibold mt-3 mb-2" {...props} />
  ),
  h5: ({ node, ...props }: any) => (
    <h5 className="text-foreground font-semibold mt-3 mb-1" {...props} />
  ),
  h6: ({ node, ...props }: any) => (
    <h6 className="text-foreground font-semibold mt-3 mb-1" {...props} />
  ),

  img: ({ node, src: rawSrc, alt, ...props }: any) => {
    const [hasError, setHasError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [imageSrc, setImageSrc] = useState<string>("");

    useEffect(() => {
      const getImageWithAuth = async () => {
        if (!rawSrc) {
      setHasError(true);
          setLoading(false);
          return;
        }
        
        try {
          const resolvedSrc = resolveImageUrl(rawSrc);
          
          if (resolvedSrc.includes(BACKEND_BASE_URL)) {
          try {
            const token = await getUserToken();
            if (token) {
                const authUrl = `${resolvedSrc}${resolvedSrc.includes("?") ? "&" : "?"}token=${token}`;
                setImageSrc(authUrl);
            } else {
                setImageSrc(resolvedSrc);
            }
          } catch (error) {
              setImageSrc(resolvedSrc);
          }
        } else {
            setImageSrc(resolvedSrc);
          }
          
          setLoading(false);
        } catch (error) {
          setHasError(true);
          setLoading(false);
        }
      };
      
      getImageWithAuth();
    }, [rawSrc]);
    
    const handleError = () => {
      setHasError(true);
    };
    
    if (hasError || !rawSrc) {
      return (
        <ImageFallback
          alt={alt || "Failed to load image"}
          description={rawSrc ? `Source: ${rawSrc.substring(0, 30)}...` : "Missing source"}
        />
      );
    }

    if (loading) {
      return (
        <div className="flex justify-center items-center h-[200px] w-full my-4 bg-muted/30 rounded-md border border-border">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    return (
      <div className="my-4 text-center">
        <img
          src={imageSrc}
          alt={alt || "Image"}
          className="max-h-[80vh] w-auto mx-auto rounded-md border border-border shadow-sm"
          onError={handleError}
          loading="lazy"
          {...props}
        />
      </div>
    );
  },

  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 py-2 my-6 bg-muted/50 rounded-r-md text-foreground/80"
      {...props}
    />
  ),

  code: ({ node, inline, className, children, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    const isMath = className?.includes("math");
    const codeText = String(children).replace(/\n$/, "");

    const handleCopy = () => {
      navigator.clipboard.writeText(codeText).then(
        () => {
          setIsCopied(true);
          toast.success("Copied to clipboard!");
          setTimeout(() => setIsCopied(false), 2000);
        },
        (err) => {
          console.error("Failed to copy text: ", err);
          toast.error("Failed to copy.");
        },
      );
    };

    if (isMath) {
      return (
        <div className="my-6 py-2 text-foreground overflow-x-auto math-container" {...props}>
          {children}
        </div>
      );
    }

    if (!inline) {
      return (
        <div className="relative group/pre my-6 w-full">
          <div className="absolute top-0 right-0 z-10 flex items-center px-2 py-1 space-x-2">
            {language && (
              <span className="px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary rounded border border-primary/20">
                {language}
              </span>
            )}
            <button
              onClick={handleCopy}
              className="p-1.5 bg-card hover:bg-muted border border-border rounded-md opacity-0 group-hover/pre:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={isCopied ? "Copied!" : "Copy code"}
            >
              {isCopied ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ClipboardIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {language ? (
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: '0.375rem',
                padding: '1.25rem 1rem',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
              }}
              codeTagProps={{
                className: 'text-sm font-mono',
              }}
              showLineNumbers={language !== 'bash' && language !== 'shell' && codeText.split('\n').length > 5}
              wrapLines={true}
              wrapLongLines={true}
            >
              {codeText}
            </SyntaxHighlighter>
          ) : (
            <pre
              className={cn(
                className,
                "bg-muted/70 p-4 rounded-md overflow-x-auto border border-border text-sm"
              )}
              {...props}
            >
            <code>{children}</code>
          </pre>
          )}
        </div>
      );
    }

    if (isMath) {
      return (
        <code
          className={cn(className, "text-foreground font-normal")}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className={cn(
          className,
          "bg-muted/50 px-1 py-0.5 rounded-sm text-sm border border-border/50 text-foreground"
        )}
        {...props}
      >
        {children}
      </code>
    );
  },

  table: ({ node, ...props }: any) => (
    <div className="custom-table-wrapper">
      <table className="custom-table border border-border" {...props} />
    </div>
  ),

  thead: ({ node, ...props }: any) => (
    <thead className="bg-background" {...props} />
  ),
  
  tbody: ({ node, ...props }: any) => (
    <tbody {...props} />
  ),
  
  tr: ({ node, isHeader, ...props }: any) => {
    return (
      <tr 
        className="border border-border hover:bg-muted/10 transition-colors" 
        {...props} 
      />
    );
  },
  
  th: ({ node, align, ...props }: any) => {
    let alignClass = "table-cell-left";
    if (align === "center") alignClass = "table-cell-center";
    if (align === "right") alignClass = "table-cell-right";
    
    return (
      <th
        className={`px-4 py-3 font-semibold border border-border text-foreground ${alignClass}`}
      {...props}
    />
    );
  },
  
  td: ({ node, align, ...props }: any) => {
    let alignClass = "table-cell-left";
    if (align === "center") alignClass = "table-cell-center";
    if (align === "right") alignClass = "table-cell-right";
    
    return (
      <td
        className={`px-4 py-3 border border-border text-foreground align-top ${alignClass}`}
      {...props}
    />
    );
  },

  a: ({ node, href, children, ...props }: any) => {
    const isExternal = href?.startsWith("http") || href?.startsWith("https");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-primary hover:underline underline-offset-2 transition-colors font-medium"
        {...props}
      >
        {children}
        {isExternal && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 inline-block ml-1 mb-0.5 text-primary/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </a>
    );
  },

  math: ({ node, value, ...props }: any) => {
    return (
      <div className="math math-display katex-display" {...props}>
        {value}
      </div>
    );
  },
  inlineMath: ({ node, value, ...props }: any) => {
    return (
      <span className="math-inline" {...props}>
        {value}
      </span>
    );
  },
};

interface PageData {
  page_number: number;
  markdown_content: string;
}

interface TextSelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

interface DocumentViewerProps {
  pages: PageData[];
  fileName: string;
}

class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    console.error("Markdown rendering error:", error);
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 my-4 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="font-medium">Content Rendering Error</h3>
          </div>
          <p className="text-sm">
            There was an issue rendering a part of this document. This might be
            due to malformed content.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const AUTH_TOKEN_STORAGE_KEY = "readeasy_auth_token";

const getAuthToken = async (): Promise<string | null> => {
  const firebaseToken = await getUserToken();
  if (firebaseToken) return firebaseToken;
  if (typeof window !== "undefined") {
    const localToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (localToken) return localToken;
  }
  console.warn("No auth token available");
  return null;
};

// Update enhancedStyles with new sidebar behavior
const enhancedStyles = `
${mathStyles}

/* Hide scrollbar while keeping functionality */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Collapsible sidebar */
.sidebar-collapsed {
 width: 8px;
 min-width: 8px;
 transition: all 0.3s ease;
 position: relative;
 background: hsl(var(--card));
 border-left: 1px solid hsl(var(--border));
}

.sidebar-collapsed::before {
 content: '←';
 position: absolute;
 left: -24px;
 top: 50%;
 transform: translateY(-50%);
 width: 24px;
 height: 40px;
 background: hsl(var(--primary));
 border-radius: 6px 0 0 6px;
 transition: all 0.2s ease;
 display: flex;
 align-items: center;
 justify-content: center;
 color: hsl(var(--background));
 font-size: 18px;
 font-weight: bold;
 opacity: 1;
 cursor: pointer;
 border: 1px solid hsl(var(--border));
 border-right: none;
}

.sidebar-collapsed:hover::before {
 opacity: 0;
 transform: translateY(-50%) translateX(12px);
}

.sidebar-collapsed:hover {
 width: 320px;
 min-width: 320px;
}

.sidebar-content {
 width: 320px;
 opacity: 0;
 visibility: hidden;
 transition: all 0.2s ease;
}

.sidebar-collapsed:hover .sidebar-content {
 opacity: 1;
 visibility: visible;
}

/* Enhanced scrollbar styling */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted)) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted));
  border-radius: 3px;
}

/* Glassmorphism effects */
.glass-panel {
  background: hsl(var(--background)/80%);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border)/50%);
}

/* Floating action button */
.floating-action-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 50;
  padding: 1rem;
  border-radius: 9999px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  box-shadow: 0 4px 12px -2px hsl(var(--primary)/30%);
  transition: transform 0.2s ease;
}

.floating-action-button:hover {
  transform: translateY(-2px);
}

/* Enhanced sidebar design */
.sidebar-section {
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: hsl(var(--card)/70%);
  border: 1px solid hsl(var(--border)/60%);
  margin-bottom: 1rem;
}

.sidebar-section:hover {
  background: hsl(var(--card)/90%);
}

/* Page navigation pills */
.page-pill {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.page-pill.active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  box-shadow: 0 2px 8px -2px hsl(var(--primary)/30%);
}

.page-pill:not(.active) {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.page-pill:not(.active):hover {
  background: hsl(var(--muted)/80%);
}

/* Header redesign */
.header-container {
  background: linear-gradient(to right, 
    hsl(var(--background)), 
    hsl(var(--background)/95%)
  );
  border-bottom: 1px solid hsl(var(--border)/40%);
  backdrop-filter: blur(8px);
}

/* Content area enhancements */
.content-container {
  background: linear-gradient(
    135deg,
    hsl(var(--background)) 0%,
    hsl(var(--background)/98%) 100%
  );
}

/* Animated progress bar */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    to right,
    hsl(var(--primary)/30%),
    hsl(var(--primary))
  );
  transform-origin: 0%;
  z-index: 50;
}
`;

export function DocumentViewer({ pages, fileName }: DocumentViewerProps) {
  const router = useRouter();
  const totalPages = pages.length;
  const [currentPage, setCurrentPage] = useState(1);
  const [fontSize, setFontSize] = useState(100);
  const [fontFamily, setFontFamily] = useState("default");
  const [layoutWidth, setLayoutWidth] = useState(70); // Default to a slightly narrower comfortable width
  const [isPrepareDownload, setIsPrepareDownload] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const [transformedContent, setTransformedContent] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile

  const [selectionMenu, setSelectionMenu] = useState<TextSelectionMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
  });
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [rephrasedText, setRephrasedText] = useState<string | null>(null);
  const [rephrasingMode, setRephrasingMode] = useState<string>("summarize");
  const [showRephrasingDialog, setShowRephrasingDialog] = useState(false);

  if (!pages || pages.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 rounded-lg border border-border bg-card shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <h3 className="mt-2 text-lg font-medium text-foreground">
            No Document Content
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The document has no pages or is still loading.
          </p>
        </div>
      </div>
    );
  }

  const page = pages[currentPage - 1];

  useEffect(() => {
    if (page?.markdown_content) {
      // Primary image URL transformation is now done by the backend.
      // Frontend sanitization focuses on structural integrity and minor fixes.
      // Custom patterns like {image:XXX} if still needed from other sources, 
      // would rely on sanitizeMarkdown and resolveImageUrl to handle them.
      let content = page.markdown_content;

      // Example of a custom pattern if it still exists from a source NOT processed by backend:
      // content = content.replace(/\{image:\s*(\w+)\}/g, "![Image](img_$1)"); 
      // This would then be handled by resolveImageUrl's legacy fallback.
      // Ideally, all image URLs are fully resolved by backend before reaching here.

      // Ensure LaTeX expressions have proper spacing
      content = content.replace(/\\text\s*{([^}]+)}/g, '\\text{$1}');
      content = content.replace(/\\left\(/g, '\\left(');
      content = content.replace(/\\right\)/g, '\\right)');
      content = content.replace(/\\min\s/g, '\\min');

      const sanitized = sanitizeMarkdown(content);
      const trimmedContent = sanitized.replace(/^\s+/, "");
      setTransformedContent(trimmedContent);
    } else {
      setTransformedContent("");
    }
    if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
  }, [currentPage, page]);

  const navigatePage = (newPageNum: number) => {
    if (newPageNum >= 1 && newPageNum <= totalPages) {
      setCurrentPage(newPageNum);
    }
  };

  const nextPage = () => navigatePage(currentPage + 1);
  const prevPage = () => navigatePage(currentPage - 1);
  const jumpToPage = (pageNum: number) => navigatePage(pageNum);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        return; // Don't interfere with form inputs
      }
      try {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nextPage();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          prevPage();
        }
      } catch (error) {
        console.error("Error in keyboard navigation:", error);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  const handleDownload = () => {
    setIsPrepareDownload(true);
    try {
      const allContent = pages
        .map((p) => sanitizeMarkdown(p.markdown_content))
        .join("\n\n---\n\n");
      const blob = new Blob([allContent], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName.replace(/\.\w+$/, "") || "document"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch (error) {
      console.error("Error preparing download:", error);
      toast.error("Download failed.");
    } finally {
      setIsPrepareDownload(false);
    }
  };

  if (!page) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 max-w-md rounded-lg border border-destructive/50 bg-destructive/10 shadow-sm">
          <h3 className="text-lg font-medium text-destructive">
            Error Loading Page
          </h3>
          <p className="mt-2 text-sm text-destructive/90">
            Could not find page {currentPage}. This may be due to a processing
            error or corrupted document.
          </p>
          <div className="mt-4">
            <Button variant="destructive" onClick={() => jumpToPage(1)}>
              Go to First Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fontFamilyMap: Record<string, string> = {
    default: "var(--font-sans)", // Use CSS variable for default
    serif: "Georgia, 'Times New Roman', Times, serif",
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  };

  const contentStyle = {
    fontSize: `${fontSize}%`,
    fontFamily: fontFamilyMap[fontFamily],
    // maxWidth is handled by Tailwind class on main content
  };

  const increaseFontSize = () =>
    setFontSize((prev) => Math.min(prev + 10, 200));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 10, 70));
  const increaseWidth = () => setLayoutWidth((prev) => Math.min(prev + 5, 100)); // finer control
  const decreaseWidth = () => setLayoutWidth((prev) => Math.max(prev - 5, 50)); // finer control
  const resetSettings = () => {
    setFontSize(100);
    setFontFamily("default");
    setLayoutWidth(70);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selectedText = selection.toString().trim();
      if (selectedText.length > 5 && selectedText.length < 1000) {
        // Basic length check
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionMenu({
          visible: true,
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.bottom + window.scrollY + 8,
          selectedText: selectedText,
        });
      } else if (selectedText.length > 0) {
        // Text selected but doesn't meet criteria
        setSelectionMenu((prev) => ({ ...prev, visible: false }));
      }
    } else {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleRephrase = async (mode: string) => {
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
    setRephrasingMode(mode);
    setShowRephrasingDialog(true);
    setIsRephrasing(true);
    setRephrasedText(null); // Clear previous

    try {
      const textToRephrase = selectionMenu.selectedText;
      const authTokenForRephrase = await getAuthToken();
      if (!authTokenForRephrase) throw new Error("Authentication token not available.");

      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/process/rephrase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokenForRephrase}`,
          },
          body: JSON.stringify({
            text_content: textToRephrase,
            mode: mode,
            document_type: "general",
          }),
        },
      );

      if (!response.ok)
        throw new Error(
          `API error: ${response.status} ${await response.text()}`,
        );
      const data = await response.json();
      setRephrasedText(data.rephrased_text);
    } catch (error: any) {
      console.error("Error rephrasing text:", error);
      toast.error(`Rephrasing failed: ${error.message}`);
      // setShowRephrasingDialog(false); // Keep dialog open to show error or allow retry?
    } finally {
      setIsRephrasing(false);
    }
  };

  const applyRephrasedText = () => {
    if (rephrasedText && transformedContent) {
      const updatedContent = transformedContent.replace(
        selectionMenu.selectedText,
        rephrasedText,
      );
      setTransformedContent(updatedContent);
      toast.success("Text updated in viewer.");
    }
    closeRephrasingDialog();
  };

  const closeRephrasingDialog = () => {
    setShowRephrasingDialog(false);
  };

  useEffect(() => {
    const mainContentArea = contentContainerRef.current;
    if (mainContentArea) {
      mainContentArea.addEventListener("mouseup", handleTextSelection);
      mainContentArea.addEventListener("touchend", handleTextSelection); // For touch devices
    }
    return () => {
      if (mainContentArea) {
        mainContentArea.removeEventListener("mouseup", handleTextSelection);
        mainContentArea.removeEventListener("touchend", handleTextSelection);
      }
    };
  }, [transformedContent]); 

  const sidebarContent = (
    <div className="h-full flex flex-col p-4 space-y-6 bg-card text-card-foreground">
      {/* Page Navigation Section */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Page Navigation
        </h4>
        {totalPages <= 12 ? ( 
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => jumpToPage(index + 1)}
                className={cn(
                  "h-9 flex items-center justify-center text-xs rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                  currentPage === index + 1
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground",
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : (
          <div className="relative">
            <select
              value={currentPage}
              onChange={(e) => jumpToPage(Number(e.target.value))}
              className="w-full h-10 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
              aria-label="Jump to page"
            >
              {Array.from({ length: totalPages }).map((_, index) => (
                <option key={index} value={index + 1}>
                  Page {index + 1}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
        )}
      </div>

      {/* File Controls Section */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">File</h4>
        <Button
          onClick={handleDownload}
          disabled={isPrepareDownload}
          className="w-full bg-black hover:bg-neutral-800 text-white" // User preferred black button
          variant="default"
        >
          {isPrepareDownload ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Preparing...
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Download Markdown
            </>
          )}
        </Button>
      </div>

      {/* Customization Controls Section */}
      <div className="mt-auto space-y-4">
        {" "}
        {/* Pushes to bottom if not enough content above */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-muted-foreground">
            Appearance
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowPathIcon className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
        {/* Font size */}
        <div>
          <label
            htmlFor="font-size"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Text Size: {fontSize}%
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={decreaseFontSize}
              variant="outline"
              size="sm"
              className="flex-1 bg-background"
            >
              <MinusIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={increaseFontSize}
              variant="outline"
              size="sm"
              className="flex-1 bg-background"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Font family */}
        <div>
          <label
            htmlFor="font-family"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Font Family
          </label>
          <div className="relative">
            <select
              id="font-family"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="default">Default</option>
              <option value="serif">Serif</option>
              <option value="sans">Sans-serif</option>
              <option value="mono">Monospace</option>
            </select>
            <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
        </div>
        {/* Layout width */}
        <div>
          <label
            htmlFor="layout-width"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Content Width: {layoutWidth}%
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={decreaseWidth}
              variant="outline"
              size="sm"
              className="flex-1 bg-background"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />{" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 6H6M8 18H6"
                />
              </svg>
            </Button>
            <Button
              onClick={increaseWidth}
              variant="outline"
              size="sm"
              className="flex-1 bg-background"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />{" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 6h2m-2 12h2"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground antialiased">
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "!bg-card !text-card-foreground !border !border-border !shadow-lg",
        }}
      />

      <style jsx global>
        {enhancedStyles}
      </style>

      {/* Progress bar showing current page progress */}
      <div 
        className="progress-bar" 
        style={{ 
          transform: `scaleX(${currentPage / totalPages})`,
          transition: 'transform 0.3s ease' 
        }} 
      />

      {/* Enhanced Header */}
      <header className="header-container sticky top-0 z-20 px-4 h-16">
        <div className="h-full max-w-[2000px] mx-auto flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-full hover:bg-muted/80 transition-colors"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DocumentArrowDownIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-base font-medium truncate max-w-[200px] sm:max-w-sm">
            {fileName}
          </span>
            </div>
        </div>

          {/* Center section - Page Navigation */}
          <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevPage}
            disabled={currentPage === 1}
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
            <div className="page-pill active">
              {currentPage} / {totalPages}
            </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPage}
            disabled={currentPage === totalPages}
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>

          {/* Right section
          <div className="flex items-center justify-end gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
            onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-full px-4 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <CogIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Customize</span>
            </Button>
          </div> */}
        </div>
      </header>

      {/* Main Layout with Enhanced Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div
          ref={contentContainerRef}
          className="content-container flex-1 overflow-y-auto relative hide-scrollbar"
          onMouseUp={handleTextSelection}
        >
          <main
            key={currentPage}
            className={cn(
              "mx-auto px-6 sm:px-8 md:px-12 py-8 pb-36 prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none transition-all duration-300 ease-in-out text-foreground",
            )}
            style={{
              width: `${layoutWidth}%`,
              ...contentStyle,
            }}
          >
            <MarkdownErrorBoundary>
              <div className="markdown-content w-full text-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={MarkdownComponents}
                  urlTransform={resolveImageUrl}
                  skipHtml={true}
                >
                  {transformedContent ||
                    "# Page Empty\n\nThis page appears to be empty or is still loading."}
                </ReactMarkdown>
              </div>
            </MarkdownErrorBoundary>
          </main>
        </div>

        {/* Enhanced Desktop Sidebar with Hover */}
        <aside
          className="hidden md:block sidebar-collapsed"
        >
          <div className="sidebar-content h-full overflow-y-auto hide-scrollbar">
            <div className="p-6 space-y-6">
              {/* Page Navigation Section */}
              <div className="sidebar-section">
                <h4 className="text-sm font-medium text-primary mb-4">
                  Quick Navigation
                </h4>
                {totalPages <= 12 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => jumpToPage(index + 1)}
                        className={cn(
                          "h-9 flex items-center justify-center text-xs rounded-lg transition-all",
                          currentPage === index + 1
                            ? "bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 scale-105"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:scale-102"
                        )}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={currentPage}
                      onChange={(e) => jumpToPage(Number(e.target.value))}
                      className="w-full h-10 px-4 text-sm bg-muted border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none transition-colors"
                    >
                      {Array.from({ length: totalPages }).map((_, index) => (
                        <option key={index} value={index + 1}>
                          Page {index + 1}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Enhanced Customization Controls */}
              <div className="sidebar-section">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-primary">
                    Reading Experience
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSettings}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                </div>

                {/* Font size control */}
                <div className="space-y-3 mb-6">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Text Size: {fontSize}%
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={decreaseFontSize}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                    <div className="w-16 text-center text-sm">{fontSize}%</div>
                    <Button
                      onClick={increaseFontSize}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Font family selector */}
                <div className="space-y-3 mb-6">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Typography
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(fontFamilyMap).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setFontFamily(key)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-lg transition-all",
                          fontFamily === key
                            ? "bg-primary text-primary-foreground font-medium"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                        style={{ fontFamily: value }}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width control */}
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Content Width: {layoutWidth}%
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={decreaseWidth}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M15 19l-7-7 7-7" />
                        <path d="M8 6H6M8 18H6" />
                      </svg>
                    </Button>
                    <div className="w-16 text-center text-sm">{layoutWidth}%</div>
                    <Button
                      onClick={increaseWidth}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M9 5l7 7-7 7" />
                        <path d="M16 6h2m-2 12h2" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Download section */}
              <div className="sidebar-section">
                <Button
                  onClick={handleDownload}
                  disabled={isPrepareDownload}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-102"
                >
                  {isPrepareDownload ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Preparing...
                    </>
                  ) : (
                    <>
                      <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                      Download Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Enhanced Mobile Sidebar */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-card shadow-2xl border-l border-border/40">
              <div className="p-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-full hover:bg-muted/80"
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>
              <div className="px-4 pb-4">
              {sidebarContent}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating action button for mobile */}
              <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden floating-action-button"
              >
        <CogIcon className="w-6 h-6" />
              </button>

      {/* Rephrasing Dialog */}
      <Dialog open={showRephrasingDialog} onOpenChange={closeRephrasingDialog}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {rephrasingMode === 'summarize' && 'Summarized Text'}
              {rephrasingMode === 'eli5' && 'Simplified Explanation (ELI5)'}
              {rephrasingMode === 'remove_jargon' && 'Jargon-Free Text'}
            </DialogTitle>
            <DialogDescription>
              {isRephrasing
                ? 'AI is working its magic...'
                : 'Review the rephrased content below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto my-4 p-4 bg-muted/50 rounded-md border border-border">
            {isRephrasing ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <svg
                  className="animate-spin h-8 w-8 mb-3 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground debug-view">
                {rephrasedText ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={MarkdownComponents} // Use same components for consistency
                    urlTransform={resolveImageUrl} // Add consistent URL transformation
                    skipHtml={true} // Consistent with main markdown renderer
                  >
                    {rephrasedText}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">
                    No rephrased text available. An error might have occurred.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={applyRephrasedText}
              disabled={isRephrasing || !rephrasedText}
              // variant="default" // Shadcn default usually primary
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
