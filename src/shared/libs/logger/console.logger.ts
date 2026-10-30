import { injectable } from 'inversify';
import { Logger } from './logger.interface.js';

// Human-readable logger for the CLI, where pino's JSON output would be noisy.
@injectable()
export class ConsoleLogger implements Logger {
  public info(message: string, ...args: unknown[]): void {
    console.info(message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }

  public error(message: string, error: Error, ...args: unknown[]): void {
    console.error(message, ...args);
    console.error(`Error message: ${error.message}`);
  }

  // Debug messages are shown only when the DEBUG environment variable is set,
  // otherwise a large import would print a line per offer.
  public debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.debug(message, ...args);
    }
  }
}
