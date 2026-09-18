import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  gradient?: string;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({ title, value, trend, trendUp, icon: Icon, gradient, iconBg = "orange-icon-bg", iconColor = "text-primary" }: StatCardProps) {
  if (gradient) {
    return (
      <div className="glass-card overflow-hidden hover-lift">
        <div className={`${gradient} p-5 text-white relative`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">{title}</p>
              <p className="text-3xl font-bold mt-1.5 font-mono-stats tracking-tight">{value}</p>
              {trend && (
                <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                  {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend} from last month
                </div>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card stat-card-border p-6 hover-lift animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono-stats">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
