export const USER_TYPES = ['обычный', 'pro'] as const;
export type UserType = typeof USER_TYPES[number];

export const HOUSING_TYPES = ['apartment', 'house', 'room', 'hotel'] as const;
export type HousingType = typeof HOUSING_TYPES[number];

export const CITY_NAMES = [
  'Paris',
  'Cologne',
  'Brussels',
  'Amsterdam',
  'Hamburg',
  'Dusseldorf',
] as const;
export type CityName = typeof CITY_NAMES[number];

export const AMENITIES = [
  'Breakfast',
  'Air conditioning',
  'Laptop friendly workspace',
  'Baby seat',
  'Washer',
  'Towels',
  'Fridge',
] as const;
export type Amenity = typeof AMENITIES[number];

export interface Location {
  latitude: number;
  longitude: number;
}

export interface City {
  name: CityName;
  location: Location;
}

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
  password: string;
  type: UserType;
}

export type OfferAuthor = Omit<User, 'password'>;

export interface Offer {
  title: string;
  description: string;
  publishedAt: Date;
  city: City;
  previewImage: string;
  images: string[];
  isPremium: boolean;
  isFavorite: boolean;
  rating: number;
  type: HousingType;
  bedrooms: number;
  maxAdults: number;
  price: number;
  goods: Amenity[];
  author: OfferAuthor;
  commentsCount: number;
  location: Location;
}

export interface Comment {
  text: string;
  publishedAt: Date;
  rating: number;
  author: OfferAuthor;
}
