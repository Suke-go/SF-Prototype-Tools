'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui'

type SessionShareCardProps = {
  sessionCode: string | null
  sessionUrl: string
}

export function SessionShareCard({ sessionCode, sessionUrl }: SessionShareCardProps) {
  const [copied, setCopied] = useState<'code' | 'url' | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function buildQr() {
      if (!sessionUrl) {
        setQrDataUrl('')
        return
      }

      try {
        setQrError(false)
        const dataUrl = await QRCode.toDataURL(sessionUrl, {
          width: 256,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
        if (!cancelled) setQrDataUrl(dataUrl)
      } catch {
        if (!cancelled) {
          setQrError(true)
          setQrDataUrl('')
        }
      }
    }

    void buildQr()

    return () => {
      cancelled = true
    }
  }, [sessionUrl])

  async function copy(kind: 'code' | 'url') {
    const value = kind === 'code' ? sessionCode || '' : sessionUrl
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="rounded-lg border border-admin-border-primary bg-admin-bg-secondary p-4">
      <h3 className="text-sm font-semibold text-admin-text-primary">セッション共有</h3>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-md border border-admin-border-primary bg-white p-1">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="参加URLのQRコード"
              width={136}
              height={136}
              unoptimized
              className="h-[136px] w-[136px]"
            />
          ) : (
            <div className="px-3 text-center text-xs text-admin-text-tertiary">{qrError ? 'QR生成に失敗しました' : 'QR生成中...'}</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs text-admin-text-tertiary">参加コード</p>
            <p className="font-mono text-sm text-admin-text-primary">{sessionCode || '-'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button tone="admin" size="sm" variant="secondary" onClick={() => void copy('code')} disabled={!sessionCode}>
              {copied === 'code' ? 'コピー済み' : 'コードをコピー'}
            </Button>
            <Button tone="admin" size="sm" variant="secondary" onClick={() => void copy('url')}>
              {copied === 'url' ? 'コピー済み' : 'URLをコピー'}
            </Button>
          </div>
          <p className="truncate text-xs text-admin-text-tertiary">{sessionUrl}</p>
        </div>
      </div>
    </div>
  )
}
