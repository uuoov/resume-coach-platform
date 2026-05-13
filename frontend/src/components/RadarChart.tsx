import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarChartProps {
  data: Array<{ name: string; value: number }>;
}

export default function RadarChart({ data }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="得分"
          dataKey="value"
          stroke="#4f46e5"
          strokeWidth={2}
          fill="url(#radarGradient)"
          fillOpacity={1}
          animationBegin={200}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
