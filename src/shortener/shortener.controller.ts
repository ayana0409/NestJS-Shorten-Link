import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ShortenerService } from "./shortener.service";
import { CreateShortenerDto } from "./dto/create-shortener.dto";
import { UpdateShortenerDto } from "./dto/update-shortener.dto";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("shortener")
export class ShortenerController {
  constructor(private readonly shortenerService: ShortenerService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Request() req, @Body() createShortenerDto: CreateShortenerDto) {
    const userId = req.user?._id;
    createShortenerDto.userId = userId;

    if (req.user?.role !== "admin") {
      const limit = this.shortenerService.getDailyShortenerLimit();
      const used = await this.shortenerService.countDailyCreatedByUser(userId);
      if (used >= limit) {
        throw new BadRequestException(
          `Bạn đã đạt giới hạn ${limit} liên kết hôm nay. Vui lòng thử lại vào ngày mai.`,
        );
      }
    }

    return this.shortenerService.create(createShortenerDto);
  }

  @Get("quota")
  @UseGuards(AuthGuard)
  async getQuota(@Request() req) {
    const username = req.user?.username || "Người dùng";
    const role = req.user?.role || "user";

    if (role === "admin") {
      return {
        username,
        role,
        unlimited: true,
        limit: null,
        used: 0,
        remaining: null,
      };
    }

    const limit = this.shortenerService.getDailyShortenerLimit();
    const used = await this.shortenerService.countDailyCreatedByUser(
      req.user?._id,
    );
    const remaining = Math.max(limit - used, 0);

    return {
      username,
      role,
      unlimited: false,
      limit,
      used,
      remaining,
    };
  }

  @Get("analytics")
  @UseGuards(AuthGuard)
  async getAnalytics(
    @Request() req,
    @Query("range") range = "daily",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.shortenerService.getLinkCreationStats(
      req.user?._id,
      range,
      from,
      to,
    );
  }

  @Get("analytics/admin")
  @UseGuards(AuthGuard, AdminGuard)
  async getAdminAnalytics(
    @Query("range") range = "daily",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.shortenerService.getLinkCreationStats(null, range, from, to);
  }

  @Get()
  findAll() {
    return this.shortenerService.findAll();
  }

  @Get("user")
  @UseGuards(AuthGuard)
  async findByUserId(
    @Request() req,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("sortBy") sortBy = "createdAt",
    @Query("sortOrder") sortOrder = "desc",
    @Query("page") page = "1",
    @Query("limit") limit = "5",
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 5;
    const links = await this.shortenerService.findByUserId(
      req.user._id,
      search,
      status,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
    );
    const totalLinks = await this.shortenerService.countByUserId(
      req.user._id,
      search,
      status,
    );
    const totalPages = Math.max(1, Math.ceil(totalLinks / limitNumber));
    return {
      data: links,
      page: pageNumber,
      totalPages,
    };
  }

  @Get(":shortUrl")
  async findByShortUrl(@Param("shortUrl") shortUrl: string) {
    const result = await this.shortenerService.findByShortUrl(shortUrl);
    if (!result) {
      throw new NotFoundException("Short link not found or expired");
    }
    return result;
  }

  @Post(":shortUrl/click")
  async validateClick(
    @Param("shortUrl") shortUrl: string,
    @Body("password") password?: string,
  ) {
    return this.shortenerService.validateAndIncrementClick(shortUrl, password);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateShortenerDto: UpdateShortenerDto,
  ) {
    return this.shortenerService.update(id, updateShortenerDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.shortenerService.remove(id);
  }
}
