const VARIANTS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-slate-50 border-slate-200 text-slate-600',
};

// One consistent shape for every inline success/error confirmation in the app,
// so a state-changing action (archive, allocate, schedule, etc.) always reports
// back the same way instead of each page inventing its own message style.
export default function Alert({ variant = 'info', children, className = '' }) {
  return (
    <p className={`text-sm border rounded-md px-3 py-2 ${VARIANTS[variant]} ${className}`}>{children}</p>
  );
}
