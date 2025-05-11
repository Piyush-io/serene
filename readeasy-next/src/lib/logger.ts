/**
 * Logger utility for client-side logging
 * 
 * This utility provides a consistent way to log messages in the application.
 * In production, it will only log errors and warnings by default.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

// Default options based on environment
const defaultOptions: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production',
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  prefix: '[ReadEasy]'
};

// Log level priorities (higher number = higher priority)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Check if a log level should be displayed based on the current settings
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.options.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.level];
  }

  /**
   * Format a message with the prefix
   */
  private formatMessage(message: string): string {
    return this.options.prefix ? `${this.options.prefix} ${message}` : message;
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  /**
   * Create a child logger with a different prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix
    });
  }
}

// Export a default instance
export const logger = new Logger();

// Export the class for custom instances
export default Logger;
