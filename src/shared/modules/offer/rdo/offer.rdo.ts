import { DocumentType } from '@typegoose/typegoose';
import { Expose, plainToInstance, Type } from 'class-transformer';
import { Amenity, City, HousingType, Location } from '../../../../types.js';
import { CITY_LOCATIONS } from '../../../constants/city-locations.js';
import { UserEntity } from '../../user/user.entity.js';
import { toUserRdo, UserRdo } from '../../user/rdo/user.rdo.js';
import { OfferEntity } from '../offer.entity.js';

export class OfferPreviewRdo {
  @Expose() public id!: string;
  @Expose() public price!: number;
  @Expose() public title!: string;
  @Expose() public type!: HousingType;
  @Expose() public isFavorite!: boolean;
  @Expose() public publishedAt!: Date;
  @Expose() public city!: City;
  @Expose() public previewImage!: string;
  @Expose() public isPremium!: boolean;
  @Expose() public rating!: number;
  @Expose() public commentsCount!: number;
}

export class OfferRdo extends OfferPreviewRdo {
  @Expose() public description!: string;
  @Expose() public images!: string[];
  @Expose() public bedrooms!: number;
  @Expose() public maxAdults!: number;
  @Expose() public goods!: Amenity[];
  @Expose() public location!: Location;
  @Expose() @Type(() => UserRdo) public author!: UserRdo;
}

export function toOfferRdo(offer: DocumentType<OfferEntity>, user: DocumentType<UserEntity> | null, preview = false): OfferPreviewRdo | OfferRdo {
  const data = {
    ...offer.toObject(),
    id: offer.id,
    city: { name: offer.city, location: CITY_LOCATIONS[offer.city] },
    location: { latitude: offer.location.latitude, longitude: offer.location.longitude },
    isFavorite: user?.favorites.some((id) => String(id) === offer.id) ?? false,
    author: preview ? undefined : toUserRdo(offer.author as DocumentType<UserEntity>),
  };
  return plainToInstance(preview ? OfferPreviewRdo : OfferRdo, data, { excludeExtraneousValues: true });
}
