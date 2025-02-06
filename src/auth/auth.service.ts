import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Account } from 'src/account/schemas/account.schema';
import { LoginDto } from './dto/login.dto';
import { AccountService } from 'src/account/account.service';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly accountService: AccountService, 
        private jwtService: JwtService
    ) {}
    
    async validateUser(user: LoginDto): Promise<Account | null> {
        const account = await this.accountService.findOneByUsername(user.username);
        if (!account) {
            throw new UnauthorizedException('Invalid username or password');
          }
      
          const isPasswordValid = await bcrypt.compare(user.password, account.password);
          
          if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid username or password');
          }
        return account;
    }

    async login(user: LoginDto) {
        const account = await this.validateUser(user);
        
        if (!account) {
          throw new UnauthorizedException('Invalid username or password');
        }
    
        const payload = { username: account.username, role: account.role, sub: account.username };
        const token = this.jwtService.sign(payload);
    
        return {
          access_token: token,
          user: {
            username: account.username,
            fullname: account.fullname,
            role: account.role,
          },
        };
      }


}
