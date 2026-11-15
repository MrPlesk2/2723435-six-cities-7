import { defaultClasses, getModelForClass, modelOptions, prop, Ref } from '@typegoose/typegoose';
import { OfferEntity } from '../offer/offer.entity.js';
import { UserEntity } from '../user/user.entity.js';

@modelOptions({ schemaOptions: { collection: 'comments', timestamps: true } })
export class CommentEntity extends defaultClasses.TimeStamps {
  @prop()
  public text!: string;

  @prop()
  public rating!: number;

  @prop({ default: Date.now })
  public publishedAt!: Date;

  @prop({ ref: () => UserEntity })
  public author!: Ref<UserEntity>;

  @prop({ ref: () => OfferEntity, index: true })
  public offer!: Ref<OfferEntity>;
}

export const CommentModel = getModelForClass(CommentEntity);
