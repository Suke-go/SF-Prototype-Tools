import { LoadingSpinner } from '@/components/ui'

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg-primary">
      <LoadingSpinner size="lg" className="border-admin-accent-primary border-r-transparent" />
    </main>
  )
}
