import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromoteAdmin } from "@/components/admin/promote-admin";
import { DeleteUser } from "@/components/admin/delete-user";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      streakCount: true,
      _count: { select: { lessonProgress: true, quizAttempts: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Utilizatori</h1>
        <p className="mt-1 text-subtle">Toți conturile înregistrate pe platformă.</p>
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
                    <Badge className="bg-accent/10 text-accent">Admin</Badge>
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
                  {u.role !== "ADMIN" && <PromoteAdmin userId={u.id} />}
                  <div className="mt-2">
                    <DeleteUser userId={u.id} name={u.name} email={u.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-subtle">
            Niciun utilizator încă.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
