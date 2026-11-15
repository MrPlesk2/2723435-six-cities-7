import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { CityName } from '../../../types.js';
import { Controller } from '../../libs/rest/controller.js';
import { HttpError } from '../../libs/rest/http-error.js';
import { Component } from '../../types/index.js';
import { AuthService } from '../user/auth.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { OfferService } from './offer-service.interface.js';
import { toOfferRdo } from './rdo/offer.rdo.js';

type OfferParams = { offerId: string };

// Select only the fields declared by the public contract. This is not validation.
export function getOfferData(dto: UpdateOfferDto): UpdateOfferDto {
  const fields = ['title', 'description', 'publishedAt', 'city', 'previewImage', 'images',
    'isPremium', 'type', 'bedrooms', 'maxAdults', 'price', 'goods', 'location'] as const;
  return Object.fromEntries(fields.filter((field) => dto[field] !== undefined).map((field) => [field, dto[field]]));
}

@injectable()
export class OfferController extends Controller {
  constructor(
    @inject(Component.OfferService) private readonly offers: OfferService,
    @inject(Component.AuthService) private readonly auth: AuthService,
  ) {
    super();
    this.addRoute({ path: '/', method: 'get', handler: this.index });
    this.addRoute({ path: '/premium', method: 'get', handler: this.premium });
    this.addRoute({ path: '/:offerId', method: 'get', handler: this.show });
    this.addRoute({ path: '/', method: 'post', handler: this.create });
    this.addRoute({ path: '/:offerId', method: 'patch', handler: this.update });
    this.addRoute({ path: '/:offerId', method: 'delete', handler: this.delete });
  }

  public async index(request: Request, response: Response): Promise<void> {
    const user = await this.auth.getUser(request, false);
    const offers = await this.offers.find(request.query.limit === undefined ? undefined : Number(request.query.limit));
    this.ok(response, offers.map((offer) => toOfferRdo(offer, user, true)));
  }

  public async premium(request: Request, response: Response): Promise<void> {
    const user = await this.auth.getUser(request, false);
    const offers = await this.offers.findPremium(request.query.city as CityName);
    this.ok(response, offers.map((offer) => toOfferRdo(offer, user, true)));
  }

  public async show(request: Request<OfferParams>, response: Response): Promise<void> {
    const user = await this.auth.getUser(request, false);
    const offer = await this.findOffer(request.params.offerId);
    this.ok(response, toOfferRdo(offer, user));
  }

  public async create(request: Request<Record<string, string>, unknown, Omit<CreateOfferDto, 'authorId'>>, response: Response): Promise<void> {
    const user = await this.auth.requireUser(request);
    const data = getOfferData(request.body) as Omit<CreateOfferDto, 'authorId'>;
    const created = await this.offers.create({ ...data, authorId: user.id });
    this.created(response, toOfferRdo(await this.findOffer(created.id), user));
  }

  public async update(request: Request<OfferParams, unknown, UpdateOfferDto>, response: Response): Promise<void> {
    const user = await this.auth.requireUser(request);
    const offer = await this.findOffer(request.params.offerId);
    this.checkAuthor(offer, user.id);
    const updated = await this.offers.updateById(offer.id, user.id, getOfferData(request.body));
    if (!updated) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Offer not found');
    }
    this.ok(response, toOfferRdo(updated, user));
  }

  public async delete(request: Request<OfferParams>, response: Response): Promise<void> {
    const user = await this.auth.requireUser(request);
    const offer = await this.findOffer(request.params.offerId);
    this.checkAuthor(offer, user.id);
    if (!await this.offers.deleteById(offer.id, user.id)) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Offer not found');
    }
    this.noContent(response);
  }

  private async findOffer(id: string) {
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Offer not found');
    }
    return offer;
  }

  private checkAuthor(offer: Awaited<ReturnType<OfferController['findOffer']>>, userId: string): void {
    if (String(offer.author?._id ?? offer.author) !== userId) {
      throw new HttpError(StatusCodes.FORBIDDEN, 'Only the author can change this offer');
    }
  }
}
