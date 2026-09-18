import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PendingStudent {
  name:    string;
  class:   string;
  amount:  number;
  paid:    number;
  photo:   string;
  title:   string;
  dueDate: string | null;
  status:  string;
}

interface Props {
  pending: PendingStudent[];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  overdue: "bg-[#FEE2E2] text-[#DC2626]",
  partial: "bg-[#FEF3C7] text-[#D97706]",
  pending: "bg-[#FFD4B3] text-[#FF6B2B]",
};

export function PendingFees({ pending }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground font-heading">Pending Fees</h3>
        <Badge className="text-xs bg-[#FEE2E2] text-[#DC2626] border-0">{pending.length} pending</Badge>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No pending fees.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((s, i) => {
            const due = s.amount - s.paid;
            return (
              <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FFF5EE] transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-[#FFE8D6]">
                    <AvatarImage src={s.photo} alt={s.name} />
                    <AvatarFallback className="orange-icon-bg text-primary text-xs">{initials(s.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.class} · {s.title}{s.dueDate ? ` · ${fmtDate(s.dueDate)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] border-0 ${statusColors[s.status] ?? statusColors.pending}`}>
                    {s.status}
                  </Badge>
                  <span className="text-sm font-semibold text-destructive font-mono-stats">
                    ₹{due.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
