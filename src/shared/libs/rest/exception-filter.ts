import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { Logger } from '../logger/index.js';
import { Component } from '../../types/index.js';
import { ExceptionFilterInterface } from './exception-filter.interface.js';
import { HttpError } from './http-error.js';

@injectable()
export class ExceptionFilter implements ExceptionFilterInterface {
  constructor(@inject(Component.Logger) private readonly logger: Logger) {}

  public catch: ErrorRequestHandler = (exception: unknown, request, response, next): void => {
    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${request.method} ${request.path}: ${error.message}`, error);
    if (response.headersSent) {
      next(exception);
      return;
    }

    let status = StatusCodes.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    if (error instanceof HttpError) {
      status = error.statusCode;
      message = error.message;
    } else if (error instanceof mongoose.Error.CastError || error instanceof mongoose.Error.ValidationError || error instanceof MulterError) {
      status = StatusCodes.BAD_REQUEST;
      message = 'Invalid request data';
    } else if ('type' in error && error.type === 'entity.parse.failed') {
      status = StatusCodes.BAD_REQUEST;
      message = 'Invalid JSON';
    } else if ('type' in error && error.type === 'entity.too.large') {
      status = StatusCodes.REQUEST_TOO_LONG;
      message = 'Request body is too large';
    } else if ('code' in error && error.code === 11000) {
      status = StatusCodes.CONFLICT;
      message = 'User with this email already exists';
    }
    response.status(status).json({ message });
  };
}
