import { Expose, plainToInstance } from 'class-transformer';
import { DocumentType } from '@typegoose/typegoose';
import { UserType } from '../../../../types.js';
import { UserEntity } from '../user.entity.js';

export class UserRdo {
  @Expose() public id!: string;
  @Expose() public name!: string;
  @Expose() public email!: string;
  @Expose() public avatarUrl!: string;
  @Expose() public type!: UserType;
}

export function toUserRdo(user: DocumentType<UserEntity>): UserRdo {
  return plainToInstance(UserRdo, {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? 'https://placehold.co/128x128.png',
    type: user.type,
  }, { excludeExtraneousValues: true });
}
