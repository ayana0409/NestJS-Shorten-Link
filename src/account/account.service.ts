import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { Account, AccountDocument } from "./schemas/account.schema";
import { InjectModel } from "@nestjs/mongoose/dist/common";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";
import { ResponseAccountDto } from "./dto/response-account.dto";
import { AccountRole } from "./account-role.enum";
import {
  buildSearchQuery,
  buildSort,
  paginateModel,
} from "../common/pagination";

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  async create(
    createAccountDto: CreateAccountDto,
  ): Promise<ResponseAccountDto> {
    const existAccount = await this.accountModel
      .findOne({ username: createAccountDto.username })
      .exec();
    if (existAccount) {
      throw new BadRequestException(
        `Account with username ${createAccountDto.username} already exists`,
      );
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createAccountDto.password, salt);
    createAccountDto.password = hashedPassword;
    createAccountDto.role = createAccountDto.role ?? AccountRole.USER;

    const account = new this.accountModel(createAccountDto);
    const savedAccount = await account.save();

    return {
      username: savedAccount.username,
      fullname: savedAccount.fullname,
      role: savedAccount.role,
    };
  }

  async findAll(): Promise<ResponseAccountDto[]> {
    return this.accountModel.find().select("-password").exec();
  }

  async findAllPaginated(
    search?: string,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 5,
  ) {
    const query = buildSearchQuery(search, ["username", "fullname"]);
    const sort = buildSort(sortBy, sortOrder);

    const [accounts, total] = await Promise.all([
      paginateModel(this.accountModel, query, sort, page, limit, "-password"),
      this.accountModel.countDocuments(query).exec(),
    ]);

    return { accounts, total };
  }

  async findOne(id: string): Promise<ResponseAccountDto> {
    const account = await this.accountModel
      .findById(id)
      .select("-password")
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async findOneByUsername(username: string): Promise<AccountDocument> {
    const account = await this.accountModel.findOne({ username }).exec();
    if (!account) {
      throw new NotFoundException(
        `Account with username ${username} not found`,
      );
    }
    return account;
  }

  async ensureAdminExists(
    username: string,
    fullname: string,
    password: string,
  ): Promise<void> {
    const existingAdmin = await this.accountModel.findOne({ username }).exec();

    if (existingAdmin) {
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new this.accountModel({
      username,
      fullname,
      password: hashedPassword,
      role: AccountRole.ADMIN,
    });

    await admin.save();
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.accountModel
      .findByIdAndUpdate(id, updateAccountDto, { new: true })
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async remove(id: string): Promise<Account> {
    const account = await this.accountModel.findByIdAndDelete(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }
}
