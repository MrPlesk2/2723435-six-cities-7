import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RestApplication } from '../dist/rest/rest.application.js';
import { ExceptionFilter } from '../dist/shared/libs/rest/exception-filter.js';
import { AuthService } from '../dist/shared/modules/user/auth.service.js';
import { UserController } from '../dist/shared/modules/user/user.controller.js';
import { OfferController } from '../dist/shared/modules/offer/offer.controller.js';
import { FavoriteController } from '../dist/shared/modules/favorite/favorite.controller.js';
import { createSHA256 } from '../dist/shared/helpers/hash.js';

async function withApi(run) {
  const errors = [];
  const logger = { info() {}, debug() {}, warn() {}, error(...args) { errors.push(args); } };
  const config = { get: (key) => ({ PORT: 0, SALT: 'test-salt' })[key] };
  let disconnected = false;
  const database = { connect: async () => {}, disconnect: async () => { disconnected = true; } };
  const user = {
    id: '507f1f77bcf86cd799439011', _id: '507f1f77bcf86cd799439011', name: 'Alice', email: 'alice@example.com',
    type: 'pro', favorites: [], password: createSHA256('123456', 'test-salt'),
    getPassword() { return this.password; },
  };
  const offer = {
    id: '507f1f77bcf86cd799439012', title: 'Beautiful apartment', description: 'A beautiful apartment in Paris',
    publishedAt: new Date('2026-01-01'), city: 'Paris', price: 150, type: 'apartment',
    previewImage: 'https://example.com/preview.jpg', images: Array(6).fill('https://example.com/image.jpg'),
    isPremium: true, rating: 1, commentsCount: 0, bedrooms: 2, maxAdults: 3, goods: ['Fridge'],
    location: { latitude: 48.8, longitude: 2.3 }, author: user, ratingSum: 0,
    toObject() { const { toObject, ...data } = this; return data; },
  };
  const users = {
    findByEmail: async (email) => email === user.email ? user : null,
    findById: async () => user,
    create: async (dto) => ({ ...user, ...dto }),
    addFavorite: async (_id, dto) => { user.favorites = [...new Set([...user.favorites, dto.offerId])]; return user; },
    removeFavorite: async (_id, dto) => { user.favorites = user.favorites.filter((id) => id !== dto.offerId); return user; },
  };
  const offers = {
    find: async () => [offer], findPremium: async () => [offer],
    findById: async (id) => id === offer.id ? offer : null,
    create: async (dto) => { assert.equal(dto.authorId, user.id); return offer; },
    updateById: async (_id, _author, dto) => { Object.assign(offer, dto); return offer; },
    deleteById: async () => offer,
    findFavorites: async () => user.favorites.includes(offer.id) ? [offer] : [],
  };
  const auth = new AuthService(users, config);
  const app = new RestApplication(logger, config, database, new OfferController(offers, auth),
    new UserController(users, auth, config), new FavoriteController(offers, users, auth), new ExceptionFilter(logger));
  // Bind to an ephemeral port while exercising the same init path used in production.
  await app.init();
  const server = app.server;
  const url = `http://127.0.0.1:${server.address().port}`;
  const json = (method, body, token) => ({
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const login = async () => {
    const response = await fetch(`${url}/users/login`, json('POST', { email: user.email, password: '123456' }));
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    await run({ url, json, login, user, offer, offers, errors });
  } finally {
    server.closeAllConnections();
    await app.close();
    assert.equal(disconnected, true);
  }
}

test('public offer responses follow preview and detail contracts without confidential fields', () => withApi(async ({ url, offer }) => {
  for (const path of ['/offers', '/offers/premium?city=Paris']) {
    const response = await fetch(`${url}${path}`);
    assert.equal(response.status, 200);
    const [item] = await response.json();
    assert.equal(item.isFavorite, false);
    assert.equal(item.city.name, 'Paris');
    assert.equal(item.city.location.latitude, 48.85661);
    assert.equal(item.author, undefined);
    assert.equal(item.description, undefined);
    assert.equal(item.ratingSum, undefined);
    assert.equal(item._id, undefined);
  }
  const response = await fetch(`${url}/offers/${offer.id}`);
  const item = await response.json();
  assert.equal(item.author.email, 'alice@example.com');
  assert.equal(item.author.password, undefined);
  assert.equal(item.author.favorites, undefined);
  assert.equal(typeof item.author.avatarUrl, 'string');
}));

test('sessions support login, check, logout and reject invalid credentials and tokens', () => withApi(async ({ url, json, login }) => {
  const { token, user } = await login();
  assert.equal(user.password, undefined);
  assert.equal((await fetch(`${url}/users/login`, json('GET', undefined, token))).status, 200);
  assert.equal((await fetch(`${url}/users/logout`, json('DELETE', undefined, token))).status, 204);
  assert.equal((await fetch(`${url}/users/login`, json('GET', undefined, token))).status, 401);
  assert.equal((await fetch(`${url}/offers`, json('GET', undefined, 'invalid'))).status, 401);
  assert.equal((await fetch(`${url}/users/login`, json('POST', { email: 'alice@example.com', password: 'wrong' }))).status, 401);
  assert.equal((await fetch(`${url}/favorites`)).status, 401);
}));

test('registration handles multipart avatar, duplicate email and authenticated clients', () => withApi(async ({ url, json, login }) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: 'Bob', email: 'bob@example.com', password: '123456', type: 'pro' })) {
    form.set(key, value);
  }
  form.set('avatar', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'avatar.png');
  const response = await fetch(`${url}/users/register`, { method: 'POST', body: form });
  assert.equal(response.status, 201);
  const user = await response.json();
  assert.match(user.avatarUrl, /^data:image\/png;base64,/);
  assert.equal(user.password, undefined);
  assert.equal((await fetch(`${url}/users/register`, json('POST', { email: 'alice@example.com' }))).status, 409);
  const { token } = await login();
  assert.equal((await fetch(`${url}/users/register`, json('POST', {}, token))).status, 403);
}));

test('offer writes use the session author and ignore fields outside the DTO', () => withApi(async ({ url, json, login, offer }) => {
  const { token } = await login();
  assert.equal((await fetch(`${url}/offers`, json('POST', { ...offer, authorId: 'forged' }, token))).status, 201);
  const response = await fetch(`${url}/offers/${offer.id}`, json('PATCH', { title: 'Updated apartment', author: 'forged', rating: 5 }, token));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.title, 'Updated apartment');
  assert.equal(result.rating, 1);
  offer.author = { _id: 'another-user' };
  assert.equal((await fetch(`${url}/offers/${offer.id}`, json('PATCH', {}, token))).status, 403);
  assert.equal((await fetch(`${url}/offers/${offer.id}`, json('DELETE', undefined, token))).status, 403);
}));

test('favorites are personal and repeatable; successful deletions have no body', () => withApi(async ({ url, json, login, offer }) => {
  const { token } = await login();
  for (const method of ['PUT', 'PUT', 'DELETE', 'DELETE']) {
    const response = await fetch(`${url}/favorites/${offer.id}`, json(method, undefined, token));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).isFavorite, method === 'PUT');
  }
  const response = await fetch(`${url}/offers/${offer.id}`, json('DELETE', undefined, token));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
}));

test('exception filter catches async failures, logs errors and returns JSON for malformed requests', () => withApi(async ({ url, offers, errors }) => {
  assert.equal((await fetch(`${url}/offers/missing`)).status, 404);
  assert.equal((await fetch(`${url}/unknown`)).status, 404);
  const malformed = await fetch(`${url}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  offers.find = async () => { throw new Error('Secret database connection string'); };
  const response = await fetch(`${url}/offers`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: 'Internal server error' });
  assert(errors.some(([message]) => message.includes('Secret database connection string')));
}));
