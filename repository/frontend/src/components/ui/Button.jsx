const VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 px-4 py-2 rounded-md text-sm font-medium transition-colors',
  secondary:
    'border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white',
  danger: 'text-red-600 hover:text-red-700 text-sm font-medium',
  link: 'text-indigo-600 hover:text-indigo-700 text-sm font-medium underline underline-offset-2',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
