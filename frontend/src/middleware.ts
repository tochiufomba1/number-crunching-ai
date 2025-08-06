import { auth } from "@/../auth"; 

export default auth((req) => {
  if ((!req.auth || req.auth.user?.tokenExpired) && (req.nextUrl.pathname !== "/login" && req.nextUrl.pathname !== '/register')) {
    const newUrl = new URL("/login", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }
})
 
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
