/**
 * Simple error logging system that sends errors to our backend
 */

interface ErrorLogData {
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  route?: string;
  component?: string;
  source?: string;
  line?: number;
  column?: number;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private logEndpoint: string;
  private userId?: string;
  private userEmail?: string;

  private constructor() {
    // Use server endpoint or fallback to current origin
    this.logEndpoint = import.meta.env.VITE_SERVER_URL 
      ? `${import.meta.env.VITE_SERVER_URL}/api/log`
      : '/api/log';
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Set current user context for error logs
   */
  public setUser(userId?: string, userEmail?: string) {
    this.userId = userId;
    this.userEmail = userEmail;
  }

  /**
   * Clear user context (on logout)
   */
  public clearUser() {
    this.userId = undefined;
    this.userEmail = undefined;
  }

  /**
   * Log an error to the backend
   */
  public async logError(error: Error | string, additionalData?: Partial<ErrorLogData>) {
    try {
      const errorData: ErrorLogData = {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' ? error.stack : undefined,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        userEmail: this.userEmail,
        route: window.location.pathname,
        ...additionalData,
      };

      // Try to send to backend
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('Error logged:', errorData);
      }
    } catch (logError) {
      // If logging fails, at least log to console
      console.error('Failed to log error to backend:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log a custom message (info, warning, etc.)
   */
  public async logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', additionalData?: Record<string, any>) {
    try {
      const logData = {
        message,
        level,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        userEmail: this.userEmail,
        route: window.location.pathname,
        ...additionalData,
      };

      await fetch(this.logEndpoint.replace('/api/log', '/api/log-message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });

      if (import.meta.env.DEV) {
        // console.log(`[${level.toUpperCase()}] ${message}`, logData);
      }
    } catch (logError) {
      console.error('Failed to log message to backend:', logError);
    }
  }

  /**
   * Initialize error listeners
   */
  public initializeErrorListeners() {
    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || event.message, {
        component: 'global-error-handler',
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason || 'Unhandled promise rejection', {
        component: 'promise-rejection-handler',
      });
    });

    // Legacy error handler
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError(error || message.toString(), {
        component: 'legacy-error-handler',
        source: source || '',
        line: lineno || 0,
        column: colno || 0,
      });
      return false; // Don't prevent default handling
    };

    if (import.meta.env.DEV) {
      // console.log('Error logging system initialized');
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Export utility functions for easy usage
export const logError = (error: Error | string, additionalData?: Partial<ErrorLogData>) => {
  return errorLogger.logError(error, additionalData);
};

export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', additionalData?: Record<string, any>) => {
  return errorLogger.logMessage(message, level, additionalData);
};

export const setUserContext = (userId?: string, userEmail?: string) => {
  errorLogger.setUser(userId, userEmail);
};

export const clearUserContext = () => {
  errorLogger.clearUser();
};

// Development helpers
if (import.meta.env.DEV) {
  (window as any).testErrorLog = () => {
    logError('Test error from window.testErrorLog');
  };
  
  (window as any).testMessageLog = () => {
    logMessage('Test message from window.testMessageLog', 'info', { test: true });
  };
}
