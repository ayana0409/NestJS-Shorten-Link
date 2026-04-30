import { AccountRole } from "../account-role.enum";

export class ResponseAccountDto {
  username!: string;
  fullname!: string;
  role!: AccountRole;
  isActive!: boolean;
  level?: any; // Will be populated
  levelExpirationDate?: Date | null;
}
