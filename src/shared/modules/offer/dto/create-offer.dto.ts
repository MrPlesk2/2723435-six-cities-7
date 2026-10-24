import type { Amenity, CityName, HousingType, Location } from '../../../../types.js';

export class CreateOfferDto {
  public title!: string;
  public description!: string;
  public publishedAt!: Date;
  public city!: CityName;
  public previewImage!: string;
  public images!: string[];
  public isPremium!: boolean;
  public rating!: number;
  public type!: HousingType;
  public bedrooms!: number;
  public maxAdults!: number;
  public price!: number;
  public goods!: Amenity[];
  public authorId!: string;
  public location!: Location;
}
