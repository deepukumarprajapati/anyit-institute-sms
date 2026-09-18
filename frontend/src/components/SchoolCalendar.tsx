import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

interface CalEvent {
  title: string;
  startDate: string;
  eventType: string;
}

interface Props {
  events: CalEvent[];
}

const typeMap: Record<string, "event" | "holiday" | "exam"> = {
  holiday: "holiday",
  exam:    "exam",
};

const typeStyles: Record<string, string> = {
  event:   "bg-primary/10 text-primary border-primary/20",
  holiday: "bg-destructive/10 text-destructive border-destructive/20",
  exam:    "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
};

export function SchoolCalendar({ events }: Props) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const parsed = events.map(e => ({
    ...e,
    date: new Date(e.startDate),
    type: typeMap[e.eventType] ?? "event",
  }));

  const eventDates = parsed.map(e => e.date);

  const selectedDateEvents = parsed.filter(
    e => selected && e.date.toDateString() === selected.toDateString()
  );

  const upcomingEvents = parsed
    .filter(e => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 font-heading">
          <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          School Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          className="rounded-lg border border-border p-3 pointer-events-auto"
          modifiers={{ event: eventDates }}
          modifiersClassNames={{ event: "bg-primary/15 text-primary font-semibold rounded-full" }}
        />

        {selectedDateEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selected?.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
            {selectedDateEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                <Badge variant="outline" className={`text-[10px] ${typeStyles[e.type]}`}>
                  {e.type}
                </Badge>
                <span className="text-sm text-foreground">{e.title}</span>
              </div>
            ))}
          </div>
        )}

        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
            {upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${e.type === "holiday" ? "bg-destructive" : e.type === "exam" ? "bg-[hsl(var(--warning))]" : "bg-primary"}`} />
                  <span className="text-sm text-foreground">{e.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {e.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
