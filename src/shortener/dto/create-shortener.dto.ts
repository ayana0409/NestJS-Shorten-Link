export class CreateShortenerDto {
  originalUrl!: string;
  userId!: string;
  siteName?: string;
  password?: string;
}
