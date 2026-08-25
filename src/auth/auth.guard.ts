import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AccountService } from "../account/account.service";
import { I18nService } from "../common/i18n";
import { SsoJwksService } from "./sso-jwks.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private accountService: AccountService,
    private ssoJwksService: SsoJwksService,
    private i18n: I18nService,
  ) {}

  /**
   * Helper to resolve a message using the default locale
   */
  private msg(keyPath: string, ...args: any[]): string {
    return this.i18n.t(this.i18n.defaultLocale, keyPath, ...args);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      if (this.ssoJwksService.isQuickBiteToken(token)) {
        // Verify QuickBite SSO Token via JWKS
        const ssoClaims = await this.ssoJwksService.verifyQuickBiteToken(token);
        const ssoUser = this.ssoJwksService.extractUserFromClaims(ssoClaims);

        // Sync or auto-provision account in MongoDB
        const account =
          await this.accountService.findOrCreateOrUpdateSsoAccount(ssoUser);

        if (!account || !account.isActive) {
          throw new ForbiddenException(this.msg("auth.ACCOUNT_LOCKED"));
        }

        // Attach standardized user object to request
        const ssoAccountId = String((account as any)._id);
        request["user"] = {
          _id: ssoAccountId,
          id: ssoAccountId,
          username: account.username,
          fullname: account.fullname,
          role: account.role,
          roles: ssoUser.rawRoles,
          sub: ssoUser.sub,
          email: ssoUser.email,
          permissions: ssoUser.permissions,
          isSso: true,
        };
      } else {
        // Verify Local ShorterLink JWT Token (HS256)
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>("JWT_SECRET"),
        });

        const account = await this.accountService
          .findOneByUsername(payload.username)
          .catch(() => null);

        if (!account || !account.isActive) {
          throw new ForbiddenException(this.msg("auth.ACCOUNT_LOCKED"));
        }

        const localAccountId = String((account as any)._id);
        request["user"] = {
          ...payload,
          _id: localAccountId,
          id: localAccountId,
          role: account.role,
          isSso: false,
        };
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];

    return type === "Bearer" ? token : undefined;
  }
}

