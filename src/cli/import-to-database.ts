import { DatabaseClient } from '../shared/libs/database-client/index.js';
import { OfferService } from '../shared/modules/offer/index.js';
import { UserService } from '../shared/modules/user/index.js';
import { Component } from '../shared/types/index.js';
import type { Offer } from '../types.js';
import { createCliContainer } from './cli.container.js';
import { importOffers } from './import-offers.js';

// TSV contains no passwords, so imported authors get this one.
const DEFAULT_USER_PASSWORD = '123456';

export const importOffersToDatabase = async (
  filepath: string,
  databaseUri: string,
  salt: string,
  onProgress?: (offersCount: number) => void,
): Promise<number> => {
  const container = createCliContainer();
  const databaseClient = container.get<DatabaseClient>(Component.DatabaseClient);
  const userService = container.get<UserService>(Component.UserService);
  const offerService = container.get<OfferService>(Component.OfferService);

  // Many offers share the same author: cache ids to skip repeated lookups.
  const authorIds = new Map<string, string>();

  const getAuthorId = async (author: Offer['author']): Promise<string> => {
    const cachedId = authorIds.get(author.email);
    if (cachedId) {
      return cachedId;
    }

    const user = await userService.findOrCreate({ ...author, password: DEFAULT_USER_PASSWORD }, salt);
    authorIds.set(author.email, user.id);
    return user.id;
  };

  const saveOffer = async (offer: Offer): Promise<void> => {
    await offerService.create({
      title: offer.title,
      description: offer.description,
      publishedAt: offer.publishedAt,
      city: offer.city.name,
      previewImage: offer.previewImage,
      images: offer.images,
      isPremium: offer.isPremium,
      rating: offer.rating,
      type: offer.type,
      bedrooms: offer.bedrooms,
      maxAdults: offer.maxAdults,
      price: offer.price,
      goods: offer.goods,
      authorId: await getAuthorId(offer.author),
      location: offer.location,
    });
  };

  await databaseClient.connect(databaseUri);

  try {
    return await importOffers(filepath, saveOffer, onProgress);
  } finally {
    await databaseClient.disconnect();
  }
};
