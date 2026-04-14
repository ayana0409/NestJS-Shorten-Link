import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose/dist";
import { CreateShortenerDto } from "./dto/create-shortener.dto";
import { UpdateShortenerDto } from "./dto/update-shortener.dto";
import { Shortener } from "./schema/shortener.schema";
import { Model } from "mongoose";
import * as http from "http";
import * as https from "https";
import * as dotenv from "dotenv";
import { ConfigService } from "@nestjs/config";
import * as he from "he";
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
    const siteName =
      createShortenerDto.siteName ?? (await this.fetchPageTitle(originalUrl));

    const expirationDate = new Date();
    expirationDate.setMinutes(
      expirationDate.getMinutes() + shortUrlExpirationMinutes,
    );

    const shortener = new this.shortenerModel({
      originalUrl,
      shortUrl,
      siteName,
      clicks: 0,
      status: "active",
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
    return this.shortenerModel
      .findOneAndUpdate({ shortUrl }, { $inc: { clicks: 1 } }, { new: true })
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

  private async fetchPageTitle(
    url: string,
    redirectCount = 0,
  ): Promise<string | null> {
    if (redirectCount > 5) return null;

    try {
      const normalizedUrl = this.normalizeUrl(url);
      const parsedUrl = new URL(normalizedUrl);
      const requestLib = parsedUrl.protocol === "https:" ? https : http;

      return await new Promise((resolve) => {
        const req = requestLib.get(
          normalizedUrl,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            },
            timeout: 5000,
          },
          (res) => {
            const statusCode = res.statusCode ?? 0;

            // redirect
            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
              const nextUrl = new URL(
                res.headers.location,
                normalizedUrl,
              ).toString();
              res.destroy();
              this.fetchPageTitle(nextUrl, redirectCount + 1).then(resolve);
              return;
            }

            if (statusCode < 200 || statusCode >= 300) {
              resolve(null);
              return;
            }

            let html = "";
            const MAX_LENGTH = 50000;

            res.on("data", (chunk) => {
              html += chunk.toString();
              if (html.length > MAX_LENGTH) {
                res.destroy();
              }
            });

            res.on("end", () => {
              // og:title first
              const ogMatch = html.match(
                /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
              );

              if (ogMatch) {
                resolve(he.decode(ogMatch[1].trim()));
                return;
              }

              const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

              resolve(match ? he.decode(match[1].trim()) : null);
            });
          },
        );

        req.on("error", () => resolve(null));
        req.on("timeout", () => {
          req.destroy();
          resolve(null);
        });
      });
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
