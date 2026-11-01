import { DocumentType, types } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';
import { Logger } from '../../libs/logger/index.js';
import { Component } from '../../types/index.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateFavoriteDto } from './dto/update-favorite.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserService } from './user-service.interface.js';
import { OfferEntity } from '../offer/offer.entity.js';
import { UserEntity } from './user.entity.js';

@injectable()
export class DefaultUserService implements UserService {
  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.OfferModel) private readonly offerModel: types.ModelType<OfferEntity>,
    @inject(Component.UserModel) private readonly userModel: types.ModelType<UserEntity>,
  ) {}

  public async create(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>> {
    const user = new UserEntity(dto);
    user.setPassword(dto.password, salt);

    const result = await this.userModel.create(user);
    this.logger.info(`New user created: ${user.email}`);

    return result;
  }

  public async findById(id: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findById(id).exec();
  }

  public async findByEmail(email: string): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  public async updateById(id: string, dto: UpdateUserDto): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true }).exec();
  }

  public async addFavorite(id: string, dto: UpdateFavoriteDto): Promise<DocumentType<UserEntity> | null> {
    if (!await this.offerModel.exists({ _id: dto.offerId })) {
      throw new Error('Offer not found');
    }
    return this.userModel.findByIdAndUpdate(
      id, { $addToSet: { favorites: dto.offerId } }, { new: true },
    ).exec();
  }

  public async removeFavorite(id: string, dto: UpdateFavoriteDto): Promise<DocumentType<UserEntity> | null> {
    return this.userModel.findByIdAndUpdate(
      id, { $pull: { favorites: dto.offerId } }, { new: true },
    ).exec();
  }

  public async findOrCreate(dto: CreateUserDto, salt: string): Promise<DocumentType<UserEntity>> {
    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      return existingUser;
    }

    return this.create(dto, salt);
  }
}
