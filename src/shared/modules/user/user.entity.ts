import { defaultClasses, getModelForClass, modelOptions, prop, Ref } from '@typegoose/typegoose';
import { USER_TYPES, UserType } from '../../../types.js';
import { createSHA256 } from '../../helpers/index.js';
import type { OfferEntity } from '../offer/offer.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { AVATAR_REGEXP, EMAIL_REGEXP, UserNameLength, UserPasswordLength } from './user.constant.js';

@modelOptions({
  schemaOptions: {
    collection: 'users',
    timestamps: true,
  }
})
export class UserEntity extends defaultClasses.TimeStamps {
  @prop({
    required: true,
    trim: true,
    minlength: [UserNameLength.Min, `Min length for name is ${UserNameLength.Min}`],
    maxlength: [UserNameLength.Max, `Max length for name is ${UserNameLength.Max}`],
  })
  public name!: string;

  @prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [EMAIL_REGEXP, 'Email is incorrect'],
  })
  public email!: string;

  @prop({
    required: false,
    trim: true,
    match: [AVATAR_REGEXP, 'Avatar must be a .jpg or .png image'],
  })
  public avatarUrl?: string;

  // Stores a SHA-256 hash, so the raw password length is checked in setPassword.
  @prop({ required: true })
  private password?: string;

  @prop({ required: true, type: () => String, enum: USER_TYPES })
  public type!: UserType;

  // Favorite offers are stored per user, so the "isFavorite" flag
  // can be calculated for the current user instead of being shared by everyone.
  // A string ref avoids a circular import with offer.entity.
  @prop({ ref: 'OfferEntity', default: [] })
  public favorites!: Ref<OfferEntity>[];

  constructor(userData: Omit<CreateUserDto, 'password'>) {
    super();

    this.name = userData.name;
    this.email = userData.email;
    this.avatarUrl = userData.avatarUrl;
    this.type = userData.type;
  }

  public setPassword(password: string, salt: string): void {
    if (password.length < UserPasswordLength.Min || password.length > UserPasswordLength.Max) {
      throw new Error(`Password length must be from ${UserPasswordLength.Min} to ${UserPasswordLength.Max} characters`);
    }

    this.password = createSHA256(password, salt);
  }

  public getPassword(): string | undefined {
    return this.password;
  }
}

export const UserModel = getModelForClass(UserEntity);
