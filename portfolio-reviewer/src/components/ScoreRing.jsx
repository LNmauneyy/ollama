export default function ScoreRing({ score, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const getScoreColor = (s) => {
    if (s >= 90) return '#10b981';
    if (s >= 80) return '#3b82f6';
    if (s >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return 'ยอดเยี่ยม';
    if (s >= 80) return 'ดีมาก';
    if (s >= 70) return 'ดี';
    return 'ปรับปรุง';
  };

  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute rounded-full blur-xl opacity-20"
        style={{
          width: size + 20,
          height: size + 20,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Score circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-gray-900" style={{ fontSize: size * 0.28 }}>
          {score}
        </span>
        <span className="text-gray-400 mt-0.5" style={{ fontSize: size * 0.11 }}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}