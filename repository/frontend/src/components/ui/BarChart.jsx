// Simple horizontal bar chart built from plain divs (no charting library needed for
// a handful of magnitude-comparison bars). Mark spec: thin bar, rounded at the data
// end, square at the baseline, direct value label at the tip.
export default function BarChart({ data, colorClass = 'bg-indigo-500', barColors }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const color = barColors?.[i] || colorClass;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-36 shrink-0 truncate capitalize" title={d.label}>
              {d.label.replace('_', ' ')}
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-3">
              <div className={`h-3 rounded-r-full ${d.count > 0 ? color : ''}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium text-slate-900 w-6 text-right shrink-0">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}
