import { DocumentType, types } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';
import { CityName } from '../../../types.js';
import { Logger } from '../../libs/logger/index.js';
import { Component } from '../../types/index.js';
import type { CommentEntity } from '../comment/comment.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { AddRatingDto } from './dto/add-rating.dto.js';
import { OfferService } from './offer-service.interface.js';
import { OfferEntity } from './offer.entity.js';

const DEFAULT_OFFERS_LIMIT = 60;
const PREMIUM_OFFERS_LIMIT = 3;

@injectable()
export class DefaultOfferService implements OfferService {
  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.OfferModel) private readonly offerModel: types.ModelType<OfferEntity>,
    @inject(Component.CommentModel) private readonly commentModel: types.ModelType<CommentEntity>,
    @inject(Component.UserModel) private readonly userModel: types.ModelType<UserEntity>,
  ) {}

  public async create(dto: CreateOfferDto): Promise<DocumentType<OfferEntity>> {
    const { authorId, ...offerData } = dto;
    const result = await this.offerModel.create({
      ...offerData, author: authorId, rating: 1, ratingSum: 0, commentsCount: 0,
    });
    this.logger.debug(`New offer created: ${dto.title}`);
    return result;
  }

  public async findById(id: string): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findById(id).populate('author', '-password').exec();
  }

  public async find(limit = DEFAULT_OFFERS_LIMIT): Promise<DocumentType<OfferEntity>[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Limit must be a positive integer');
    }
    return this.offerModel.find().sort({ publishedAt: -1, _id: -1 }).limit(limit)
      .populate('author', '-password').exec();
  }

  public async findPremium(city: CityName): Promise<DocumentType<OfferEntity>[]> {
    return this.offerModel.find({ city, isPremium: true })
      .sort({ publishedAt: -1, _id: -1 }).limit(PREMIUM_OFFERS_LIMIT)
      .populate('author', '-password').exec();
  }

  public async findFavorites(userId: string): Promise<DocumentType<OfferEntity>[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }
    return this.offerModel.find({ _id: { $in: user.favorites } })
      .sort({ publishedAt: -1, _id: -1 }).populate('author', '-password').exec();
  }

  public async updateById(id: string, authorId: string, dto: UpdateOfferDto): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findOneAndUpdate(
      { _id: id, author: authorId }, { $set: dto }, { new: true, runValidators: true },
    ).populate('author', '-password').exec();
  }

  public async deleteById(id: string, authorId: string): Promise<DocumentType<OfferEntity> | null> {
    const offer = await this.offerModel.findOneAndDelete({ _id: id, author: authorId }, { includeResultMetadata: false }).exec();
    if (offer) {
      await this.commentModel.deleteMany({ offer: id }).exec();
      await this.userModel.updateMany({ favorites: id }, { $pull: { favorites: id } }).exec();
    }
    return offer;
  }

  public async addRating(id: string, dto: AddRatingDto): Promise<DocumentType<OfferEntity> | null> {
    // A pipeline updates both counters and the average atomically, including concurrent ratings.
    return this.offerModel.findByIdAndUpdate(id, [
      { $set: {
        ratingSum: { $add: [{ $ifNull: ['$ratingSum', 0] }, dto.rating] },
        commentsCount: { $add: [{ $ifNull: ['$commentsCount', 0] }, 1] },
      } },
      { $set: { rating: { $round: [{ $divide: ['$ratingSum', '$commentsCount'] }, 1] } } },
    ], { new: true }).exec();
  }
}
