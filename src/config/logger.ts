import { createLogger, transports, format, Logger } from 'winston';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const { combine, timestamp, label, printf } = format;

// Ensure logs directory exists
const logDir: string = 'logs';
if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

// Custom log message format
const myFormat = printf(({ level, label, message, timestamp }) => {
  return `${timestamp} [${level}] ${label} ${message}`;
});

// Format error stacks
const enumerateErrorFormat = format((info) => {
  if (info instanceof Error) {
    return Object.assign({}, info, { message: info.stack });
  }
  return info;
});

// Define transport options type
interface TransportOptions {
  level: string;
  handleExceptions: boolean;
  json: boolean;
  colorize: boolean;
  filename?: string;
  maxsize?: number;
  maxFiles?: number;
}

// Set up transport options
const options: {
  file: TransportOptions;
  console: TransportOptions;
} = {
  file: {
    level: 'info',
    filename: join(logDir, 'app-logs.log'),
    handleExceptions: true,
    json: false,
    maxsize: 5 * 1024 * 1024,
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'info',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// Create Winston logger
const logger: Logger = createLogger({
  level: 'info',
  format: combine(
    enumerateErrorFormat(),
    label({ label: 'Response =>' }),
    timestamp({ format: 'HH:mm:ss' }),
    myFormat
  ),
  transports: [
    new transports.Console(options.console),
    // new transports.File(options.file),
  ],
  exitOnError: false,
});

export default logger;
