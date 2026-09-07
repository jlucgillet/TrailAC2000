import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Le middleware s'exécute dans le runtime Edge : on vérifie donc juste
// la validité du JWT ici (sans accès Prisma), l'autorisation fine reste
// vérifiée dans chaque route/page via getAdminSession().
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin") && path !== "/admin/login") {
    const token = request.cookies.get("trail_admin_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (path.startsWith("/mon-espace") && path !== "/mon-espace/login") {
    const token = request.cookies.get("trail_athlete_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/mon-espace/login", request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/mon-espace/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/mon-espace/:path*"],
};
