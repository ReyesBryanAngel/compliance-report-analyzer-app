'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboardIcon, WorkflowNavIcon, ArchitectureNavIcon } from './icons'

const navItems = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboardIcon },
  { href: '/workflows', label: 'Workflows', Icon: WorkflowNavIcon },
  { href: '/architecture', label: 'Architecture', Icon: ArchitectureNavIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex-shrink-0 flex flex-col">
      <div className="px-5 pt-6 pb-5">
        <p className="text-white font-bold text-[15px] leading-snug">
          Compliance Report<br />Analyzer
        </p>
      </div>

      <div className="mx-4 border-t border-slate-700" />

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
