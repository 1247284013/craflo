import type { SkillDimension } from '../../types';

interface RadarChartProps {
  dimensions: SkillDimension[];
  size?: number;
}

export function RadarChart({ dimensions, size = 260 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const maxLevel = 5;
  const n = dimensions.length;

  const getPoint = (index: number, level: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (level / maxLevel) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = radius + 28;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const currentPoints = dimensions.map((d, i) => getPoint(i, d.currentLevel));
  const targetPoints = dimensions.map((d, i) => getPoint(i, d.targetLevel));
  const gridLevels = [1, 2, 3, 4, 5];

  const toPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid circles */}
      {gridLevels.map((level) => {
        const pts = dimensions.map((_, i) => getPoint(i, level));
        return (
          <polygon
            key={level}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        );
      })}

      {/* Grid lines from center */}
      {dimensions.map((_, i) => {
        const outer = getPoint(i, maxLevel);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        );
      })}

      {/* Target area */}
      <path
        d={toPath(targetPoints)}
        fill="rgba(99,102,241,0.1)"
        stroke="rgba(99,102,241,0.4)"
        strokeWidth="1.5"
        strokeDasharray="4,3"
      />

      {/* Current area */}
      <path
        d={toPath(currentPoints)}
        fill="rgba(16,185,129,0.2)"
        stroke="rgb(16,185,129)"
        strokeWidth="2"
      />

      {/* Current level dots */}
      {currentPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="rgb(16,185,129)" stroke="white" strokeWidth="1.5" />
      ))}

      {/* Labels */}
      {dimensions.map((dim, i) => {
        const lp = getLabelPoint(i);
        const shortName = dim.name.length > 5 ? dim.name.slice(0, 5) + '..' : dim.name;
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600"
            fontSize="11"
          >
            {shortName}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${size - 90}, ${size - 40})`}>
        <line x1="0" y1="6" x2="16" y2="6" stroke="rgb(16,185,129)" strokeWidth="2" />
        <circle cx="8" cy="6" r="3" fill="rgb(16,185,129)" />
        <text x="20" y="10" fontSize="10" fill="#6B7280">当前</text>
        <line x1="0" y1="22" x2="16" y2="22" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="20" y="26" fontSize="10" fill="#6B7280">目标</text>
      </g>
    </svg>
  );
}
