import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { AuthRequest } from "../interfaces/auth-request.interface";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

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
      this.logger.error(
        `Error during ${request.method} ${request.url} ${status}` +
          (status === HttpStatus.FORBIDDEN && request.user
            ? ` user=${JSON.stringify(request.user)}`
            : "") +
          `: ${JSON.stringify(responseBody)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: responseBody,
    });
  }
}
