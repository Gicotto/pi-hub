import axios from 'axios'

const api = axios.create({ baseURL: '' })

export const fetchDevices  = (category) => api.get('/api/devices', { params: category && category !== 'all' ? { category } : {} }).then(r => r.data)
export const fetchNetwork  = ()         => api.get('/api/network').then(r => r.data)
export const fetchScanStatus = ()       => api.get('/api/scan/status').then(r => r.data)
export const startScan     = ()         => api.post('/api/scan').then(r => r.data)
export const clearDevices  = ()         => api.delete('/api/devices').then(r => r.data)

export function createWebSocket() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(`${proto}://${window.location.host}/ws`)
}

