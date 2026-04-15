import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const body = request.body ? JSON.stringify(request.body) : undefined;
    const user = request.user ? JSON.stringify(request.user) : undefined;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const duration = Date.now() - startTime;
            const parts = [`${method} ${url} completed`, `${duration}ms`];
            if (body) {
              parts.push(`body=${body}`);
            }
            if (user) {
              parts.push(`user=${user}`);
            }
            this.logger.log(parts.join(" "));
          }
        },
      }),
    );
  }
}
