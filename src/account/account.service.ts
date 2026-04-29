import {
  BadRequestException,
  ForbiddenException,
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
    createAccountDto.isActive = createAccountDto.isActive ?? true;

    const account = new this.accountModel(createAccountDto);
    const savedAccount = await account.save();

    return {
      username: savedAccount.username,
      fullname: savedAccount.fullname,
      role: savedAccount.role,
      isActive: savedAccount.isActive,
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
    requesterRole?: string,
  ) {
    const query = buildSearchQuery(search, ["username", "fullname"]);

    // Manager can only see user accounts, not admin or other managers
    if (requesterRole === "manager") {
      query.role = AccountRole.USER;
    }

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

  async findOneFiltered(
    id: string,
    requesterRole?: string,
  ): Promise<ResponseAccountDto> {
    const account = await this.accountModel
      .findById(id)
      .select("-password")
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Manager can only access user accounts
    if (requesterRole === "manager" && account.role !== AccountRole.USER) {
      throw new ForbiddenException("You can only access user accounts");
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
    if (updateAccountDto.username) {
      const existingAccount = await this.accountModel
        .findOne({ username: updateAccountDto.username })
        .exec();
      if (existingAccount && existingAccount.id !== id) {
        throw new BadRequestException(
          `Account with username ${updateAccountDto.username} already exists`,
        );
      }
    }

    if (updateAccountDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateAccountDto.password = await bcrypt.hash(
        updateAccountDto.password,
        salt,
      );
    }

    const account = await this.accountModel
      .findByIdAndUpdate(id, updateAccountDto, { new: true })
      .select("-password")
      .exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async updateFiltered(
    id: string,
    updateAccountDto: UpdateAccountDto,
    requesterRole?: string,
  ): Promise<Account> {
    // Manager cannot update role
    if (requesterRole === "manager" && updateAccountDto.role) {
      throw new ForbiddenException("Managers cannot change user roles");
    }

    // Get the account to check its role
    const existingAccount = await this.accountModel.findById(id).exec();
    if (!existingAccount) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Manager can only update user accounts
    if (
      requesterRole === "manager" &&
      existingAccount.role !== AccountRole.USER
    ) {
      throw new ForbiddenException("You can only update user accounts");
    }

    // Call the standard update method
    return this.update(id, updateAccountDto);
  }

  async setActive(id: string, isActive: boolean): Promise<Account> {
    const account = await this.accountModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .select("-password")
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
