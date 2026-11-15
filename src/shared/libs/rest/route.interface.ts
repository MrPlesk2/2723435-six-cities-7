import { RequestHandler } from 'express';

export interface Route<Params = Record<string, string>, Body = unknown> {
  path: string;
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  handler: RequestHandler<Params, unknown, Body>;
  middleware?: RequestHandler<Params, unknown, Body>[];
}
