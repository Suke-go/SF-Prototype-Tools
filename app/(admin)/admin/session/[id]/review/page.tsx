import { redirect } from 'next/navigation'

export default function AdminSessionReviewPage({ params }: { params: { id: string } }) {
  redirect(`/admin/review?sessionId=${encodeURIComponent(params.id)}`)
}
