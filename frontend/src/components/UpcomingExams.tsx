import { FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExamItem {
  title: string;
  date: string;
}

interface Props {
  exams: ExamItem[];
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function fmtDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

export function UpcomingExams({ exams }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-4 font-heading">Upcoming Exams</h3>
      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No upcoming exams.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((exam, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#FFF5EE] hover:bg-[#FFF0E6] transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg orange-icon-bg text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{exam.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(exam.date)}
                  </div>
                </div>
              </div>
              <Badge className="text-xs font-medium bg-[#FFD4B3] text-[#FF6B2B] border-0">{daysUntil(exam.date)}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
