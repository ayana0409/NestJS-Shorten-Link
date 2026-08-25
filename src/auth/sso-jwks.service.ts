import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwksClient, { JwksClient } from "jwks-rsa";
import * as jwt from "jsonwebtoken";
import { AccountRole } from "../account/account-role.enum";

export interface SsoUserPayload {
  sub: string;
  username: string;
  fullname: string;
  email?: string;
  role: AccountRole;
  rawRoles: string[];
  permissions?: string[];
  isSso: boolean;
}

@Injectable()
export class SsoJwksService {
  private readonly logger = new Logger(SsoJwksService.name);
  private jwksClientInstance: JwksClient;
  private identityUrl: string;

  constructor(private configService: ConfigService) {
    this.identityUrl =
      this.configService.get<string>("IDENTITY_URL") ||
      "https://quick-bite-identity.onrender.com";

    const jwksUri = `${this.identityUrl.replace(/\/$/, "")}/.well-known/jwks`;

    this.jwksClientInstance = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 15000,
    });

    this.logger.log(`Initialized QuickBite JWKS client for URI: ${jwksUri}`);
  }

  /**
   * Check if a JWT token has QuickBite SSO characteristics
   */
  isQuickBiteToken(token: string): boolean {
    try {
      const decoded: any = jwt.decode(token, { complete: true });
      if (!decoded) return false;

      const header = decoded.header;
      const payload = decoded.payload;

      // RS256 algorithm with kid, or issuer pointing to QuickBite Identity
      if (header?.alg === "RS256" && header?.kid) {
        return true;
      }

      if (
        payload?.iss &&
        (payload.iss.includes("quick-bite") ||
          payload.iss === this.identityUrl.replace(/\/$/, ""))
      ) {
        return true;
      }

      if (payload?.client_id === "QuickBite_Portal") {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Verify QuickBite SSO JWT token using JWKS public keys
   */
  async verifyQuickBiteToken(token: string): Promise<any> {
    const decoded: any = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header?.kid) {
      throw new Error("Invalid token header or missing kid");
    }

    const kid = decoded.header.kid;
    const key = await this.jwksClientInstance.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    return jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });
  }

  /**
   * Normalize and map QuickBite SSO roles to ShorterLink AccountRole enum
   */
  mapQuickBiteRole(rawRoles: string | string[] | undefined): AccountRole {
    if (!rawRoles) {
      return AccountRole.USER;
    }

    const rolesList = Array.isArray(rawRoles)
      ? rawRoles
      : String(rawRoles).split(",");

    const normalized = rolesList
      .map((r) => String(r).toLowerCase().trim())
      .filter(Boolean);

    // Admin Group Check
    const adminRoles = [
      "admin",
      "administrator",
      "superadmin",
      "system_admin",
      "quickbite-admin",
    ];
    if (adminRoles.some((target) => normalized.includes(target))) {
      return AccountRole.ADMIN;
    }

    // Manager / Sub-Admin Group Check
    const managerRoles = [
      "manager",
      "quickbite-manager",
      "sub-admin",
      "subadmin",
      "sub_admin",
      "quickbite-sub-admin",
    ];
    if (managerRoles.some((target) => normalized.includes(target))) {
      return AccountRole.MANAGER;
    }

    // Default to USER
    return AccountRole.USER;
  }

  /**
   * Extract standardized user payload from QuickBite JWT claims
   */
  extractUserFromClaims(payload: any): SsoUserPayload {
    const rawRoles: string[] = [];

    // Extract roles from various possible standard OIDC/Microsoft claim names
    const roleClaim =
      payload.role ||
      payload.roles ||
      payload[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ];

    if (Array.isArray(roleClaim)) {
      rawRoles.push(...roleClaim.map((r) => String(r).toLowerCase().trim()));
    } else if (typeof roleClaim === "string") {
      rawRoles.push(
        ...roleClaim
          .split(",")
          .map((r) => r.toLowerCase().trim())
          .filter(Boolean),
      );
    }

    const role = this.mapQuickBiteRole(rawRoles);

    // Extract username
    const username =
      payload.preferred_username ||
      payload.unique_name ||
      payload.username ||
      payload.email ||
      payload.sub;

    // Extract fullname
    let fullname = payload.name;
    if (!fullname && (payload.given_name || payload.family_name)) {
      fullname = [payload.given_name, payload.family_name]
        .filter(Boolean)
        .join(" ");
    }
    if (!fullname) {
      fullname = username;
    }

    return {
      sub: payload.sub,
      username: String(username).toLowerCase(),
      fullname: String(fullname),
      email: payload.email || undefined,
      role,
      rawRoles,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions
        : [],
      isSso: true,
    };
  }
}
