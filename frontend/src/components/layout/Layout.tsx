import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-surface-50 lg:flex-row">
    <Sidebar />
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </div>
    </main>
  </div>
)
