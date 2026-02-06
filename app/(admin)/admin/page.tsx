import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <Card tone="admin">
        <CardHeader>
          <CardTitle className="font-body text-admin-text-primary">管理者</CardTitle>
        </CardHeader>
        <CardContent className="text-admin-text-secondary">
          <p className="mb-6">
            セッションを作成して、生徒にセッションIDを共有します。
          </p>
          <div className="flex gap-3">
            <Link href="/admin/session/new">
              <Button className="bg-admin-accent-primary text-white hover:brightness-110">
                <span className="whitespace-nowrap">セッション作成</span>
              </Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button
                variant="secondary"
                className="border-admin-border-primary text-admin-text-primary hover:bg-admin-bg-secondary"
              >
                <span className="whitespace-nowrap">ダッシュボード</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

