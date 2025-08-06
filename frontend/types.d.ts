import NextAuth, { type DefaultSession } from "next-auth";
import {JWT} from "next-auth/jwt";


declare module 'next-auth' {
    interface Session {
        //accessToken?: string & AdapterSession & Session
        // user: User & {
        //     token?: string;
        // };
        user: {
            /** The user's postal address. */
            token?: string;
            tokenExpired: boolean;
        } & DefaultSession['user'];
    }

    interface User {
        id?: string | null;
        name?: string;
        token?: string;
        exp?: number;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        name?: string;
        email?: string;
        accessToken?: string;
        externalExp?: number;
        //   user: {
        //     /** The user's postal address. */
        //     token?: string
        // } & DefaultUser;
        //   user?: {
        //     id: string;
        //     token?: string;
        //     name?: string;
        //     email?: string;
        //   } | null;
    }
}