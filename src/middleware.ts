import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";

import { routing, type Locale } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const SECRET = process.env.NEXTAUTH_SECRET;
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detectar locale del path
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isLocalePath = (routing.locales as readonly string[]).includes(firstSegment ?? "");
  const locale: Locale = isLocalePath ? (firstSegment as Locale) : routing.defaultLocale;

  // Ejecutar middleware de i18n primero
  const response = intlMiddleware(request);

  // Solo proteger rutas /admin
  const isAdminPath = pathname.includes("/admin");
  const isLoginPath = pathname.endsWith("/admin/login") || pathname.endsWith("/admin/login/");

  if (!isAdminPath) return response;

  // Verificar sesión
  const token = await getToken({
    req: request,
    secret: SECRET,
    cookieName: COOKIE_NAME,
  });

  // Si NO hay sesión y trata de entrar a admin → redirigir a login
  if (!token && !isLoginPath) {
    const loginUrl = new URL(`/${locale}/admin/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si HAY sesión y está en login → redirigir a admin
  if (token && isLoginPath) {
    return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};