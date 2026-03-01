'use client'

import { TelegramSettings } from '@/components/settings/TelegramSettings'
import { usePermissions } from '@/hooks/usePermissions'

export default function TelegramPage() {
  const { canManageSettings } = usePermissions()

  if (!canManageSettings) {
    return <div className="p-6">Bạn không có quyền truy cập trang này.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cấu hình Telegram</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <TelegramSettings />
        </div>
      </div>
    </div>
  )
}
