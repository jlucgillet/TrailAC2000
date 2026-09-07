import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Le middleware s'exécute dans le runtime Edge : on vérifie donc juste
// la validité du JWT ici (sans accès Prisma), l'autorisation fine reste
// vérifiée dans chaque route/page via getAdminSession().
export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

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

export const config = {
  matcher: ["/admin/:path*"],
};
