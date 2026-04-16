import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import { ShortenerModule } from "./shortener/shortener.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AccountModule } from "./account/account.module";
import { AuthModule } from "./auth/auth.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>("MONGO_DB_CONNECTIONSTRING");
        if (!uri) {
          throw new Error("MONGO_DB_CONNECTIONSTRING is not defined!");
        }
        return { uri };
      },
    }),
    ShortenerModule,
    AccountModule,
    AuthModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingInterceptor, AllExceptionsFilter],
})
export class AppModule {}
