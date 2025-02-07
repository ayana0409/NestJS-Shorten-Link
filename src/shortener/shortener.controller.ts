import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ShortenerService } from './shortener.service';
import { CreateShortenerDto } from './dto/create-shortener.dto';
import { UpdateShortenerDto } from './dto/update-shortener.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('shortener')
export class ShortenerController {
  constructor(private readonly shortenerService: ShortenerService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Request() req, @Body() createShortenerDto: CreateShortenerDto) {
    createShortenerDto.userId = req.user._id;
    return this.shortenerService.create(createShortenerDto);
  }

  @Get()
  findAll() {
    return this.shortenerService.findAll();
  }

  @Get(':shortUrl')
  findByShortUrl(@Param('shortUrl') shortUrl: string) {
    return this.shortenerService.findByShortUrl(shortUrl);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShortenerDto: UpdateShortenerDto) {
    return this.shortenerService.update(id, updateShortenerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shortenerService.remove(id);
  }
}
