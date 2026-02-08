'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '実行する',
  cancelLabel = 'キャンセル',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-[min(92vw,520px)] rounded-xl border border-student-border-primary bg-student-bg-secondary p-0 text-student-text-primary backdrop:bg-black/60"
    >
      <div className="p-6">
        <h3 className="font-heading text-xl font-bold">{title}</h3>
        {description && <p className="mt-3 text-sm text-student-text-secondary">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className={destructive ? 'bg-student-semantic-error text-white focus:ring-student-semantic-error' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
