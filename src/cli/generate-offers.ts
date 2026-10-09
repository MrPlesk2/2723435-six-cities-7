import axios from 'axios';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { CITY_LOCATIONS } from './city-locations.js';
import { AMENITIES, CITY_NAMES, HOUSING_TYPES, USER_TYPES } from '../types.js';
import type { Offer, OfferTemplate } from '../types.js';

const TSV_HEADER = [
  'title', 'description', 'publishedAt', 'city', 'previewImage', 'images', 'isPremium', 'isFavorite',
  'rating', 'type', 'bedrooms', 'maxAdults', 'price', 'goods', 'authorName', 'authorEmail',
  'authorAvatarUrl', 'authorType', 'latitude', 'longitude',
].join('\t');

const randomInteger = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(items: readonly T[]): T => items[randomInteger(0, items.length - 1)];

const sanitizeTsvValue = (value: string | number | boolean): string =>
  String(value).replace(/[\t\r\n]+/g, ' ').trim();

const parseTemplate = (value: unknown, index: number): OfferTemplate => {
  if (typeof value !== 'object' || value === null || !('title' in value) || !('description' in value)) {
    throw new Error(`Шаблон ${index + 1} не содержит title и description`);
  }
  const { title, description } = value;
  if (
    typeof title !== 'string'
    || title.trim().length < 10
    || title.trim().length > 100
    || typeof description !== 'string'
    || description.trim().length < 20
    || description.trim().length > 1024
  ) {
    throw new Error(`Шаблон ${index + 1} содержит некорректные title или description`);
  }
  return { title: title.trim(), description: description.trim() };
};

const fetchTemplates = async (url: string): Promise<OfferTemplate[]> => {
  const response = await axios.get<unknown>(url);
  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('JSON-сервис должен вернуть непустой массив шаблонов');
  }
  return response.data.map(parseTemplate);
};

const createOffer = (template: OfferTemplate): Offer => {
  const cityName = pick(CITY_NAMES);
  const cityLocation = CITY_LOCATIONS[cityName];
  const selectedAmenities = [...AMENITIES]
    .sort(() => Math.random() - 0.5)
    .slice(0, randomInteger(1, AMENITIES.length));
  const imageNames = Array.from({ length: 6 }, (_, index) => `photo-${randomInteger(1, 10000)}-${index + 1}.jpg`);

  return {
    title: template.title,
    description: template.description,
    publishedAt: new Date(Date.now() - randomInteger(0, 365) * 24 * 60 * 60 * 1000),
    city: { name: cityName, location: cityLocation },
    previewImage: `/img/${imageNames[0]}`,
    images: imageNames.map((imageName) => `/img/${imageName}`),
    isPremium: Math.random() < 0.25,
    isFavorite: Math.random() < 0.5,
    rating: randomInteger(10, 50) / 10,
    type: pick(HOUSING_TYPES),
    bedrooms: randomInteger(1, 8),
    maxAdults: randomInteger(1, 10),
    price: randomInteger(100, 100000),
    goods: selectedAmenities,
    author: {
      name: 'Alex Morgan',
      email: `author${randomInteger(1, 1000000)}@example.com`,
      avatarUrl: `/img/avatar-${randomInteger(1, 100)}.jpg`,
      type: pick(USER_TYPES),
    },
    commentsCount: 0,
    location: {
      latitude: Number((cityLocation.latitude + (Math.random() - 0.5) * 0.1).toFixed(6)),
      longitude: Number((cityLocation.longitude + (Math.random() - 0.5) * 0.1).toFixed(6)),
    },
  };
};

const serializeOffer = (offer: Offer): string => [
  offer.title,
  offer.description,
  offer.publishedAt.toISOString(),
  offer.city.name,
  offer.previewImage,
  offer.images.join(','),
  offer.isPremium,
  offer.isFavorite,
  offer.rating,
  offer.type,
  offer.bedrooms,
  offer.maxAdults,
  offer.price,
  offer.goods.join(','),
  offer.author.name,
  offer.author.email,
  offer.author.avatarUrl ?? '',
  offer.author.type,
  offer.location.latitude,
  offer.location.longitude,
].map(sanitizeTsvValue).join('\t');

export const generateOffers = async (countValue: string, filepath: string, url: string): Promise<number> => {
  const count = Number(countValue);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('Количество предложений должно быть положительным целым числом');
  }

  const templates = await fetchTemplates(url);
  async function* createTsvRows(): AsyncGenerator<string> {
    yield `${TSV_HEADER}\n`;
    for (let index = 0; index < count; index += 1) {
      yield `${serializeOffer(createOffer(pick(templates)))}\n`;
    }
  }

  await pipeline(Readable.from(createTsvRows()), createWriteStream(filepath, { encoding: 'utf-8' }));
  return count;
};
