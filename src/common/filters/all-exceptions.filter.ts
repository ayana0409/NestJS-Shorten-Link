import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { AuthRequest } from "../interfaces/auth-request.interface";
import { AuditLogService } from "../../audit-log/audit-log.service";

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthRequest>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : exception;

    const shouldLog =
      status !== HttpStatus.BAD_REQUEST &&
      status !== HttpStatus.NOT_FOUND &&
      (status !== HttpStatus.FORBIDDEN || Boolean(request.user));

    if (shouldLog) {
      const errorMessage =
        `Error during ${request.method} ${request.url} ${status}` +
        (status === HttpStatus.FORBIDDEN && request.user
          ? ` user=${JSON.stringify(request.user)}`
          : "") +
        `: ${JSON.stringify(responseBody)}`;

      this.logger.error(
        errorMessage,
        exception instanceof Error ? exception.stack : undefined,
      );

      const pathSegments = request.url.split("?")[0].split("/").filter(Boolean);
      const entity = pathSegments[0] || "unknown";
      const performedBy = request.user?.username || null;
      const performedById = request.user?._id || null;
      const requestBody = request.body
        ? JSON.parse(JSON.stringify(request.body))
        : null;
      const errorDetail =
        exception instanceof Error
          ? exception.message
          : JSON.stringify(exception);

      this.auditLogService
        .createAuditLog({
          action: "error",
          entity,
          entityId: request.params?.id || null,
          description: errorMessage,
          performedBy,
          performedById,
          requestMethod: request.method,
          requestUrl: request.url,
          requestBody,
          error: errorDetail,
        })
        .catch((error) => {
          this.logger.error("Failed to write error audit log", error);
        });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: responseBody,
    });
  }
}
