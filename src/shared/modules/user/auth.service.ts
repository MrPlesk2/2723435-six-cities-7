import { randomBytes, timingSafeEqual } from 'node:crypto';
import { DocumentType } from '@typegoose/typegoose';
import { Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { Config, RestSchema } from '../../libs/config/index.js';
import { HttpError } from '../../libs/rest/http-error.js';
import { createSHA256 } from '../../helpers/index.js';
import { Component } from '../../types/index.js';
import { UserService } from './user-service.interface.js';
import { UserEntity } from './user.entity.js';
import { LoginUserDto } from './dto/login-user.dto.js';

@injectable()
export class AuthService {
  private readonly sessions = new Map<string, string>();

  constructor(
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
  ) {}

  public async login(dto: LoginUserDto): Promise<{ token: string; user: DocumentType<UserEntity> }> {
    const user = await this.users.findByEmail(dto.email);
    const expected = Buffer.from(user?.getPassword() ?? '', 'hex');
    const actual = Buffer.from(createSHA256(dto.password, this.config.get('SALT')), 'hex');
    if (!user || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    const token = randomBytes(32).toString('hex');
    this.sessions.set(token, user.id);
    return { token, user };
  }

  public async getUser(request: Request, required = true): Promise<DocumentType<UserEntity> | null> {
    const authorization = request.get('Authorization');
    if (!authorization && !required) {
      return null;
    }
    const token = authorization?.match(/^Bearer (\S+)$/)?.[1];
    const id = token ? this.sessions.get(token) : undefined;
    const user = id ? await this.users.findById(id) : null;
    if (!user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Authentication required');
    }
    return user;
  }

  public async requireUser(request: Request): Promise<DocumentType<UserEntity>> {
    const user = await this.getUser(request);
    if (!user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Authentication required');
    }
    return user;
  }

  public async logout(request: Request): Promise<void> {
    await this.requireUser(request);
    const token = request.get('Authorization')?.slice('Bearer '.length) ?? '';
    this.sessions.delete(token);
  }
}
