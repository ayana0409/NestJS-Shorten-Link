import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose/dist';

@Schema({ timestamps: true })
export class Shortener {
  @Prop({ required: true })
  originalUrl: string;

  @Prop({ required: true, unique: true })
  shortUrl: string;

  @Prop({ type: Number, default: 0 })
  clicks: number;

  @Prop({ required: false })
  expiresAt?: Date;

  @Prop({ enum: ['active', 'expired', 'disabled'], default: 'active' })
  status: string;

  @Prop({ required: false })
  userId?: string;

}

export const ShortenerSchema = SchemaFactory.createForClass(Shortener);
