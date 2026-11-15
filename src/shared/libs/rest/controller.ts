import { Response, Router } from 'express';
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'inversify';
import { ControllerInterface } from './controller.interface.js';
import { Route } from './route.interface.js';

@injectable()
export abstract class Controller implements ControllerInterface {
  public readonly router = Router();

  protected addRoute<Params, Body>(route: Route<Params, Body>): void {
    this.router[route.method]<Params, unknown, Body>(route.path, ...(route.middleware ?? []), asyncHandler(route.handler.bind(this)));
  }

  protected send<T>(response: Response, statusCode: number, data: T): void {
    response.status(statusCode).json(data);
  }

  protected ok<T>(response: Response, data: T): void {
    this.send(response, StatusCodes.OK, data);
  }

  protected created<T>(response: Response, data: T): void {
    this.send(response, StatusCodes.CREATED, data);
  }

  protected noContent(response: Response): void {
    response.status(StatusCodes.NO_CONTENT).end();
  }
}
