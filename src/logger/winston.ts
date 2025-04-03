import { TransformableInfo } from 'logform';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, errors } = format;

// Custom format to handle additional metadata/objects
const addMetadata = format(info => {
  const args = info[Symbol.for('splat')];
  if (args && Array.isArray(args)) {
    info.metadata = args.length === 1 ? args[0] : args;
  }
  return info;
});

// Custom log format
const logFormat = printf((info: TransformableInfo) => {
  const { timestamp, level, message, stack, metadata } = info;
  let logMessage = `${timestamp} [${level}]: ${message}`;

  // Add metadata if it exists
  if (metadata) {
    logMessage += ` ${JSON.stringify(metadata, null, 2)}`;
  }

  return stack ? `${logMessage}\n${stack}` : logMessage;
});

// Common format for all transports
const commonFormat = combine(
  errors({ stack: true }), // Enable error stack traces
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  addMetadata(),
  logFormat
);

// Create Winston logger
export const logger = createLogger({
  level: 'info', // Default log level
  transports: [
    new transports.Console({
      format: format.combine(format.colorize({ all: true }), commonFormat),
    }),
  ],
});
