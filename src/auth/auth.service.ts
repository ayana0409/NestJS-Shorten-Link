import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Account, AccountDocument } from "../account/schemas/account.schema";
import { LoginDto } from "./dto/login.dto";
import { AccountService } from "../account/account.service";
import { JwtService } from "@nestjs/jwt/dist/jwt.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly accountService: AccountService,
    private jwtService: JwtService,
  ) {}

  async validateUser(user: LoginDto): Promise<AccountDocument | null> {
    let account: AccountDocument;
    try {
      account = await this.accountService.findOneByUsername(user.username);
    } catch {
      throw new UnauthorizedException("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(
      user.password,
      account.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid username or password");
    }

    if (!account.isActive) {
      throw new ForbiddenException("Tài khoản đã bị khóa vĩnh viễn");
    }

    return account;
  }

  async login(user: LoginDto) {
    if (!user) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const account = await this.validateUser(user);

    if (!account) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const payload = {
      _id: account._id,
      username: account.username,
      role: account.role,
      sub: account.username,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      expires_in: 3600,
      user: {
        username: account.username,
        fullname: account.fullname,
        role: account.role,
      },
    };
  }
}
