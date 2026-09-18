import { UserPlus, CreditCard, Bell } from "lucide-react";

interface ActivityItem {
  type: "fee" | "student" | "notice";
  text: string;
  time: string;
}

interface Props {
  items: ActivityItem[];
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const typeConfig = {
  fee:     { Icon: CreditCard, color: "text-success",  bg: "bg-[#D1FAE5]" },
  student: { Icon: UserPlus,   color: "text-primary",  bg: "orange-icon-bg" },
  notice:  { Icon: Bell,       color: "text-warning",  bg: "bg-[#FEF3C7]" },
};

export function RecentActivity({ items }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-4 font-heading">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => {
            const { Icon, color, bg } = typeConfig[item.type] ?? typeConfig.notice;
            return (
              <div key={i} className="flex items-start gap-3 group">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(item.time)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
