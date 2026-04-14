import { forwardRef, Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { Account, AccountSchema } from "./schemas/account.schema";
import { MongooseModule } from "@nestjs/mongoose/dist/mongoose.module";
import { AuthModule } from "../auth/auth.module";
import { JwtService } from "@nestjs/jwt";
import { ShortenerModule } from "../shortener/shortener.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    forwardRef(() => AuthModule),
    ShortenerModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService, MongooseModule],
})
export class AccountModule {}
