import { Card } from './Card';

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function BarChart({ data, color = 'bg-primary-500', height = 200 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full flex-1 flex items-end">
            <div
              className={`w-full rounded-t-md ${color} transition-all duration-500 group-hover:opacity-80 relative`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {d.value}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ segments, size = 160 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="14" className="stroke-gray-100 dark:stroke-gray-800" />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * circumference;
            const dash = `${len} ${circumference - len}`;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth="14"
                stroke={seg.color}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-gray-600 dark:text-gray-300">{seg.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function LineChart({ data, height = 200, color = '#3b82f6' }: LineChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - 20 - ((d.value - min) / range) * (height - 40);
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height - 20} L 0,${height - 20} Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * width;
          const y = height - 20 - ((d.value - min) / range) * (height - 40);
          return <circle key={i} cx={x} cy={y} r="1.5" fill={color} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-gray-500 dark:text-gray-400">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  label?: string;
  color?: string;
}

export function ProgressRing({ value, max, size = 120, label, color = '#3b82f6' }: ProgressRingProps) {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="8" className="stroke-gray-100 dark:stroke-gray-800" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="8" stroke={color} strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(pct)}%</span>
        {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
      </div>
    </div>
  );
}
