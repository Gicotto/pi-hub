import { useState, useEffect, useMemo, useCallback } from 'react'
import Header from './components/Header'
import CategoryFilter from './components/CategoryFilter'
import DeviceTable from './components/DeviceTable'
import DeviceDrawer from './components/DeviceDrawer'
import { fetchDevices, fetchNetwork, fetchScanStatus, startScan, clearDevices, createWebSocket } from './utils/api'

function sortDevices(devices, { key, dir }) {
  return [...devices].sort((a, b) => {
    let av = a[key] ?? '', bv = b[key] ?? ''
    if (key === 'ip') {
      av = a.ip.split('.').map(n => n.padStart(3, '0')).join('.')
      bv = b.ip.split('.').map(n => n.padStart(3, '0')).join('.')
    }
    if (key === 'ports') {
      return dir === 'asc' ? (a.ports?.length ?? 0) - (b.ports?.length ?? 0)
                           : (b.ports?.length ?? 0) - (a.ports?.length ?? 0)
    }
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function App() {
  const [devices, setDevices]         = useState([])
  const [category, setCategory]       = useState('all')
  const [sortConfig, setSortConfig]   = useState({ key: 'ip', dir: 'asc' })
  const [selected, setSelected]       = useState(null)
  const [scanStatus, setScanStatus]   = useState({ status: 'idle', progress: 0, found: 0 })
  const [networkInfo, setNetworkInfo] = useState(null)

  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => {})
    fetchNetwork().then(setNetworkInfo).catch(() => {})
    fetchScanStatus().then(setScanStatus).catch(() => {})
  }, [])

  useEffect(() => {
    let ws
    const connect = () => {
      ws = createWebSocket()
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'device_found') {
          setDevices(prev => {
            const idx = prev.findIndex(d => d.id === msg.device.id)
            if (idx >= 0) { const next = [...prev]; next[idx] = msg.device; return next }
            return [...prev, msg.device]
          })
          setScanStatus(prev => ({ ...prev, progress: msg.progress ?? prev.progress }))
        } else if (msg.type === 'discovery_done') {
          setScanStatus(prev => ({ ...prev, status: 'running', total: msg.count }))
        } else if (msg.type === 'scan_complete') {
          setScanStatus(prev => ({ ...prev, status: 'complete', progress: 100 }))
        } else if (msg.type === 'scan_error') {
          setScanStatus(prev => ({ ...prev, status: 'error' }))
        }
      }
      ws.onerror = () => setTimeout(connect, 3000)
    }
    connect()
    return () => ws?.close()
  }, [])

  const handleScan = useCallback(async () => {
    setDevices([])
    setScanStatus({ status: 'running', progress: 0, found: 0 })
    await startScan()
  }, [])

  const handleClear = useCallback(async () => {
    await clearDevices()
    setDevices([])
    setScanStatus({ status: 'idle', progress: 0, found: 0 })
  }, [])

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }, [])

  const visibleDevices = useMemo(() => {
    const filtered = category === 'all' ? devices : devices.filter(d => d.category === category)
    return sortDevices(filtered, sortConfig)
  }, [devices, category, sortConfig])

  const counts = useMemo(() => {
    const c = { all: devices.length }
    devices.forEach(d => { c[d.category] = (c[d.category] ?? 0) + 1 })
    return c
  }, [devices])

  return (
    <div className="flex flex-col h-svh bg-slate-950 text-slate-100 overflow-hidden">
      <Header networkInfo={networkInfo} scanStatus={scanStatus} onScan={handleScan} onClear={handleClear} />

      {/* Pills – mobile only (below md) */}
      <div className="md:hidden">
        <CategoryFilter active={category} counts={counts} onChange={setCategory} layout="pills" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar – desktop only */}
        <div className="hidden md:flex">
          <CategoryFilter active={category} counts={counts} onChange={setCategory} layout="sidebar" />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/60 shrink-0">
            <span className="text-xs text-slate-500">
              <span className="text-slate-300 font-medium tabular-nums">{visibleDevices.length}</span>
              {' '}{category !== 'all' ? 'matching' : visibleDevices.length !== 1 ? 'devices' : 'device'}
            </span>
            {networkInfo?.local_ip && (
              <span className="hidden sm:inline text-xs text-slate-600 font-mono">
                This device: {networkInfo.local_ip}
              </span>
            )}
          </div>

          <DeviceTable
            devices={visibleDevices}
            sortConfig={sortConfig}
            onSort={handleSort}
            onSelect={setSelected}
          />
        </main>
      </div>

      <DeviceDrawer device={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

