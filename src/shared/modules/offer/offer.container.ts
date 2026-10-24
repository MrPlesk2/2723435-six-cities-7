import { types } from '@typegoose/typegoose';
import { ContainerModule } from 'inversify';
import { Component } from '../../types/index.js';
import { DefaultOfferService } from './default-offer.service.js';
import { OfferService } from './offer-service.interface.js';
import { OfferEntity, OfferModel } from './offer.entity.js';

export function createOfferContainer(): ContainerModule {
  return new ContainerModule((bind) => {
    bind<OfferService>(Component.OfferService).to(DefaultOfferService).inSingletonScope();
    bind<types.ModelType<OfferEntity>>(Component.OfferModel).toConstantValue(OfferModel);
  });
}
