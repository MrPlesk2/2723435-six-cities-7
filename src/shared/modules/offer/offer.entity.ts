import { defaultClasses, getModelForClass, modelOptions, prop, Ref } from '@typegoose/typegoose';
import {
  AMENITIES,
  Amenity,
  CITY_NAMES,
  CityName,
  HOUSING_TYPES,
  HousingType,
} from '../../../types.js';
import { UserEntity } from '../user/user.entity.js';
import {
  Latitude,
  Longitude,
  OFFER_IMAGES_COUNT,
  OfferBedrooms,
  OfferDescriptionLength,
  OfferMaxAdults,
  OfferPrice,
  OfferRating,
  OfferTitleLength,
  RATING_DECIMAL_PLACES,
} from './offer.constant.js';

const hasMaxDecimalPlaces = (value: number, places: number): boolean => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
};

@modelOptions({ schemaOptions: { _id: false } })
export class LocationEntity {
  @prop({ required: true, min: Latitude.Min, max: Latitude.Max })
  public latitude!: number;

  @prop({ required: true, min: Longitude.Min, max: Longitude.Max })
  public longitude!: number;
}

@modelOptions({
  schemaOptions: {
    collection: 'offers',
    timestamps: true,
  }
})
export class OfferEntity extends defaultClasses.TimeStamps {
  @prop({
    required: true,
    trim: true,
    minlength: [OfferTitleLength.Min, `Min length for title is ${OfferTitleLength.Min}`],
    maxlength: [OfferTitleLength.Max, `Max length for title is ${OfferTitleLength.Max}`],
  })
  public title!: string;

  @prop({
    required: true,
    trim: true,
    minlength: [OfferDescriptionLength.Min, `Min length for description is ${OfferDescriptionLength.Min}`],
    maxlength: [OfferDescriptionLength.Max, `Max length for description is ${OfferDescriptionLength.Max}`],
  })
  public description!: string;

  @prop({ required: true })
  public publishedAt!: Date;

  // City coordinates are fixed (see CITY_LOCATIONS), so only the name is stored.
  @prop({ required: true, type: () => String, enum: CITY_NAMES })
  public city!: CityName;

  @prop({ required: true, trim: true })
  public previewImage!: string;

  @prop({
    required: true,
    type: () => [String],
    validate: {
      validator: (images: string[]) => images.length === OFFER_IMAGES_COUNT,
      message: `Offer must have exactly ${OFFER_IMAGES_COUNT} images`,
    },
  })
  public images!: string[];

  @prop({ required: true })
  public isPremium!: boolean;

  @prop({
    required: true,
    min: [OfferRating.Min, `Min rating is ${OfferRating.Min}`],
    max: [OfferRating.Max, `Max rating is ${OfferRating.Max}`],
    validate: {
      validator: (rating: number) => hasMaxDecimalPlaces(rating, RATING_DECIMAL_PLACES),
      message: `Rating can have at most ${RATING_DECIMAL_PLACES} decimal place`,
    },
  })
  public rating!: number;

  @prop({ required: true, type: () => String, enum: HOUSING_TYPES })
  public type!: HousingType;

  @prop({
    required: true,
    min: [OfferBedrooms.Min, `Min bedrooms count is ${OfferBedrooms.Min}`],
    max: [OfferBedrooms.Max, `Max bedrooms count is ${OfferBedrooms.Max}`],
    validate: { validator: Number.isInteger, message: 'Bedrooms count must be an integer' },
  })
  public bedrooms!: number;

  @prop({
    required: true,
    min: [OfferMaxAdults.Min, `Min guests count is ${OfferMaxAdults.Min}`],
    max: [OfferMaxAdults.Max, `Max guests count is ${OfferMaxAdults.Max}`],
    validate: { validator: Number.isInteger, message: 'Guests count must be an integer' },
  })
  public maxAdults!: number;

  @prop({
    required: true,
    min: [OfferPrice.Min, `Min price is ${OfferPrice.Min}`],
    max: [OfferPrice.Max, `Max price is ${OfferPrice.Max}`],
    validate: { validator: Number.isInteger, message: 'Price must be an integer' },
  })
  public price!: number;

  @prop({
    required: true,
    type: () => [String],
    enum: AMENITIES,
    validate: {
      validator: (goods: Amenity[]) => goods.length > 0,
      message: 'Offer must have at least one amenity',
    },
  })
  public goods!: Amenity[];

  @prop({ required: true, ref: () => UserEntity })
  public author!: Ref<UserEntity>;

  @prop({ default: 0, min: 0 })
  public commentsCount!: number;

  @prop({ required: true, type: () => LocationEntity })
  public location!: LocationEntity;
}

export const OfferModel = getModelForClass(OfferEntity);
