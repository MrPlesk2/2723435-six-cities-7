import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import { Controller } from '../../libs/rest/controller.js';
import { HttpError } from '../../libs/rest/http-error.js';
import { Component } from '../../types/index.js';
import { AuthService } from '../user/auth.service.js';
import { UserService } from '../user/user-service.interface.js';
import { OfferService } from '../offer/offer-service.interface.js';
import { toOfferRdo } from '../offer/rdo/offer.rdo.js';

type FavoriteRequest = Request<{ offerId: string }>;

@injectable()
export class FavoriteController extends Controller {
  constructor(
    @inject(Component.OfferService) private readonly offers: OfferService,
    @inject(Component.UserService) private readonly users: UserService,
    @inject(Component.AuthService) private readonly auth: AuthService,
  ) {
    super();
    this.addRoute({ path: '/', method: 'get', handler: this.index });
    this.addRoute({ path: '/:offerId', method: 'put', handler: this.add });
    this.addRoute({ path: '/:offerId', method: 'delete', handler: this.remove });
  }

  public async index(request: Request, response: Response): Promise<void> {
    const user = await this.auth.requireUser(request);
    const offers = await this.offers.findFavorites(user.id);
    this.ok(response, offers.map((offer) => toOfferRdo(offer, user, true)));
  }

  public async add(request: FavoriteRequest, response: Response): Promise<void> {
    await this.change(request, response, true);
  }

  public async remove(request: FavoriteRequest, response: Response): Promise<void> {
    await this.change(request, response, false);
  }

  private async change(request: FavoriteRequest, response: Response, add: boolean): Promise<void> {
    const user = await this.auth.requireUser(request);
    const offer = await this.offers.findById(request.params.offerId);
    if (!offer) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Offer not found');
    }
    const dto = { offerId: offer.id };
    const updated = add ? await this.users.addFavorite(user.id, dto) : await this.users.removeFavorite(user.id, dto);
    if (!updated) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'User no longer exists');
    }
    this.ok(response, toOfferRdo(offer, updated));
  }
}
