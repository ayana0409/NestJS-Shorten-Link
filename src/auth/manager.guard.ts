import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { I18nService } from "../common/i18n";

const ADMIN_AND_MANAGER_ROLES = [
  "admin",
  "administrator",
  "superadmin",
  "system_admin",
  "shorterlink-admin",
  "manager",
  "shorterlink-manager",
  "sub-admin",
  "subadmin",
  "sub_admin"
];

@Injectable()
export class ManagerGuard implements CanActivate {
  constructor(private i18n: I18nService) { }

  /**
   * Helper to resolve a message using the default locale
   */
  private msg(keyPath: string, ...args: any[]): string {
    return this.i18n.t(this.i18n.defaultLocale, keyPath, ...args);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(this.msg("auth.MANAGER_ACCESS_REQUIRED"));
    }

    const role = user.role?.toLowerCase?.();
    const roles: string[] = Array.isArray(user.roles)
      ? user.roles.map((r: any) => String(r).toLowerCase().trim())
      : [];

    const isAllowed =
      role === "admin" ||
      role === "manager" ||
      ADMIN_AND_MANAGER_ROLES.includes(role) ||
      roles.some((r) => ADMIN_AND_MANAGER_ROLES.includes(r));

    if (!isAllowed) {
      throw new ForbiddenException(this.msg("auth.MANAGER_ACCESS_REQUIRED"));
    }

    return true;
  }
}

