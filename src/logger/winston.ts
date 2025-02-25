import { createLogger, format, transports } from "winston";
import { TransformableInfo } from "logform";

const { combine, timestamp, printf, errors } = format;

// Custom log format
const logFormat = printf((info: TransformableInfo) => {
  const { timestamp, level, message, stack } = info;
  const logMessage = `${timestamp} [${level}]: ${message}`;
  return stack ? `${logMessage}\n${stack}` : logMessage;
});

// Common format for all transports
const commonFormat = combine(
  errors({ stack: true }), // Enable error stack traces
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  logFormat
);

// Create Winston logger
export const logger = createLogger({
  level: "info", // Default log level
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.splat(),
        commonFormat
      ),
    }),
  ],
});
