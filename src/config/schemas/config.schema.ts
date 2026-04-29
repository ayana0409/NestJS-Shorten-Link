import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose/dist";

@Schema({ timestamps: true })
export class Config {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  value!: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  type?: string; // 'string', 'number', 'boolean'

  @Prop({ default: false })
  isHidden?: boolean;
}

export const ConfigSchema = SchemaFactory.createForClass(Config);
