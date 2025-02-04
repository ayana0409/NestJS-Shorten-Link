import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';
import { ShortenerModule } from './shortener/shortener.module';

import * as dotenv from 'dotenv';
import { ConfigModule } from '@nestjs/config/dist';
import { AccountModule } from './account/account.module';
dotenv.config()

const connectionString = process.env.MONGO_DB_CONNECTIONSTRING;
if (!connectionString) {
  throw new Error('MongoDB connection string is not defined!');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(connectionString),
    ShortenerModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
