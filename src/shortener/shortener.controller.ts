import {
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

@Controller("shortener")
export class ShortenerController {
  constructor(private readonly shortenerService: ShortenerService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Request() req, @Body() createShortenerDto: CreateShortenerDto) {
    createShortenerDto.userId = req.user._id;
    return this.shortenerService.create(createShortenerDto);
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
