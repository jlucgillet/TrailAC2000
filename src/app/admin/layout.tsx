import { getAdminSession } from "@/lib/session";
import { AdminHeader } from "./AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen overflow-x-hidden">
      {session && <AdminHeader email={session.email} />}
      <main className="mx-auto max-w-6xl overflow-x-hidden px-4 py-8">{children}</main>
    </div>
  );
}
