import { Container } from 'inversify';
import { DatabaseClient, MongoDatabaseClient } from '../shared/libs/database-client/index.js';
import { ConsoleLogger, Logger } from '../shared/libs/logger/index.js';
import { createOfferContainer } from '../shared/modules/offer/index.js';
import { createUserContainer } from '../shared/modules/user/index.js';
import { Component } from '../shared/types/index.js';

export function createCliContainer(): Container {
  const container = new Container();

  container.bind<Logger>(Component.Logger).to(ConsoleLogger).inSingletonScope();
  container.bind<DatabaseClient>(Component.DatabaseClient).to(MongoDatabaseClient).inSingletonScope();

  container.load(
    createUserContainer(),
    createOfferContainer(),
  );

  return container;
}
