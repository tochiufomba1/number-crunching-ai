import NextAuth, { Session, User } from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { JWT } from 'next-auth/jwt';

async function getUser(email: string, password: string): Promise<User | null> {
    const encodedCredentials = Buffer.from(`${email}:${password}`).toString('base64');

    const actionRequest = new Request(`${process.env.EXTERNAL_API_BASE_URL}/api/tokens`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            Authorization: `Basic ${encodedCredentials}`,
        },
    });

    try {
        const response = await fetch(actionRequest);
        if (!response.ok) return null

        const user = await response.json();
        return user;
    } catch (error) {
        return null
    }
}

async function refreshAccessToken(token: JWT) {
    try {
        // Example: make a request to the external API to refresh the token.
        const response = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refreshToken: token.refreshToken,
            }),
        });
        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.accessToken,
            // Set a new expiration time (in milliseconds).
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refreshToken ?? token.refreshToken, // Fall back to old refresh token if not provided.
        };
    } catch (error) {
        console.error("Error refreshing access token", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email, password);
                    if (!user)
                        return null;
                    
                    return {
                        id: user.id,
                        name: user.name,
                        token: user.token,
                        exp: user.exp,
                    };
                }

                return null;
            },
        }),
    ],
    // events: {
    //     async signOut(token: JWT) { //REVIEW
    //         try {
    //             await fetch('/api/tokens', {
    //                 method: "POST",
    //                 headers: {
    //                     "Authorization": `Bearer ${token.accessToken}`,
    //                 },
    //             });
    //             await signOut()
    //         } catch (error) {
    //             console.error("Error notifying Flask API:", error);
    //         }
    //     },
    // },
    session: {
        strategy: "jwt"
    },
    callbacks: {
        jwt({ token, user }: { token: JWT, user?: User }) {
            if (user) {
                token.accessToken = user.token;
                token.id = user.id as string;
                token.name = user.name;
                token.externalExp = user.exp;
            }

            return token;
        },
        session({ session, token }: { session: Session, token: JWT }) {
            const now = Math.floor(Date.now() / 1000);
            const isExpired = typeof token.externalExp === 'number' && now >= token.externalExp;
            
            if (isExpired) {
                session.user = { tokenExpired: true };
              //session.user.tokenExpired = true;
            } else {
              session.user.tokenExpired = false;
              session.user.id = token.id as string ?? '';
              session.user.name = token.name as string ?? '';
              session.user.token = token.accessToken as string ?? '';
              session.user.exp = token.externalExp as number;
            }
          
            return session;
        },
    },
});