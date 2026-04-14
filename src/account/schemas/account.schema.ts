import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
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
}

export const AccountSchema = SchemaFactory.createForClass(Account);
