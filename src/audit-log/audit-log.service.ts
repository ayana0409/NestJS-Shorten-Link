import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog, AuditLogDocument } from "./schemas/audit-log.schema";
import {
  buildSearchQuery,
  buildSort,
  paginateModel,
} from "../common/pagination";

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLogDocument> {
    const auditLog = new this.auditLogModel(data);
    return auditLog.save();
  }

  async findAllPaginated(
    search?: string,
    action?: string,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 5,
  ) {
    const query = buildSearchQuery(search, [
      "description",
      "entity",
      "performedBy",
      "requestUrl",
    ]);

    if (action && action !== "all") {
      Object.assign(query, { action });
    }

    const sort = buildSort(sortBy, sortOrder);
    const [logs, total] = await Promise.all([
      paginateModel(this.auditLogModel, query, sort, page, limit),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    const safeLogs = logs.map((log: any) => {
      const item = log.toObject ? log.toObject() : log;

      return {
        ...item,
        requestBody: sanitizeRequestBody(item.requestBody),
      };
    });

    return { logs: safeLogs, total };
  }

  async deleteByCondition(
    action?: string,
    from?: string,
    to?: string,
  ): Promise<{ deletedCount: number }> {
    const query: any = {};

    if (action && action !== "all") {
      query.action = action;
    }

    const createdAtQuery: any = {};
    if (from) {
      const fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) {
        throw new BadRequestException("Invalid from date");
      }
      createdAtQuery.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) {
        throw new BadRequestException("Invalid to date");
      }
      createdAtQuery.$lte = toDate;
    }

    if (Object.keys(createdAtQuery).length > 0) {
      query.createdAt = createdAtQuery;
    }

    const result = await this.auditLogModel.deleteMany(query).exec();
    return { deletedCount: result.deletedCount ?? 0 };
  }
}

function sanitizeRequestBody(body: any) {
  if (!body || typeof body !== "object") return body;

  const clone = { ...body };

  const sensitiveFields = [
    "password",
    "confirmPassword",
    "oldPassword",
    "newPassword",
    "token",
    "refreshToken",
    "accessToken",
  ];

  for (const key of sensitiveFields) {
    if (key in clone) {
      clone[key] = "***REDACTED***";
    }
  }

  return clone;
}
