import { RefreshCw, Trash2, Wifi } from 'lucide-react'

export default function Header({ networkInfo, scanStatus, onScan, onClear }) {
  const isRunning = scanStatus.status === 'running'

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-0">
        <Wifi size={18} className="text-cyan-400 shrink-0" />
        <span className="text-slate-100 font-semibold text-sm tracking-wide whitespace-nowrap">
          Pi-Hub
        </span>
      </div>

      {/* Network info – hidden on tiny screens */}
      {networkInfo?.subnet && (
        <span className="hidden sm:inline text-slate-500 text-xs font-mono truncate">
          {networkInfo.subnet}
        </span>
      )}

      {/* Scan progress */}
      {isRunning && (
        <div className="flex items-center gap-2 ml-1 min-w-0">
          <div className="hidden xs:flex h-1 w-20 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${scanStatus.progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {scanStatus.found} found
          </span>
        </div>
      )}

      {/* Status badge */}
      {!isRunning && scanStatus.status === 'complete' && (
        <span className="hidden sm:inline text-xs text-green-400 whitespace-nowrap">
          ✓ Scan complete
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onClear}
          title="Clear devices"
          disabled={isRunning}
          className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <Trash2 size={15} />
        </button>

        <button
          onClick={onScan}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={isRunning ? 'animate-spin' : ''} />
          <span>{isRunning ? 'Scanning…' : 'Scan'}</span>
        </button>
      </div>
    </header>
  )
}

