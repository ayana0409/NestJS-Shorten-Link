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
      this.fetchPageTitle(originalUrl, 0, 3000)
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

  private async fetchPageTitle(
    url: string,
    redirectCount = 0,
    timeoutMs = 3000,
  ): Promise<string | null> {
    if (redirectCount > 5) return null;

    try {
      const normalizedUrl = this.normalizeUrl(url);
      const parsedUrl = new URL(normalizedUrl);
      const requestLib = parsedUrl.protocol === "https:" ? https : http;

      return await new Promise((resolve) => {
        let timedOut = false;
        let req: http.ClientRequest;

        const timer = setTimeout(() => {
          timedOut = true;
          if (req) {
            req.destroy();
          }
          resolve(null);
        }, timeoutMs);

        req = requestLib.get(
          normalizedUrl,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            },
            timeout: timeoutMs,
          },
          (res) => {
            if (timedOut) {
              res.destroy();
              return;
            }

            clearTimeout(timer);
            const statusCode = res.statusCode ?? 0;

            // redirect
            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
              const nextUrl = new URL(
                res.headers.location,
                normalizedUrl,
              ).toString();
              res.destroy();
              this.fetchPageTitle(nextUrl, redirectCount + 1, timeoutMs).then(
                resolve,
              );
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
              if (timedOut) {
                resolve(null);
                return;
              }

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

        req.on("error", () => {
          clearTimeout(timer);
          resolve(null);
        });
        req.on("timeout", () => {
          clearTimeout(timer);
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
