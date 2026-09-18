import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface FeeMonth {
  month: string;
  collected: number;
  pending: number;
}

interface Props {
  data: FeeMonth[];
}

export function FeeChart({ data }: Props) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-4 font-heading">Fee Collection</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#FFE8D6" />
          <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
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
            formatter={(v: number) => [`₹${v.toLocaleString()}`, undefined]}
          />
          <Bar dataKey="collected" fill="#FF9A5A" radius={[6, 6, 0, 0]} name="Collected" />
          <Bar dataKey="pending"   fill="#33C6E7" radius={[6, 6, 0, 0]} name="Pending" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
