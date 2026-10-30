import { setTimeout } from 'node:timers/promises';
import { inject, injectable } from 'inversify';
import mongoose, { Mongoose } from 'mongoose';
import { Component } from '../../types/index.js';
import { Logger } from '../logger/index.js';
import { DatabaseClient } from './database-client.interface.js';

const RETRY_COUNT = 5;
const RETRY_TIMEOUT_MS = 1000;
const SERVER_SELECTION_TIMEOUT_MS = 5000;

@injectable()
export class MongoDatabaseClient implements DatabaseClient {
  private mongoose: Mongoose | null = null;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger
  ) {}

  public async connect(uri: string): Promise<void> {
    if (this.mongoose) {
      throw new Error('MongoDB client is already connected');
    }

    this.logger.info('Trying to connect to MongoDB…');

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        this.mongoose = await mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
        this.logger.info('Database connection established.');
        return;
      } catch (error) {
        this.logger.error(`Failed to connect to the database. Attempt ${attempt} of ${RETRY_COUNT}`, error as Error);
        if (attempt < RETRY_COUNT) {
          await setTimeout(RETRY_TIMEOUT_MS);
        }
      }
    }

    throw new Error(`Unable to establish database connection after ${RETRY_COUNT} attempts`);
  }

  public async disconnect(): Promise<void> {
    if (!this.mongoose) {
      throw new Error('MongoDB client is not connected');
    }

    await this.mongoose.disconnect();
    this.mongoose = null;
    this.logger.info('Database connection closed.');
  }
}
