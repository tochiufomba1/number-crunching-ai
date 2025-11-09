import NextAuth, { type DefaultSession } from "next-auth";

export type ExtendedUser = DefaultSession["user"] & {
    access_token: string;
    access_exp: number;

}

declare module "next-auth" {
    interface Session {
        user: ExtendedUser
    }

    interface User {
        access_token: string
        access_exp: number
    }
}

import { JWT } from "next-auth/jwt"
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    access_token?: string
    access_exp?: number
  }
}