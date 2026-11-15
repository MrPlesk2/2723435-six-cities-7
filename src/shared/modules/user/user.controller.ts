import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import multer from 'multer';
import { Config, RestSchema } from '../../libs/config/index.js';
import { Controller } from '../../libs/rest/controller.js';
import { HttpError } from '../../libs/rest/http-error.js';
import { Component } from '../../types/index.js';
import { UserService } from './user-service.interface.js';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { toUserRdo } from './rdo/user.rdo.js';

@injectable()
export class UserController extends Controller {
  constructor(
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.AuthService) private readonly auth: AuthService,
    @inject(Component.Config) private readonly config: Config<RestSchema>,
  ) {
    super();
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
          callback(new HttpError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, 'Avatar must be JPG or PNG'));
          return;
        }
        callback(null, true);
      },
    });
    this.addRoute({ path: '/register', method: 'post', handler: this.register, middleware: [upload.single('avatar')] });
    this.addRoute({ path: '/login', method: 'post', handler: this.login });
    this.addRoute({ path: '/login', method: 'get', handler: this.check });
    this.addRoute({ path: '/logout', method: 'delete', handler: this.logout });
  }

  public async register(request: Request<Record<string, string>, unknown, CreateUserDto>, response: Response): Promise<void> {
    if (await this.auth.getUser(request, false)) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'Already authenticated');
    }
    const { name, email, password, type } = request.body;
    if (await this.users.findByEmail(email)) {
      throw new HttpError(StatusCodes.CONFLICT, 'User with this email already exists');
    }
    const avatarUrl = request.file
      ? `data:${request.file.mimetype};base64,${request.file.buffer.toString('base64')}`
      : undefined;
    const user = await this.users.create({ name, email, password, type, avatarUrl }, this.config.get('SALT'));
    this.created(response, toUserRdo(user));
  }

  public async login(request: Request<Record<string, string>, unknown, LoginUserDto>, response: Response): Promise<void> {
    const { token, user } = await this.auth.login(request.body);
    this.ok(response, { token, user: toUserRdo(user) });
  }

  public async check(request: Request, response: Response): Promise<void> {
    this.ok(response, toUserRdo(await this.auth.requireUser(request)));
  }

  public async logout(request: Request, response: Response): Promise<void> {
    await this.auth.logout(request);
    this.noContent(response);
  }
}
