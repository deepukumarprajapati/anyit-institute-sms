import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ClassPerf {
  name: string;
  avg: number;
}

interface Props {
  data: ClassPerf[];
}

const COLORS = ["#FF9A5A", "#33C6E7", "#4A7DFF", "#A78BFA", "#34D399"];

export function PerformanceChart({ data }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-4 font-heading">Class Performance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8D6" />
          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #FFE8D6",
              borderRadius: "12px",
              color: "#1A1A2E",
              fontSize: "13px",
              boxShadow: "0 4px 24px rgba(255,107,43,0.1)",
            }}
            formatter={(v: number) => [`${v}%`, "Avg Score"]}
          />
          <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
