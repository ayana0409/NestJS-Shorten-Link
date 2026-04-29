export class UpdateConfigDto {
  value!: string;
  description?: string;
  type?: string;
  isHidden?: boolean;
}

export class ConfigResponse {
  key!: string;
  value!: string;
  description?: string;
  type?: string;
  isHidden?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
