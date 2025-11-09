import { auth } from "@/../auth"
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes
} from "@/../routes"

export const middleware = auth((req) => {
  const currentUnixTimestampSeconds: number = Math.floor( Date.now() / 1000);

  const { nextUrl } = req;
  const isLoggedIn = !!req.auth && req.auth.user?.access_exp > currentUnixTimestampSeconds;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  console.log(`Current Time: ${currentUnixTimestampSeconds} | Expiration: ${req.auth?.user?.access_exp}`)

  if (isApiAuthRoute){
    return null;
  }

  if (isAuthRoute){
    if (isLoggedIn){
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    }

    return null;
  }

  if (!isLoggedIn && !isPublicRoute){
    return Response.redirect(new URL("/auth/login", nextUrl));
  }

  return null;
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}