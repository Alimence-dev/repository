const TONES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
};

export default function Badge({ tone = 'gray', children }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONES[tone] || TONES.gray}`}
    >
      {children}
    </span>
  );
}

export const STAGE_TONE = { proposal: 'gray', in_progress: 'blue', defense: 'purple', completed: 'green' };
export const MILESTONE_TONE = { pending: 'gray', submitted: 'blue', approved: 'green', late: 'red' };
export const TOPIC_TONE = { pending: 'amber', approved: 'green', duplicate: 'red', rejected: 'red' };
export const DEFENSE_TONE = { scheduled: 'blue', completed: 'green' };
export const RISK_TONE = { low: 'green', medium: 'amber', high: 'red' };

export function StageBadge({ stage }) {
  return <Badge tone={STAGE_TONE[stage]}>{stage?.replace('_', ' ')}</Badge>;
}
