import { forwardRef, Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { Account, AccountSchema } from './schemas/account.schema';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService, MongooseModule],
})
export class AccountModule {}
