import { forwardRef, Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AccountModule } from "../account/account.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

@Module({
  imports: [
    forwardRef(() => AccountModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: async (configService: ConfigService) => {
        const secretKey = configService.get<string>("JWT_SECRET");
        if (!secretKey) {
          throw new Error("JWT_SECRET is not defined");
        }

        const expiresIn = configService.get<string>("EXPIRES");
        if (!expiresIn) {
          throw new Error("EXPIRES is not defined");
        }

        return {
          secret: secretKey,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}
