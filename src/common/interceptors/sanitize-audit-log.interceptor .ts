import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

@Injectable()
export class SanitizeAuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => sanitizeResponse(data)));
  }
}

const SENSITIVE_FIELDS = [
  "password",
  "confirmPassword",
  "oldPassword",
  "newPassword",
  "token",
  "refreshToken",
  "accessToken",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "otp",
  "pin",
];

function sanitizeResponse(data: any): any {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeResponse);
  }

  const clone = { ...data };

  for (const key of Object.keys(clone)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      clone[key] = "***REDACTED***";
    } else {
      clone[key] = sanitizeResponse(clone[key]);
    }
  }

  return clone;
}
