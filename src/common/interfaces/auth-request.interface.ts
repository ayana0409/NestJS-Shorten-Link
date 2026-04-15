import { Request } from "express";
import { AccountRole } from "../../account/account-role.enum";

interface UserPayload {
  _id: string;
  username: string;
  role: AccountRole;
  sub: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}
