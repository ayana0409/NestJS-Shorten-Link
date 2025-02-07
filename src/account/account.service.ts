import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account, AccountDocument } from './schemas/account.schema';
import { InjectModel } from '@nestjs/mongoose/dist/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ResponseAccountDto } from './dto/response-account.dto';

@Injectable()
export class AccountService {

  constructor(@InjectModel(Account.name) private accountModel: Model<AccountDocument>) {}

  async create(createAccountDto: CreateAccountDto): Promise<ResponseAccountDto> {
    const existAccount = await this.accountModel.findOne({ username: createAccountDto.username }).exec();
    if (existAccount) {
      throw new BadRequestException(`Account with username ${createAccountDto.username} already exists`);
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createAccountDto.password, salt);
    createAccountDto.password = hashedPassword;
    
    const account = new this.accountModel(createAccountDto);
    const savedAccount = await account.save();
    
    return {
      username: savedAccount.username,
      fullname: savedAccount.fullname,
      role: savedAccount.role
    };
  }

  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async findOneByUsername(username: string): Promise<AccountDocument> {
    const account = await this.accountModel.findOne({ username }).exec();
    if (!account) {
      throw new NotFoundException(`Account with username ${username} not found`);
    }
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto): Promise<Account> {
    const account = await this.accountModel.findByIdAndUpdate(id, updateAccountDto, { new: true }).exec();
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
