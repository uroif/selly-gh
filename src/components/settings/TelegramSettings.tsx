'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { TelegramSettings as TelegramSettingsType, getTelegramSettings, updateTelegramSettings, sendTestTelegramNotification } from '@/lib/actions/settings'
import { Loader2, Send } from 'lucide-react'

export function TelegramSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [settings, setSettings] = useState<TelegramSettingsType | null>(null)
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getTelegramSettings()
      setSettings(data)
    } catch (error) {
      console.error('Failed to load telegram settings:', error)
      toast.error('Không thể tải cấu hình Telegram')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return

    setSaving(true)
    try {
      await updateTelegramSettings(settings)
      toast.success('Đã lưu cấu hình Telegram')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Không thể lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!settings?.bot_token || !settings?.chat_id) {
      toast.error('Vui lòng nhập Bot Token và Chat ID trước khi test')
      return
    }

    
    await handleSave()

    setSendingTest(true)
    try {
      const result = await sendTestTelegramNotification()
      if (result.success) {
        toast.success('Đã gửi tin nhắn test thành công')
      } else {
        toast.error(`Gửi thất bại: ${result.reason}`)
      }
    } catch (error) {
      console.error('Failed to send test message:', error)
      toast.error('Có lỗi xảy ra khi gửi tin nhắn test')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cấu hình Telegram</CardTitle>
            <CardDescription>Gửi thông báo đơn hàng mới qua Telegram Bot</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
            />
            <Label>Kích hoạt</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              value={settings.bot_token}
              onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              value={settings.chat_id}
              onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })}
              placeholder="-1001234567890"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">Tùy chọn nội dung tin nhắn</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_total_amount"
                checked={settings.toggles.send_total_amount}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_total_amount: checked === true }
                  })
                }
              />
              <Label htmlFor="send_total_amount">Tổng tiền thanh toán</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_subtotal_discount"
                checked={settings.toggles.send_subtotal_discount}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_subtotal_discount: checked === true }
                  })
                }
              />
              <Label htmlFor="send_subtotal_discount">Tổng tiền hàng & Khuyến mãi</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_total_skus"
                checked={settings.toggles.send_total_skus}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_total_skus: checked === true }
                  })
                }
              />
              <Label htmlFor="send_total_skus">Số lượng mã hàng</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_total_quantity"
                checked={settings.toggles.send_total_quantity}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_total_quantity: checked === true }
                  })
                }
              />
              <Label htmlFor="send_total_quantity">Tổng số lượng sản phẩm</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_product_list"
                checked={settings.toggles.send_product_list}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_product_list: checked === true }
                  })
                }
              />
              <Label htmlFor="send_product_list">Danh sách sản phẩm chi tiết</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_payment_method"
                checked={settings.toggles.send_payment_method}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_payment_method: checked === true }
                  })
                }
              />
              <Label htmlFor="send_payment_method">Hình thức thanh toán</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_notes"
                checked={settings.toggles.send_notes}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_notes: checked === true }
                  })
                }
              />
              <Label htmlFor="send_notes">Ghi chú đơn hàng</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_created_at"
                checked={settings.toggles.send_created_at}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_created_at: checked === true }
                  })
                }
              />
              <Label htmlFor="send_created_at">Thời gian tạo đơn</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_system_errors"
                checked={settings.toggles.send_system_errors}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    toggles: { ...settings.toggles, send_system_errors: checked === true }
                  })
                }
              />
              <Label htmlFor="send_system_errors">Gửi log lỗi hệ thống</Label>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu cấu hình
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={sendingTest || saving}>
            {sendingTest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Gửi test
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
