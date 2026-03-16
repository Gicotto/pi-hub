import { CATEGORIES } from '../utils/icons'

export default function CategoryFilter({ active, counts, onChange, layout = 'sidebar' }) {
  if (layout === 'pills') {
    // Horizontal scrollable pills (mobile)
    return (
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0 scrollbar-none">
        {CATEGORIES.map(({ key, label, Icon }) => {
          const count = key === 'all' ? counts.all : (counts[key] ?? 0)
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <Icon size={11} />
              <span>{label}</span>
              {count > 0 && (
                <span className={`ml-0.5 ${isActive ? 'text-cyan-200' : 'text-slate-500'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Vertical sidebar (desktop)
  return (
    <aside className="w-48 shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto">
      <div className="px-3 pt-3 pb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</p>
      </div>
      <nav className="px-2 pb-3 space-y-0.5">
        {CATEGORIES.map(({ key, label, Icon }) => {
          const count = key === 'all' ? counts.all : (counts[key] ?? 0)
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={14} />
                <span>{label}</span>
              </span>
              {count > 0 && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-cyan-500' : 'text-slate-600'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

