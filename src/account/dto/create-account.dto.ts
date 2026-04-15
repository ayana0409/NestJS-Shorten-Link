import { AccountRole } from "../account-role.enum";

export class CreateAccountDto {
  username!: string;
  password!: string;
  fullname!: string;
  role?: AccountRole;
  isActive?: boolean;
}
