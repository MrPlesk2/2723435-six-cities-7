import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { CITY_LOCATIONS } from './city-locations.js';
import { AMENITIES, CITY_NAMES, HOUSING_TYPES, USER_TYPES } from '../types.js';
import type { Offer } from '../types.js';

const parseRequiredString = (
  value: string,
  field: string,
  minLength = 1,
  maxLength = Number.POSITIVE_INFINITY,
): string => {
  const result = value.trim();
  if (result.length < minLength || result.length > maxLength) {
    throw new Error(`Поле «${field}» должно содержать от ${minLength} до ${maxLength} символов`);
  }
  return result;
};

const isOption = <T extends string>(value: string, options: readonly T[]): value is T =>
  options.some((option) => option === value);

const parseEnum = <T extends string>(value: string, field: string, options: readonly T[]): T => {
  const result = value.trim();
  if (!isOption(result, options)) {
    throw new Error(`Недопустимое значение поля «${field}»: ${value}`);
  }
  return result;
};

const parseNumber = (
  value: string,
  field: string,
  min: number,
  max: number,
  integer = false,
  maxDecimalPlaces?: number,
): number => {
  const normalized = value.trim();
  const result = Number(normalized);
  const decimalPlaces = normalized.split('.')[1]?.length ?? 0;
  if (
    normalized === ''
    || !Number.isFinite(result)
    || result < min
    || result > max
    || (integer && !Number.isInteger(result))
    || (maxDecimalPlaces !== undefined && decimalPlaces > maxDecimalPlaces)
  ) {
    throw new Error(`Некорректное значение поля «${field}»: ${value}`);
  }
  return result;
};

const parseBoolean = (value: string, field: string): boolean => {
  const normalized = value.trim();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new Error(`Поле «${field}» должно содержать true или false`);
};

const parseDate = (value: string, field: string): Date => {
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) {
    throw new Error(`Некорректная дата в поле «${field}»: ${value}`);
  }
  return result;
};

const parseEmail = (value: string): string => {
  const result = parseRequiredString(value, 'authorEmail');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new Error(`Некорректный email автора: ${value}`);
  }
  return result;
};

const parseOffer = (line: string, lineNumber: number): Offer => {
  const values = line.split('\t');
  if (values.length !== 20) {
    throw new Error(`Строка ${lineNumber}: ожидалось 20 полей, получено ${values.length}`);
  }

  const [
    titleValue, descriptionValue, publishedAt, cityNameValue, previewImageValue, imagesValue, isPremium,
    isFavorite, rating, housingType, bedrooms, maxAdults, price, goods, authorName,
    authorEmail, authorAvatarUrl, authorType, latitude, longitude,
  ] = values;

  const cityName = parseEnum(cityNameValue, 'city', CITY_NAMES);
  const imageList = imagesValue.split(',').map((image) => image.trim());
  if (imageList.length !== 6 || imageList.some((image) => image.length === 0)) {
    throw new Error(`Строка ${lineNumber}: предложение должно содержать ровно 6 фотографий`);
  }
  const amenityList = goods.split(',').map((amenity) => parseEnum(amenity, 'goods', AMENITIES));
  const avatarUrl = authorAvatarUrl.trim();
  if (avatarUrl && !/\.png$|\.jpg$/i.test(avatarUrl)) {
    throw new Error(`Аватар автора должен иметь формат .jpg или .png: ${authorAvatarUrl}`);
  }
  const ratingValue = parseNumber(rating, 'rating', 1, 5, false, 1);

  return {
    title: parseRequiredString(titleValue, 'title', 10, 100),
    description: parseRequiredString(descriptionValue, 'description', 20, 1024),
    publishedAt: parseDate(publishedAt, 'publishedAt'),
    city: { name: cityName, location: CITY_LOCATIONS[cityName] },
    previewImage: parseRequiredString(previewImageValue, 'previewImage'),
    images: imageList,
    isPremium: parseBoolean(isPremium, 'isPremium'),
    isFavorite: parseBoolean(isFavorite, 'isFavorite'),
    rating: ratingValue,
    type: parseEnum(housingType, 'type', HOUSING_TYPES),
    bedrooms: parseNumber(bedrooms, 'bedrooms', 1, 8, true),
    maxAdults: parseNumber(maxAdults, 'maxAdults', 1, 10, true),
    price: parseNumber(price, 'price', 100, 100000, true),
    goods: amenityList,
    author: {
      name: parseRequiredString(authorName, 'authorName', 1, 15),
      email: parseEmail(authorEmail),
      avatarUrl: avatarUrl || undefined,
      type: parseEnum(authorType, 'authorType', USER_TYPES),
    },
    commentsCount: 0,
    location: {
      latitude: parseNumber(latitude, 'latitude', -90, 90),
      longitude: parseNumber(longitude, 'longitude', -180, 180),
    },
  };
};

export const importOffers = async (
  filepath: string,
  onOffer?: (offer: Offer) => Promise<void>,
  onProgress?: (offersCount: number) => void,
): Promise<number> => {
  const input = createReadStream(filepath, { encoding: 'utf-8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  let offersCount = 0;

  for await (const line of lines) {
    lineNumber += 1;
    if (lineNumber === 1 && line.startsWith('title\t')) {
      continue;
    }
    if (line.trim()) {
      const offer = parseOffer(line, lineNumber);
      if (onOffer) {
        await onOffer(offer);
      }
      offersCount += 1;
      if (offersCount % 100000 === 0) {
        onProgress?.(offersCount);
      }
    }
  }

  return offersCount;
};
