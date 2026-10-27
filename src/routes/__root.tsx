/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import css from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Read the Room: know your crowd before you walk on stage' },
      {
        name: 'description',
        content:
          'Paste your set, pick tonight’s city. Read the Room uses Qloo taste data to tell you which references will kill, which will die, and rewrites the weak ones.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <header className="relative z-20 border-b border-stage-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="display text-xl text-stage-100">Read the Room</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold text-stage-400">
            <Link to="/how" className="rounded-full px-3 py-2 hover:text-stage-100" activeProps={{ className: 'text-stage-100' }}>
              How it works
            </Link>
            <a href="https://github.com/chihebnabil/Read-the-Room" className="rounded-full px-3 py-2 hover:text-stage-100">
              GitHub
            </a>
          </nav>
        </div>
      </header>
      <main className="relative">
        <Outlet />
      </main>
      <footer className="border-t border-stage-800/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-stage-500">
          <p>Taste data from Qloo. Qloo results describe what groups tend to like, not what any one person will do.</p>
          <p>Built for the Qloo Agentic Hackathon.</p>
        </div>
      </footer>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
