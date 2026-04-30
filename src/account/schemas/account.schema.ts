import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { AccountRole } from "../account-role.enum";

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  fullname!: string;

  @Prop({ type: String, enum: AccountRole, default: AccountRole.USER })
  role!: AccountRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: "Level", default: null })
  level!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  levelExpirationDate!: Date | null;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
