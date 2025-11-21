/**
 * Utilitário de logging estruturado
 * Melhora a rastreabilidade de erros e debugging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? JSON.stringify(context, null, 2) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr ? '\n' + contextStr : ''}`;
  }

  /**
   * Log de informação
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  /**
   * Log de warning
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Log de erro com stack trace
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    };
    
    console.error(this.formatMessage('error', message, errorDetails));
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Cria um logger com contexto pré-definido
   */
  withContext(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalMethods = {
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
      debug: childLogger.debug.bind(childLogger),
    };

    childLogger.info = (message: string, additionalContext?: LogContext) => {
      originalMethods.info(message, { ...context, ...additionalContext });
    };

    childLogger.warn = (message: string, additionalContext?: LogContext) => {
      originalMethods.warn(message, { ...context, ...additionalContext });
    };

    childLogger.error = (message: string, error?: Error | unknown, additionalContext?: LogContext) => {
      originalMethods.error(message, error, { ...context, ...additionalContext });
    };

    childLogger.debug = (message: string, additionalContext?: LogContext) => {
      originalMethods.debug(message, { ...context, ...additionalContext });
    };

    return childLogger;
  }
}

export const logger = new Logger();

