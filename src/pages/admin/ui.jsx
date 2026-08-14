// Sdílené UI prvky administrace — jednotný vzhled formulářů (inspektor vlastností).

export function Card({ title, subtitle, children, actions = null }) {
  return (
    <div className="rounded-xl border border-white/10 mb-4" style={{ background: '#141b28' }}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div>
            <div className="text-sm font-bold">{title}</div>
            {subtitle && <div className="text-[11px] text-white/40">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className="text-xs font-bold text-white/80">{label}</div>
        {hint && <div className="text-[10px] text-white/35">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function NumberField({ value, onChange, min, max, step = 1, width = 'w-24' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`${width} px-2 py-1.5 rounded-lg text-xs text-right text-white border border-white/15 outline-none focus:border-emerald-400`}
      style={{ background: '#0d1117' }}
    />
  );
}

export function TextField({ value, onChange, placeholder = '', width = 'w-44' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} px-2 py-1.5 rounded-lg text-xs text-white border border-white/15 outline-none focus:border-emerald-400`}
      style={{ background: '#0d1117' }}
    />
  );
}

export function ColorField({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#888888'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-white/15"
        style={{ background: '#0d1117' }}
      />
      <span className="text-[10px] text-white/40 font-mono">{value}</span>
    </div>
  );
}

export function SelectField({ value, onChange, options, width = 'w-44' }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} px-2 py-1.5 rounded-lg text-xs text-white border border-white/15 outline-none focus:border-emerald-400`}
      style={{ background: '#0d1117' }}
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all"
      style={{ background: value ? '#10b981' : 'rgba(255,255,255,0.15)' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? '24px' : '2px' }}
      />
    </button>
  );
}

export function AdminButton({ onClick, children, tone = 'default' }) {
  const bg =
    tone === 'primary' ? '#10b981' : tone === 'danger' ? '#dc2626' : 'rgba(255,255,255,0.08)';
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 hover:opacity-85"
      style={{ background: bg }}
    >
      {children}
    </button>
  );
}
