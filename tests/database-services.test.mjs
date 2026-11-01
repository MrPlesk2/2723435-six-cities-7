import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DefaultCommentService } from '../dist/shared/modules/comment/default-comment.service.js';
import { DefaultOfferService } from '../dist/shared/modules/offer/default-offer.service.js';
import { DefaultUserService } from '../dist/shared/modules/user/default-user.service.js';

const logger = { debug() {}, info() {} };

test('comment creation updates statistics once and excludes the password', async () => {
  const calls = [];
  const document = { id: 'comment', populate: async (...args) => { calls.push(args); return document; } };
  const model = { create: async (data) => { calls.push(data); return document; } };
  const offers = { findById: async () => ({}), addRating: async (...args) => { calls.push(args); return {}; } };
  const service = new DefaultCommentService(model, offers);
  await service.create({ text: 'Great apartment', rating: 4, authorId: 'user', offerId: 'offer' });
  assert.deepEqual(calls, [
    { text: 'Great apartment', rating: 4, author: 'user', offer: 'offer' },
    ['offer', { rating: 4 }],
    ['author', '-password'],
  ]);
});

test('missing offer does not create a comment', async () => {
  const service = new DefaultCommentService({ create() { assert.fail('Unexpected write'); } }, { findById: async () => null });
  await assert.rejects(service.create({ offerId: 'missing' }), /Offer not found/);
});

test('failed statistics update removes the newly created comment', async () => {
  let removed;
  const model = {
    create: async () => ({ id: 'comment' }),
    findByIdAndDelete: (id) => ({ exec: async () => { removed = id; } }),
  };
  const service = new DefaultCommentService(model, {
    findById: async () => ({}),
    addRating: async () => { throw new Error('Write failed'); },
  });
  await assert.rejects(service.create({ offerId: 'offer', rating: 3 }), /Write failed/);
  assert.equal(removed, 'comment');
});

test('deleting another author offer does not delete comments or favorites', async () => {
  const model = { findOneAndDelete: (filter) => {
    assert.deepEqual(filter, { _id: 'offer', author: 'other' });
    return { exec: async () => null };
  } };
  const service = new DefaultOfferService(logger, model, {
    deleteMany() { assert.fail('Unexpected deletion'); },
  }, { updateMany() { assert.fail('Unexpected update'); } });
  assert.equal(await service.deleteById('offer', 'other'), null);
});

test('offer deletion cleans comments and favorites', async () => {
  const calls = [];
  const service = new DefaultOfferService(logger,
    { findOneAndDelete: () => ({ exec: async () => ({ id: 'offer' }) }) },
    { deleteMany: (filter) => ({ exec: async () => calls.push(filter) }) },
    { updateMany: (...args) => ({ exec: async () => calls.push(args) }) },
  );
  await service.deleteById('offer', 'owner');
  assert.deepEqual(calls, [{ offer: 'offer' }, [{ favorites: 'offer' }, { $pull: { favorites: 'offer' } }]]);
});

test('favorites use set semantics and reject a missing offer', async () => {
  let update;
  const users = { findByIdAndUpdate: (id, value) => {
    update = value;
    return { exec: async () => ({ id }) };
  } };
  const service = new DefaultUserService(logger, { exists: async () => true }, users);
  await service.addFavorite('user', { offerId: 'offer' });
  assert.deepEqual(update, { $addToSet: { favorites: 'offer' } });
  const missing = new DefaultUserService(logger, { exists: async () => null }, users);
  await assert.rejects(missing.addFavorite('user', { offerId: 'missing' }), /Offer not found/);
});
