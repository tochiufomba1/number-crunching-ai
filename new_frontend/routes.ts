/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
*/

export const publicRoutes = [
    "/"
]

/**
 * An array of routes that are used for authentication
 * These routes require authentication
 * @type {string[]}
*/
export const authRoutes = [
    "/auth/login",
    "/auth/register",
]

/**
 * The prefix for API authentication routes
 * @type {string}
*/
export const apiAuthPrefix = "/api/auth";

/**
 * Default route after logging in
 * @type {string}
*/
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";