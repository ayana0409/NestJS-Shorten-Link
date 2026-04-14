import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AccountService } from "./account/account.service";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>("CORS_ORIGIN", "http://localhost:3000"),
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    credentials: true,
  });

  const accountService = app.get(AccountService);
  await accountService.ensureAdminExists(
    configService.get<string>("ADMIN_USERNAME", "admin"),
    configService.get<string>("ADMIN_FULLNAME", "Administrator"),
    configService.get<string>("ADMIN_PASSWORD", "Passw0rd@123"),
  );

  const port = Number(configService.get<string>("PORT", "3000"));

  await app.listen(port);
}
bootstrap();
