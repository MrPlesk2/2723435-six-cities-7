export type UserType = 'обычный' | 'pro';

export type HousingType = 'apartment' | 'house' | 'room' | 'hotel';

export type CityName =
  | 'Paris'
  | 'Cologne'
  | 'Brussels'
  | 'Amsterdam'
  | 'Hamburg'
  | 'Dusseldorf';

export interface City {
  name: CityName;
  location: Location;
}

export interface Location {
  latitude: number;
  longitude: number;
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
  goods: string[];
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
