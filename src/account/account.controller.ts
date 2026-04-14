import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Post("register")
  register(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Get("admin")
  @UseGuards(AuthGuard, AdminGuard)
  findAllAdmin() {
    return this.accountService.findAll();
  }

  @Get("admin/:id")
  @UseGuards(AuthGuard, AdminGuard)
  async findOneAdmin(@Param("id") id: string) {
    const account = await this.accountService.findOne(id);
    const links = await this.shortenerService.findByUserId(id);
    return { account, links };
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
  update(@Param("id") id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountService.update(id, updateAccountDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.accountService.remove(id);
  }
}
