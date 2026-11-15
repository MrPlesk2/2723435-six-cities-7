import { ErrorRequestHandler } from 'express';

export interface ExceptionFilterInterface {
  catch: ErrorRequestHandler;
}
