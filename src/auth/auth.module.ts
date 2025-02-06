import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountModule } from 'src/account/account.module';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import * as dotenv from 'dotenv';
import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { ConfigService } from '@nestjs/config/dist/config.service';

dotenv.config()

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  throw new Error('SECRET_KEY is not defined');
}

const expiresIn = process.env.EXPIRES;
if (!expiresIn) {
  throw new Error('EXPIRES is not defined');
}

@Module({
  imports: [
    forwardRef(() => AccountModule),
    JwtModule.register({
      global: true,
      secret: secretKey,
      signOptions: { expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService
  ],
  exports: [AuthService]
})
export class AuthModule {}



