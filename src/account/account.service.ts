import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account, AccountDocument } from './schemas/account.schema';
import { InjectModel } from '@nestjs/mongoose/dist/common';
import { Model } from 'mongoose';

@Injectable()
export class AccountService {

  constructor(@InjectModel(Account.name) private accountModel: Model<AccountDocument>) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = new this.accountModel(createAccountDto);
    return account.save();
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
