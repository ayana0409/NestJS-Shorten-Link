import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { LevelService } from "./level.service";
import { CreateLevelDto } from "./dto/create-level.dto";
import { UpdateLevelDto } from "./dto/update-level.dto";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ManagerGuard } from "../auth/manager.guard";

@Controller("level")
@UseGuards(AuthGuard)
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Post()
  @UseGuards(AdminGuard) // Chỉ Admin mới được tạo
  create(@Body() createLevelDto: CreateLevelDto) {
    return this.levelService.create(createLevelDto);
  }

  @Get()
  @UseGuards(ManagerGuard) // Manager (và Admin) có thể xem danh sách
  async findAll(
    @Query("search") search?: string,
    @Query("sortBy") sortBy = "name",
    @Query("sortOrder") sortOrder = "asc",
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const { levels, total } = await this.levelService.findAllPaginated(
      search,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
    );
    const totalPages = Math.max(1, Math.ceil(total / limitNumber));
    return { data: levels, page: pageNumber, totalPages };
  }

  @Get(":id")
  @UseGuards(AdminGuard) // Chỉ Admin mới được xem chi tiết (nếu bạn muốn vậy)
  findOne(@Param("id") id: string) {
    return this.levelService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard) // Chỉ Admin mới được sửa
  update(@Param("id") id: string, @Body() updateLevelDto: UpdateLevelDto) {
    return this.levelService.update(id, updateLevelDto);
  }

  @Delete(":id")
  @UseGuards(AdminGuard) // Chỉ Admin mới được xóa
  remove(@Param("id") id: string) {
    return this.levelService.remove(id);
  }
}
