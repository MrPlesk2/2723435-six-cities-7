export const OfferTitleLength = { Min: 10, Max: 100 } as const;
export const OfferDescriptionLength = { Min: 20, Max: 1024 } as const;
export const OfferRating = { Min: 1, Max: 5 } as const;
export const OfferBedrooms = { Min: 1, Max: 8 } as const;
export const OfferMaxAdults = { Min: 1, Max: 10 } as const;
export const OfferPrice = { Min: 100, Max: 100000 } as const;
export const Latitude = { Min: -90, Max: 90 } as const;
export const Longitude = { Min: -180, Max: 180 } as const;

export const OFFER_IMAGES_COUNT = 6;
export const RATING_DECIMAL_PLACES = 1;
