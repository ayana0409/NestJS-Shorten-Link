import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose/dist";
import { CreateShortenerDto } from "./dto/create-shortener.dto";
import { UpdateShortenerDto } from "./dto/update-shortener.dto";
import { Shortener } from "./schema/shortener.schema";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
import * as he from "he";

import { buildSort, paginateModel } from "../common/pagination";
dotenv.config();

@Injectable()
export class ShortenerService {
  constructor(
    @InjectModel(Shortener.name) private shortenerModel: Model<Shortener>,
    private configService: ConfigService,
  ) {}

  async create(createShortenerDto: CreateShortenerDto) {
    const { originalUrl } = createShortenerDto;

    const shortUrlLength = Number(
      this.configService.get<string>("SHORT_URL_LENGTH", "6"),
    );
    const shortUrlExpirationMinutes = Number(
      this.configService.get<string>("SHORT_URL_EXPIRATION_DAYS", "30"),
    );

    const shortUrl = await this.generateUniqueShortUrl(shortUrlLength);

    const expirationDate = new Date();
    expirationDate.setMinutes(
      expirationDate.getMinutes() + shortUrlExpirationMinutes,
    );

    const shortener = new this.shortenerModel({
      originalUrl,
      shortUrl,
      siteName: createShortenerDto.siteName ?? null,
      clicks: 0,
      status: "active",
      expiresAt: expirationDate,
      userId: createShortenerDto.userId ?? null,
    });

    const saved = await shortener.save();

    if (!createShortenerDto.siteName) {
      this.fetchPageTitle(originalUrl)
        .then((siteName) => {
          if (siteName) {
            return this.shortenerModel
              .findByIdAndUpdate(saved._id, { siteName }, { new: true })
              .exec();
          }
          return null;
        })
        .catch(() => null);
    }

    return saved;
  }

  findAll() {
    return this.shortenerModel.find().exec();
  }

  findOne(id: string) {
    return this.shortenerModel.findById(id).exec();
  }

  private buildUserQuery(userId: string, search?: string, status?: string) {
    const query: any = { userId };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { siteName: regex },
        { originalUrl: regex },
        { shortUrl: regex },
      ];
    }

    if (status && status !== "all") {
      if (status === "valid") {
        query.status = "active";
        query.expiresAt = { $gt: new Date() };
      } else if (status === "expired") {
        query.expiresAt = { $lte: new Date() };
        query.status = { $ne: "disabled" };
      } else if (status === "disabled") {
        query.status = "disabled";
      }
    }

    return query;
  }

  private buildSort(sortBy = "createdAt", sortOrder = "desc") {
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    return sort;
  }

  private paginateQuery(query: any, sort: any, page = 1, limit = 5) {
    const skip = (page - 1) * limit;
    return this.shortenerModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  findByUserId(
    userId: string,
    search?: string,
    status?: string,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 5,
  ) {
    const query = this.buildUserQuery(userId, search, status);
    const sort = this.buildSort(sortBy, sortOrder);
    return this.paginateQuery(query, sort, page, limit);
  }

  async countByUserId(userId: string, search?: string, status?: string) {
    const query = this.buildUserQuery(userId, search, status);
    return this.shortenerModel.countDocuments(query).exec();
  }

  getDailyShortenerLimit(): number {
    return Number(this.configService.get<string>("DAILY_SHORTEN_LIMIT", "10"));
  }

  async countDailyCreatedByUser(userId: string): Promise<number> {
    if (!userId) {
      return 0;
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.shortenerModel
      .countDocuments({
        userId,
        createdAt: { $gte: startOfToday },
      })
      .exec();
  }

  async findByShortUrl(shortUrl: string) {
    return this.shortenerModel
      .findOneAndUpdate(
        { shortUrl, status: "active", expiresAt: { $gt: new Date() } },
        { $inc: { clicks: 1 } },
        { new: true },
      )
      .exec();
  }

  async update(id: string, updateShortenerDto: UpdateShortenerDto) {
    return this.shortenerModel
      .findByIdAndUpdate(id, updateShortenerDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.shortenerModel.findByIdAndDelete(id).exec();
  }

  async generateUniqueShortUrl(length: number): Promise<string> {
    let shortUrl: string = "";
    let exists = true;

    while (exists) {
      shortUrl = this.generateShortUrl(length);
      exists = (await this.shortenerModel.findOne({ shortUrl }).exec()) != null;
    }

    return shortUrl;
  }

  private normalizeUrl(url: string): string {
    if (!/^https?:\/\//i.test(url)) {
      return `http://${url}`;
    }
    return url;
  }

  private async fetchPageTitle(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
        },
        responseType: "text",
        decompress: true,
      });

      const html = res.data;
      const $ = cheerio.load(html);

      // Ưu tiên OG
      let title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text();

      if (!title) return null;

      return he.decode(title.trim());
    } catch {
      return null;
    }
  }

  private generateShortUrl(length: number): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let shortUrl = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      shortUrl += characters[randomIndex];
    }

    return shortUrl;
  }
}
