import { DocumentType, types } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';
import { Component } from '../../types/index.js';
import { OfferService } from '../offer/offer-service.interface.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CommentEntity } from './comment.entity.js';
import { CommentService } from './comment-service.interface.js';

const COMMENTS_LIMIT = 50;

@injectable()
export class DefaultCommentService implements CommentService {
  constructor(
    @inject(Component.CommentModel) private readonly commentModel: types.ModelType<CommentEntity>,
    @inject(Component.OfferService) private readonly offerService: OfferService,
  ) {}

  public async create(dto: CreateCommentDto): Promise<DocumentType<CommentEntity>> {
    if (!await this.offerService.findById(dto.offerId)) {
      throw new Error('Offer not found');
    }

    const comment = await this.commentModel.create({
      text: dto.text,
      rating: dto.rating,
      author: dto.authorId,
      offer: dto.offerId,
    });

    try {
      if (!await this.offerService.addRating(dto.offerId, { rating: dto.rating })) {
        throw new Error('Offer not found');
      }
    } catch (error) {
      await this.commentModel.findByIdAndDelete(comment.id).exec();
      throw error;
    }

    return comment.populate('author', '-password');
  }

  public async findByOfferId(offerId: string): Promise<DocumentType<CommentEntity>[]> {
    return this.commentModel.find({ offer: offerId })
      .sort({ publishedAt: -1, _id: -1 })
      .limit(COMMENTS_LIMIT)
      .populate('author', '-password')
      .exec();
  }
}
