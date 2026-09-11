import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PromoteAdmin } from "@/components/admin/promote-admin";
import { DemoteAdmin } from "@/components/admin/demote-admin";
import { AdminPermissionEditor } from "@/components/admin/admin-permission-editor";
import { DeleteUser } from "@/components/admin/delete-user";
import { requirePage, requireAdmin } from "@/lib/access";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePage("MANAGE_USERS");
  const { page: pageParam } = await searchParams;
  const sessionUser = await requireAdmin();
  const canManageAdmins = sessionUser.isOwner;
  const total = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const requested = Number(pageParam) || 1;
  const current = Math.min(Math.max(1, requested), totalPages);
  const skip = (current - 1) * PAGE_SIZE;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isOwner: true,
      permissions: true,
      createdAt: true,
      streakCount: true,
      _count: { select: { lessonProgress: true, quizAttempts: true } },
    },
  });

  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(total, skip + users.length);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Utilizatori</h1>
        <p className="mt-1 text-subtle">
          Toți conturile înregistrate pe platformă ({total}).
        </p>
      </section>

      <div className="overflow-x-auto rounded-2xl border-2 border-feather bg-card">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-feather text-xs uppercase tracking-wider text-subtle">
              <th className="px-4 py-3 font-bold">Nume</th>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Rol</th>
              <th className="px-4 py-3 font-bold">Activitate</th>
              <th className="px-4 py-3 font-bold">Înregistrat</th>
              <th className="px-4 py-3 font-bold">Acțiune</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-feather/60 last:border-0">
                <td className="px-4 py-3 font-bold text-ink">{u.name}</td>
                <td className="px-4 py-3 text-subtle">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <Badge className="bg-accent/10 text-accent">
                      {u.isOwner ? "Owner" : "Admin"}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">User</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-subtle">
                  {u._count.lessonProgress} lecții · {u._count.quizAttempts} teste · streak {u.streakCount}
                </td>
                <td className="px-4 py-3 text-subtle">
                  {new Date(u.createdAt).toLocaleDateString("ro-RO")}
                </td>
                <td className="px-4 py-3">
                  {canManageAdmins && u.role !== "ADMIN" && (
                    <div className="mb-2">
                      <PromoteAdmin userId={u.id} />
                    </div>
                  )}
                  {u.role === "ADMIN" && canManageAdmins && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      <AdminPermissionEditor
                        userId={u.id}
                        userName={u.name}
                        currentPermissions={u.permissions}
                        isOwner={u.isOwner}
                      />
                      {!u.isOwner && u.id !== sessionUser.id && (
                        <DemoteAdmin userId={u.id} />
                      )}
                    </div>
                  )}
                  {(!canManageAdmins || u.role !== "ADMIN") && (
                    <div className="mt-2">
                      <DeleteUser userId={u.id} name={u.name} email={u.email} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-subtle">
            Niciun utilizator încă.
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-subtle">
            {from}–{to} din {total}
          </p>
          <div className="flex items-center gap-2">
            {current > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/utilizatori?page=${current - 1}`}>
                  <ChevronLeft className="h-4 w-4" /> Înapoi
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" /> Înapoi
              </Button>
            )}
            <span className="text-sm font-bold text-ink">
              Pagina {current} din {totalPages}
            </span>
            {current < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/utilizatori?page=${current + 1}`}>
                  Înainte <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Înainte <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
