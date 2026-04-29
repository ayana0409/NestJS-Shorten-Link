export class CreateShortenerDto {
  originalUrl!: string;
  userId!: string;
  siteName?: string;
  password?: string;
  validityFromDate?: Date;
  validityToDate?: Date;
  noExpiration?: boolean;
}
