import { createRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }: ErrorComponentProps) => (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="eyebrow text-dies">Something went wrong</p>
        <p className="mt-3 text-lg text-stage-200">{error instanceof Error ? error.message : String(error)}</p>
        <a href="/" className="btn-line mt-8">Back home</a>
      </div>
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
