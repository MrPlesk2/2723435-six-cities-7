import express, { Express } from 'express';
import { Server } from 'node:http';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { getMongoURI } from '../shared/helpers/index.js';
import { Config, RestSchema } from '../shared/libs/config/index.js';
import { DatabaseClient } from '../shared/libs/database-client/index.js';
import { Logger } from '../shared/libs/logger/index.js';
import { ExceptionFilterInterface, HttpError } from '../shared/libs/rest/index.js';
import { OfferController } from '../shared/modules/offer/offer.controller.js';
import { UserController } from '../shared/modules/user/user.controller.js';
import { FavoriteController } from '../shared/modules/favorite/favorite.controller.js';
import { Component } from '../shared/types/index.js';

@injectable()
export class RestApplication {
  public readonly app: Express = express();
  private server?: Server;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
    @inject(Component.DatabaseClient) private readonly databaseClient: DatabaseClient,
    @inject(Component.OfferController) private readonly offers: OfferController,
    @inject(Component.UserController) private readonly users: UserController,
    @inject(Component.FavoriteController) private readonly favorites: FavoriteController,
    @inject(Component.ExceptionFilter) private readonly exceptionFilter: ExceptionFilterInterface,
  ) {}

  private async initDb(): Promise<void> {
    const mongoUri = getMongoURI(
      this.config.get('DB_USER'), this.config.get('DB_PASSWORD'),
      this.config.get('DB_HOST'), this.config.get('DB_PORT'), this.config.get('DB_NAME'),
    );
    return this.databaseClient.connect(mongoUri);
  }

  private initMiddleware(): void {
    this.app.use(express.json());
  }

  private initControllers(): void {
    this.app.use('/offers', this.offers.router);
    this.app.use('/users', this.users.router);
    this.app.use('/favorites', this.favorites.router);
  }

  private initExceptionFilters(): void {
    this.app.use((request, _response, next) => {
      next(new HttpError(StatusCodes.NOT_FOUND, `Route ${request.method} ${request.path} not found`));
    });
    this.app.use(this.exceptionFilter.catch);
  }

  private async initServer(): Promise<void> {
    const port = this.config.get('PORT');
    await new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port);
      this.server.once('error', reject);
      this.server.once('listening', () => {
        this.server?.removeListener('error', reject);
        resolve();
      });
    });
    this.logger.info(`Server is listening on port ${port}`);
  }

  public async init(): Promise<void> {
    this.logger.info('Application initialization');
    try {
      await this.initDb();
      this.initMiddleware();
      this.initControllers();
      this.initExceptionFilters();
      await this.initServer();
    } catch (error) {
      await this.databaseClient.disconnect();
      throw error;
    }
  }

  public async close(): Promise<void> {
    const server = this.server;
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    await this.databaseClient.disconnect();
  }
}
