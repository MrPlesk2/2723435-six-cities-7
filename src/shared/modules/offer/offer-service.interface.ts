import { DocumentType } from '@typegoose/typegoose';
import { CityName } from '../../../types.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { AddRatingDto } from './dto/add-rating.dto.js';
import { OfferEntity } from './offer.entity.js';

export interface OfferService {
  create(dto: CreateOfferDto): Promise<DocumentType<OfferEntity>>;
  findById(id: string): Promise<DocumentType<OfferEntity> | null>;
  find(limit?: number): Promise<DocumentType<OfferEntity>[]>;
  findPremium(city: CityName): Promise<DocumentType<OfferEntity>[]>;
  findFavorites(userId: string): Promise<DocumentType<OfferEntity>[]>;
  updateById(id: string, authorId: string, dto: UpdateOfferDto): Promise<DocumentType<OfferEntity> | null>;
  deleteById(id: string, authorId: string): Promise<DocumentType<OfferEntity> | null>;
  addRating(id: string, dto: AddRatingDto): Promise<DocumentType<OfferEntity> | null>;
}
