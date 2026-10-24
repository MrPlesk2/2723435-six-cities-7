import { createHmac } from 'node:crypto';

export function createSHA256(line: string, salt: string): string {
  return createHmac('sha256', salt).update(line).digest('hex');
}
