import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type AuditLogDocument = AuditLog & Document;

export type AuditLogAction = "create" | "update" | "delete" | "error";

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: ["create", "update", "delete", "error"] })
  action!: AuditLogAction;

  @Prop({ required: true })
  entity!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: String, default: null })
  entityId?: string | null;

  @Prop({ type: String, default: null })
  performedBy?: string | null;

  @Prop({ type: String, default: null })
  performedById?: string | null;

  @Prop({ type: String, default: null })
  requestMethod?: string | null;

  @Prop({ type: String, default: null })
  requestUrl?: string | null;

  @Prop({ type: Object, default: null })
  requestBody?: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  error?: string | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
