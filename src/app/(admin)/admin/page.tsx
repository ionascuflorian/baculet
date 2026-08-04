import Link from "next/link";
import {
  BookOpen,
  ListChecks,
  FolderOpen,
  Users,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

const quickLinks = [
  { href: "/admin/materii", label: "Gestionează materii", icon: BookOpen },
  { href: "/admin/teste", label: "Gestionează teste", icon: ListChecks },
  { href: "/admin/subiecte", label: "Adaugă subiecte BAC", icon: GraduationCap },
  { href: "/admin/utilizatori", label: "Vezi utilizatorii", icon: Users },
];

export default async function AdminOverviewPage() {
  const [subjectCount, chapterCount, lessonCount, quizCount, userCount, attemptCount] =
    await Promise.all([
      prisma.subject.count(),
      prisma.chapter.count(),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.user.count(),
      prisma.quizAttempt.count(),
    ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const stats = [
    { label: "Materii", value: subjectCount, icon: BookOpen, color: "bg-accent/10 text-accent" },
    { label: "Capitole", value: chapterCount, icon: FolderOpen, color: "bg-accent/10 text-accent" },
    { label: "Lecții", value: lessonCount, icon: BookOpen, color: "bg-warning/15 text-warning" },
    { label: "Utilizatori", value: userCount, icon: Users, color: "bg-danger/10 text-danger" },
    { label: "Rezolvări teste", value: attemptCount, icon: ListChecks, color: "bg-feather/60 text-ink" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Panou admin</h1>
        <p className="mt-1 text-subtle">
          Gestionează tot conținutul platformei dintr-un singur loc.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-ink">{s.value}</p>
                <p className="text-xs font-semibold text-subtle">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="mb-2 text-lg font-bold text-ink">Acțiuni rapide</p>
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex items-center justify-between rounded-2xl border-2 border-feather p-3 transition-colors hover:bg-feather/40"
              >
                <span className="flex items-center gap-3 font-bold text-ink">
                  <q.icon className="h-5 w-5 text-subtle" />
                  {q.label}
                </span>
                <ArrowRight className="h-5 w-5 text-subtle" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-lg font-bold text-ink">Utilizatori noi</p>
            {recentUsers.length === 0 && (
              <p className="text-sm text-subtle">Niciun utilizator încă.</p>
            )}
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-feather p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{u.name}</p>
                    <p className="truncate text-xs text-subtle">{u.email}</p>
                  </div>
                  <span className="ml-2 shrink-0 text-xs text-subtle">
                    {new Date(u.createdAt).toLocaleDateString("ro-RO")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
