import { defineMiddleware } from "astro:middleware";
import { getAdminFromCookies } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo proteger rutas /admin (excepto /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const admin = await getAdminFromCookies(context.cookies);
    if (!admin) return context.redirect("/admin/login");
  }

  return next();
});