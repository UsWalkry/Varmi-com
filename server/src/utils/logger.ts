// 🛡️ Winston Logger with File Rotation
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = resolve(__dirname, '../../logs');

// Log formatı
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Rotating file transport (errors)
const errorFileTransport = new DailyRotateFile({
  filename: resolve(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '14d',
  maxSize: '20m',
  format: logFormat
});

// Rotating file transport (combined)
const combinedFileTransport = new DailyRotateFile({
  filename: resolve(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '7d',
  maxSize: '20m',
  format: logFormat
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  )
});

// Logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    errorFileTransport,
    combinedFileTransport,
    consoleTransport
  ],
  exitOnError: false
});

// HTTP request logger
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `${method} ${url} ${statusCode} - ${duration}ms`);
}

// Database query logger
export function logQuery(query: string, duration: number, error?: Error) {
  if (error) {
    logger.error(`DB Query failed (${duration}ms): ${query}`, { error: error.message });
  } else if (duration > 1000) {
    logger.warn(`Slow query (${duration}ms): ${query}`);
  } else {
    logger.debug(`Query executed (${duration}ms): ${query.substring(0, 100)}...`);
  }
}

// Convenience exports
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);

export default logger;
