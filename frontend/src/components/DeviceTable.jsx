import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { getCategoryInfo } from '../utils/icons'

function StatusDot({ status }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${status === 'online' ? 'bg-green-500' : 'bg-slate-600'}`}
    />
  )
}

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronUp size={12} className="text-slate-700" />
  return sortConfig.dir === 'asc'
    ? <ChevronUp size={12} className="text-cyan-400" />
    : <ChevronDown size={12} className="text-cyan-400" />
}

function Th({ label, col, sortConfig, onSort, className = '' }) {
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-300 whitespace-nowrap ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon col={col} sortConfig={sortConfig} />
      </span>
    </th>
  )
}

export default function DeviceTable({ devices, sortConfig, onSort, onSelect }) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm">
        <p>No devices found.</p>
        <p className="text-xs mt-1">Run a scan to discover devices on the network.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm border-collapse min-w-[340px]">
        <thead className="sticky top-0 bg-slate-950 z-10">
          <tr className="border-b border-slate-800">
            {/* Status always visible */}
            <th className="px-3 py-2 w-6" />
            {/* Category icon always visible */}
            <th className="px-2 py-2 w-7" />
            {/* IP always visible */}
            <Th label="IP" col="ip" sortConfig={sortConfig} onSort={onSort} />
            {/* Hostname – hidden on xs */}
            <Th label="Hostname" col="hostname" sortConfig={sortConfig} onSort={onSort} className="hidden xs:table-cell" />
            {/* Vendor – hidden below md */}
            <Th label="Vendor" col="vendor" sortConfig={sortConfig} onSort={onSort} className="hidden md:table-cell" />
            {/* OS – hidden below lg */}
            <Th label="OS" col="os_name" sortConfig={sortConfig} onSort={onSort} className="hidden lg:table-cell" />
            {/* Ports – hidden below md */}
            <Th label="Ports" col="ports" sortConfig={sortConfig} onSort={onSort} className="hidden md:table-cell" />
            {/* Chevron */}
            <th className="px-2 py-2 w-6" />
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => {
            const { Icon } = getCategoryInfo(d.category)
            return (
              <tr
                key={d.id}
                onClick={() => onSelect(d)}
                className="border-b border-slate-800/60 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                {/* Status dot */}
                <td className="px-3 py-2">
                  <StatusDot status={d.status} />
                </td>
                {/* Category icon */}
                <td className="px-2 py-2">
                  <Icon size={14} className="text-slate-400" />
                </td>
                {/* IP */}
                <td className="px-3 py-2 font-mono text-xs text-slate-300 whitespace-nowrap">
                  {d.ip}
                </td>
                {/* Hostname */}
                <td className="hidden xs:table-cell px-3 py-2 text-slate-200 truncate max-w-[140px]">
                  {d.hostname !== d.ip ? d.hostname : <span className="text-slate-600">—</span>}
                </td>
                {/* Vendor */}
                <td className="hidden md:table-cell px-3 py-2 text-slate-400 text-xs truncate max-w-[120px]">
                  {d.vendor !== 'Unknown' ? d.vendor : <span className="text-slate-700">—</span>}
                </td>
                {/* OS */}
                <td className="hidden lg:table-cell px-3 py-2 text-slate-400 text-xs truncate max-w-[140px]">
                  {d.os_name || <span className="text-slate-700">—</span>}
                </td>
                {/* Ports */}
                <td className="hidden md:table-cell px-3 py-2 text-xs text-slate-500">
                  {d.ports?.length > 0
                    ? d.ports.slice(0, 3).map(p => p.port).join(', ') + (d.ports.length > 3 ? ` +${d.ports.length - 3}` : '')
                    : <span className="text-slate-700">—</span>}
                </td>
                {/* Chevron */}
                <td className="px-2 py-2">
                  <ChevronRight size={14} className="text-slate-700" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

