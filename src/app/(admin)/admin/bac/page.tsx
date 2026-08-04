import { CalendarDays } from "lucide-react";
import { getBacSchedule } from "@/lib/site-settings";
import { BacScheduleForm } from "@/components/admin/bac-schedule-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminBacPage() {
  const schedule = await getBacSchedule();

  const fmt = (date: string) =>
    date
      ? new Date(`${date}T00:00:00`).toLocaleDateString("ro-RO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "neselectată";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold text-ink">
          <CalendarDays className="h-7 w-7 text-accent" /> Data BAC
        </h1>
        <p className="mt-1 text-subtle">
          Setează datele examenului de Bacalaureat. Sunt folosite la
          numărătoarea inversă de pe dashboard și la programarea din calendar.
        </p>
      </section>

      <Card>
        <CardContent className="space-y-4 p-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-subtle">
                Început BAC
              </dt>
              <dd className="font-bold text-ink">{fmt(schedule.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-subtle">
                Sfârșit BAC
              </dt>
              <dd className="font-bold text-ink">{fmt(schedule.endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-subtle">
                Urm. sesiune
              </dt>
              <dd className="font-bold text-ink">
                {fmt(schedule.nextSessionStartDate)}
              </dd>
            </div>
          </dl>

          {schedule.events.length > 0 && (
            <div className="rounded-xl border border-feather bg-background px-4 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">
                Probele ({schedule.events.length})
              </p>
              <ul className="space-y-1">
                {schedule.events.map((ev, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-ink">{fmt(ev.date)}</span>
                    <span className="text-subtle">· {ev.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <BacScheduleForm
            initial={{
              year: schedule.year,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              nextSessionStartDate: schedule.nextSessionStartDate,
              events: schedule.events,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}