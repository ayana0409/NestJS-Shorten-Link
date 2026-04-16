import { Controller, Delete, Get, Query, UseGuards } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("audit")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get("admin")
  @UseGuards(AuthGuard, AdminGuard)
  async findAllAdmin(
    @Query("search") search?: string,
    @Query("action") action?: string,
    @Query("sortBy") sortBy = "createdAt",
    @Query("sortOrder") sortOrder = "desc",
    @Query("page") page = "1",
    @Query("limit") limit = "5",
  ) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 5;
    const { logs, total } = await this.auditLogService.findAllPaginated(
      search,
      action,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
    );
    const totalPages = Math.max(1, Math.ceil(total / limitNumber));
    return { data: logs, page: pageNumber, totalPages };
  }

  @Delete("admin")
  @UseGuards(AuthGuard, AdminGuard)
  async deleteByCondition(
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.auditLogService.deleteByCondition(action, from, to);
  }
}
