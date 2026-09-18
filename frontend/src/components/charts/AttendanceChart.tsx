import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AttendanceDay {
  day: string;
  present: number;
  absent: number;
}

interface Props {
  data: AttendanceDay[];
}

export function AttendanceChart({ data }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-4 font-heading">Attendance Overview</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF9A5A" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FF9A5A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8D6" />
          <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #FFE8D6",
              borderRadius: "12px",
              color: "#1A1A2E",
              fontSize: "13px",
              boxShadow: "0 4px 24px rgba(255,107,43,0.1)",
            }}
          />
          <Area type="monotone" dataKey="present" stroke="#FF9A5A" fill="url(#attendGrad)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
