import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LevelDocument = Level & Document;

@Schema({ timestamps: true })
export class Level {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 0 })
  dailyShortenLimit!: number;

  @Prop({ default: false })
  allowPassword!: boolean;

  @Prop({ default: false })
  allowCustomExpiration!: boolean;

  @Prop({ default: true })
  active!: boolean;
}

export const LevelSchema = SchemaFactory.createForClass(Level);
