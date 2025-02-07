import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist';
import { CreateShortenerDto } from './dto/create-shortener.dto';
import { UpdateShortenerDto } from './dto/update-shortener.dto';
import { Shortener } from './schema/shortener.schema';
import { Model } from 'mongoose';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config/dist/config.service';
dotenv.config();

@Injectable()
export class ShortenerService {
  constructor(
    @InjectModel(Shortener.name) private shortenerModel: Model<Shortener>,
    private configService: ConfigService,
  ) {}

  async create(createShortenerDto: CreateShortenerDto) {
    const { originalUrl } = createShortenerDto;

    const shortUrlLength = this.configService.get<number>('SHORT_URL_LENGTH', 6);
    const shortUrlExpirationDays = this.configService.get<number>('SHORT_URL_EXPIRATION_DAYS', 30);

    const shortUrl = await this.generateUniqueShortUrl(shortUrlLength);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + shortUrlExpirationDays);

    const shortener = new this.shortenerModel({
      originalUrl,
      shortUrl,
      clicks: 0,
      status: 'active',
      expiresAt: expirationDate,
      userId: createShortenerDto.userId ?? null,
    });

    return shortener.save();
  }

  findAll() {
    return this.shortenerModel.find().exec();
  }

  findOne(id: string) {
    return this.shortenerModel.findById(id).exec();
  }

  findByUserId(userId: string) {
    return this.shortenerModel.find({ userId }).exec();
  }

  async findByShortUrl(shortUrl: string) {
    return this.shortenerModel.findOneAndUpdate(
      { shortUrl },
      { $inc: { clicks: 1 } },
      { new: true }
    ).exec();
  }
  

  async update(id: string, updateShortenerDto: UpdateShortenerDto) {
    return this.shortenerModel.findByIdAndUpdate(id, updateShortenerDto, { new: true }).exec();
  }

  async remove(id: string) {
    return this.shortenerModel.findByIdAndDelete(id).exec();
  }

  async generateUniqueShortUrl(length: number): Promise<string> {
    let shortUrl: string = '';
    let exists = true;

    while (exists) {
      shortUrl = this.generateShortUrl(length);
      exists = await this.shortenerModel.findOne({ shortUrl }).exec() != null;
    }

    return shortUrl;
  }

  private generateShortUrl(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortUrl = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      shortUrl += characters[randomIndex];
    }

    return shortUrl;
  }
}
