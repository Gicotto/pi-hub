import {
  Monitor, Smartphone, Printer, Router, Tv,
  HardDrive, Gamepad2, Cpu, HelpCircle, Network,
} from 'lucide-react'

export const CATEGORIES = [
  { key: 'all',      label: 'All Devices',    Icon: Network    },
  { key: 'computer', label: 'Computers',       Icon: Monitor    },
  { key: 'router',   label: 'Routers / APs',  Icon: Router     },
  { key: 'printer',  label: 'Printers',        Icon: Printer    },
  { key: 'phone',    label: 'Phones / Tablets',Icon: Smartphone },
  { key: 'tv',       label: 'Smart TVs',       Icon: Tv         },
  { key: 'nas',      label: 'NAS / Storage',   Icon: HardDrive  },
  { key: 'gaming',   label: 'Gaming',          Icon: Gamepad2   },
  { key: 'iot',      label: 'IoT',             Icon: Cpu        },
  { key: 'unknown',  label: 'Unknown',         Icon: HelpCircle },
]

export function getCategoryInfo(key) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1]
}

