import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { AccountService } from "./account.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ShortenerService } from "../shortener/shortener.service";

@Controller("account")
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly shortenerService: ShortenerService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Post("register")
  register(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Get("admin")
  @UseGuards(AuthGuard, AdminGuard)
  async findAllAdmin(
    @Query("search") search?: string,
    @Query("sortBy") sortBy = "createdAt",
    @Query("sortOrder") sortOrder = "desc",
    @Query("page") page = "1",
    @Query("limit") limit = "5",
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 5;
    const { accounts, total } = await this.accountService.findAllPaginated(
      search,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
    );
    const totalPages = Math.max(1, Math.ceil(total / limitNumber));
    return { data: accounts, page: pageNumber, totalPages };
  }

  @Get("admin/:id")
  @UseGuards(AuthGuard, AdminGuard)
  async findOneAdmin(
    @Param("id") id: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("sortBy") sortBy = "createdAt",
    @Query("sortOrder") sortOrder = "desc",
    @Query("page") page = "1",
    @Query("limit") limit = "5",
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 5;
    const account = await this.accountService.findOne(id);
    const links = await this.shortenerService.findByUserId(
      id,
      search,
      status,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
    );
    const totalLinks = await this.shortenerService.countByUserId(
      id,
      search,
      status,
    );
    const totalPages = Math.max(1, Math.ceil(totalLinks / limitNumber));
    return { account, links, page: pageNumber, totalPages };
  }

  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.accountService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, AdminGuard)
  update(@Param("id") id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountService.update(id, updateAccountDto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, AdminGuard)
  remove(@Param("id") id: string) {
    return this.accountService.remove(id);
  }
}
