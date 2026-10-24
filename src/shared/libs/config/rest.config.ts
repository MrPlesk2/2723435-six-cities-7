import { config } from 'dotenv';
import { inject, injectable } from 'inversify';
import { Component } from '../../types/index.js';
import { Logger } from '../logger/index.js';
import { Config } from './config.interface.js';
import { createRestSchema, RestSchema } from './rest.schema.js';

@injectable()
export class RestConfig implements Config<RestSchema> {
  private readonly config: RestSchema;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger
  ) {
    const parsedOutput = config();

    if (parsedOutput.error) {
      this.logger.warn('Can\'t read .env file. Using process environment variables only.');
    } else {
      this.logger.info('.env file found and successfully parsed!');
    }

    const schema = createRestSchema();
    schema.validate({ allowed: 'strict' });

    this.config = schema.getProperties();
  }

  public get<K extends keyof RestSchema>(key: K): RestSchema[K] {
    return this.config[key];
  }
}
