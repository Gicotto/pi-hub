import { X } from 'lucide-react'
import { getCategoryInfo } from '../utils/icons'

function Row({ label, value }) {
  if (!value || value === 'Unknown' || value === '') return null
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-200 break-all font-mono">{value}</span>
    </div>
  )
}

function PortRow({ port }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs font-mono text-cyan-400 w-16 shrink-0">{port.port}/{port.protocol}</span>
      <span className="text-xs text-slate-300 truncate">{port.service || '—'}</span>
      {port.product && (
        <span className="text-xs text-slate-500 truncate hidden sm:inline">{port.product} {port.version}</span>
      )}
    </div>
  )
}

export default function DeviceDrawer({ device, onClose }) {
  if (!device) return null

  const { Icon, label } = getCategoryInfo(device.category)
  const isOnline = device.status === 'online'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Panel – bottom sheet on mobile, right drawer on md+ */}
      <div className="fixed z-40 bg-slate-900 border-slate-800 overflow-y-auto
        bottom-0 left-0 right-0 max-h-[95svh] rounded-t-xl border-t
        md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 md:max-h-full md:rounded-none md:border-t-0 md:border-l">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Icon size={18} className="text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {device.hostname !== device.ip ? device.hostname : device.ip}
              </p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            isOnline ? 'bg-green-500/15 text-green-400' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-2">
          {/* Identity */}
          <Row label="IP Address"   value={device.ip} />
          <Row label="MAC Address"  value={device.mac} />
          <Row label="Hostname"     value={device.hostname !== device.ip ? device.hostname : null} />
          <Row label="Vendor"       value={device.vendor} />

          {/* OS */}
          {device.os_name && (
            <div className="flex flex-col gap-0.5 py-2 border-b border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Operating System</span>
              <span className="text-sm text-slate-200">{device.os_name}</span>
              {device.os_accuracy > 0 && (
                <span className="text-xs text-slate-600">{device.os_accuracy}% confidence</span>
              )}
            </div>
          )}

          {/* Ports */}
          {device.ports?.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-slate-500 uppercase tracking-wide py-2">
                Open Ports ({device.ports.length})
              </p>
              {device.ports.map((p, i) => <PortRow key={i} port={p} />)}
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1 pb-4">
            {device.first_seen && (
              <p className="text-xs text-slate-600">
                First seen: {new Date(device.first_seen).toLocaleString()}
              </p>
            )}
            {device.last_seen && (
              <p className="text-xs text-slate-600">
                Last seen: {new Date(device.last_seen).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

