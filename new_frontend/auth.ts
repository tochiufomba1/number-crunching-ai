import NextAuth, { User } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { LoginSchema } from "@/schemas"
import { JWT } from "next-auth/jwt"
import { ExtendedUser } from "./next-auth"

const getUser = async(email: string, password: string) => {
    const response = await fetch(`${process.env.EXTERNAL_API}/api/auth/tokens`, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: {
                name: null,
                email: email,
                password: password
            },
            provider: "local"
        })
    });

    if (!response.ok) {
        return null;
    }

    const user = await response.json()
    return user
}
 
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
        async authorize(credentials){
            const validatedFields = LoginSchema.safeParse(credentials)

            if (validatedFields.success){
                const {email, password} = validatedFields.data;

                const user = await getUser(email, password) // replace with fetch to api

                return user
            }

            return null;
        }
  })],
  session: {strategy: "jwt"},
  callbacks: {
    async signIn({user, profile}){
        if (profile){
            // fetch profile details to external API
        }
        return true
    },
    async jwt({token, user}: {token: JWT, user: ExtendedUser}){
        if (!token.sub) return token;

        if(user){
            token.access_token = user.access_token
            token.access_exp = user.access_exp
        }

        return token
    },
    async session({token, session}){
        if (token.sub && session.user){
            session.user.id = token.sub
        }

        if(token.access_token && session.user){
            session.user.access_token = token.access_token as string
        }

        if(token.access_exp && session.user){
            session.user.access_exp = token.access_exp as number
        }
        return session
    }
  }
})
// import NextAuth from "next-auth"
 
// export const { handlers, signIn, signOut, auth } = NextAuth({
//   providers: [],
// })