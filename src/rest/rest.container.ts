import { ExceptionFilter, ExceptionFilterInterface } from '../shared/libs/rest/index.js';
import { AuthService } from '../shared/modules/user/auth.service.js';
import { OfferController } from '../shared/modules/offer/offer.controller.js';
import { UserController } from '../shared/modules/user/user.controller.js';
import { FavoriteController } from '../shared/modules/favorite/favorite.controller.js';
import { Container } from 'inversify';
import { Config, RestConfig, RestSchema } from '../shared/libs/config/index.js';
import { DatabaseClient, MongoDatabaseClient } from '../shared/libs/database-client/index.js';
import { Logger, PinoLogger } from '../shared/libs/logger/index.js';
import { createCommentContainer } from '../shared/modules/comment/index.js';
import { createOfferContainer } from '../shared/modules/offer/index.js';
import { createUserContainer } from '../shared/modules/user/index.js';
import { Component } from '../shared/types/index.js';
import { RestApplication } from './rest.application.js';

export function createRestApplicationContainer(): Container {
  const container = new Container();

  container.bind<RestApplication>(Component.RestApplication).to(RestApplication).inSingletonScope();
  container.bind<Logger>(Component.Logger).to(PinoLogger).inSingletonScope();
  container.bind<Config<RestSchema>>(Component.Config).to(RestConfig).inSingletonScope();
  container.bind<DatabaseClient>(Component.DatabaseClient).to(MongoDatabaseClient).inSingletonScope();

  container.bind<AuthService>(Component.AuthService).to(AuthService).inSingletonScope();
  container.bind<OfferController>(Component.OfferController).to(OfferController).inSingletonScope();
  container.bind<UserController>(Component.UserController).to(UserController).inSingletonScope();
  container.bind<FavoriteController>(Component.FavoriteController).to(FavoriteController).inSingletonScope();
  container.bind<ExceptionFilterInterface>(Component.ExceptionFilter).to(ExceptionFilter).inSingletonScope();

  container.load(
    createUserContainer(),
    createOfferContainer(),
    createCommentContainer(),
  );

  return container;
}
