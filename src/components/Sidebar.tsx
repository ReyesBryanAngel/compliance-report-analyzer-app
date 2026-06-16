'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboardIcon, WorkflowNavIcon, ArchitectureNavIcon, BookOpenIcon, SettingsIcon } from './icons'

const navItems = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboardIcon },
  { href: '/workflows', label: 'Workflows', Icon: WorkflowNavIcon },
  { href: '/architecture', label: 'Architecture', Icon: ArchitectureNavIcon },
  { href: '/guides', label: 'Guides', Icon: BookOpenIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} min-h-screen bg-slate-900 flex-shrink-0 flex flex-col transition-all duration-200 overflow-hidden`}>
      <div className={`pt-6 pb-5 flex items-center ${collapsed ? 'px-3 justify-center' : 'px-5 justify-between'}`}>
        {!collapsed && (
          <p className="text-white font-bold text-[15px] leading-snug whitespace-nowrap">
            Complytica
          </p>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="mx-4 border-t border-slate-700" />

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
