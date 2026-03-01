'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TelegramSettings {
  is_active: boolean
  bot_token: string
  chat_id: string
  toggles: {
    send_total_amount: boolean
    send_subtotal_discount: boolean
    send_total_skus: boolean
    send_total_quantity: boolean
    send_product_list: boolean
    send_payment_method: boolean
    send_notes: boolean
    send_created_at: boolean
    send_system_errors: boolean
  }
}

const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  is_active: false,
  bot_token: '',
  chat_id: '',
  toggles: {
    send_total_amount: true,
    send_subtotal_discount: true,
    send_total_skus: true,
    send_total_quantity: true,
    send_product_list: true,
    send_payment_method: true,
    send_notes: true,
    send_created_at: true,
    send_system_errors: true,
  },
}

export async function getAppSetting<T>(key: string, defaultValue: T): Promise<T> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return defaultValue
  }

  return data.value as T
}

export async function updateAppSetting(key: string, value: unknown, description?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key,
      value,
      description,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`)
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  return getAppSetting('telegram_notifications', DEFAULT_TELEGRAM_SETTINGS)
}

export async function updateTelegramSettings(settings: TelegramSettings) {
  return updateAppSetting('telegram_notifications', settings, 'Cấu hình thông báo Telegram')
}

export async function sendTestTelegramNotification() {
  try {
    const settings = await getTelegramSettings()

    
    if (!settings.bot_token || !settings.chat_id) {
      return { success: false, reason: 'unconfigured' }
    }

    const message = `(TIN NHẮN TEST)
💰 Tổng cộng: 150.000 ₫
💵 Tiền hàng: 200.000 ₫ | Giảm: 50.000 ₫
📦 Mã hàng: 2 | SL: 3
📋 Danh sách:
1. Áo thun Basic (L)
   2 x 50.000 ₫ = 100.000 ₫
2. Quần Short Jean (M)
   1 x 100.000 ₫ = 100.000 ₫
💳 TT: Tiền mặt
📝 Ghi chú: Giao hàng trong giờ hành chính
🕒 ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}
🆕 Đơn hàng mới: #TEST-ORDER-001`

    
    const response = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Telegram] Failed to send test message:', errorData)
      return { success: false, reason: 'telegram_api_error', details: errorData }
    }

    return { success: true }
  } catch (error) {
    console.error('[Telegram] Unexpected error:', error)
    return { success: false, reason: 'unexpected_error' }
  }
}

export async function sendTelegramNotification(orderId: string) {
  try {
    const settings = await getTelegramSettings()

    
    if (!settings.is_active || !settings.bot_token || !settings.chat_id) {
      console.log('[Telegram] Notification disabled or unconfigured')
      return { success: false, reason: 'disabled_or_unconfigured' }
    }

    const supabase = await createClient()

    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          products (
            name,
            sku
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('[Telegram] Order not found:', error)
      return { success: false, reason: 'order_not_found' }
    }

    
    const lines: string[] = []
    
    
    if (settings.toggles.send_total_amount) {
      lines.push(`💰 Tổng cộng: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.final_amount)}`)
    }

    
    const discount = order.subtotal - order.final_amount
    if (settings.toggles.send_subtotal_discount && discount > 0) {
      const subtotalFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.subtotal)
      const discountFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discount)
      lines.push(`💵 Tiền hàng: ${subtotalFormatted} | Giảm: ${discountFormatted}`)
    }

    
    if (settings.toggles.send_total_skus || settings.toggles.send_total_quantity) {
      const parts = []
      if (settings.toggles.send_total_skus) {
        parts.push(`Mã hàng: ${order.order_items.length}`)
      }
      if (settings.toggles.send_total_quantity) {
        const totalQty = order.order_items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
        parts.push(`SL: ${totalQty}`)
      }
      if (parts.length > 0) {
        lines.push(`📦 ${parts.join(' | ')}`)
      }
    }

    
    if (settings.toggles.send_product_list && order.order_items.length > 0) {
      lines.push('📋 Danh sách:')
      order.order_items.forEach((item: { quantity: number; unit_price: number; products: { name: string } | null }, index: number) => {
        const totalItem = item.quantity * item.unit_price
        const formattedTotal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalItem)
        lines.push(`${index + 1}. ${item.products?.name || 'Unknown'}`)
        lines.push(`   ${item.quantity} x ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.unit_price)} = ${formattedTotal}`)
      })
    }

    
    if (settings.toggles.send_payment_method) {
      const methodMap: Record<string, string> = {
        cash: 'Tiền mặt',
        transfer: 'Chuyển khoản',
        card: 'Thẻ'
      }
      lines.push(`💳 TT: ${methodMap[order.payment_method] || order.payment_method}`)
    }

    
    if (settings.toggles.send_notes && order.notes) {
      lines.push(`📝 Ghi chú: ${order.notes}`)
    }

    
    if (settings.toggles.send_created_at) {
      const date = new Date(order.created_at)
      lines.push(`🕒 ${date.toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}`)
    }

    
    lines.push(`🆕 Đơn hàng mới: #${order.id.substring(0, 8).toUpperCase()}`)

    const message = lines.join('\n')

    
    const response = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text: message,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Telegram] Failed to send message:', errorData)
      return { success: false, reason: 'telegram_api_error', details: errorData }
    }

    return { success: true }

  } catch (error) {
    console.error('[Telegram] Unexpected error:', error)
    return { success: false, reason: 'unexpected_error' }
  }
}

export interface ErrorLogContext {
  userId?: string
  action: string
  timestamp: string
  errorType: string
  errorMessage: string
  errorDetails?: string[]
  stackTrace?: string
}

export async function sendTelegramErrorLog(context: ErrorLogContext) {
  try {
    const settings = await getTelegramSettings()

    
    if (!settings.is_active || !settings.toggles.send_system_errors || !settings.bot_token || !settings.chat_id) {
      console.log('[Telegram] Error logging disabled or unconfigured')
      return { success: false, reason: 'disabled_or_unconfigured' }
    }

    
    const lines: string[] = []
    lines.push(`🚨 LỖI HỆ THỐNG`)
    lines.push(``)
    lines.push(`⚙️ Hành động: ${context.action}`)
    if (context.userId) {
      lines.push(`👤 User ID: ${context.userId.substring(0, 8)}...`)
    }
    lines.push(`🕒 Thời gian: ${context.timestamp}`)
    lines.push(``)
    lines.push(`❌ Loại lỗi: ${context.errorType}`)
    lines.push(`📝 Nội dung: ${context.errorMessage}`)
    
    if (context.errorDetails && context.errorDetails.length > 0) {
      lines.push(``)
      lines.push(`📊 CHI TIẾT LOG:`)
      lines.push(`\`\`\``)
      
      const logs = context.errorDetails.slice(-20)
      logs.forEach(log => lines.push(log))
      lines.push(`\`\`\``)
    }
    
    if (context.stackTrace) {
      lines.push(``)
      lines.push(`🔍 Stack Trace:`)
      lines.push(`\`\`\``)
      
      lines.push(context.stackTrace.substring(0, 500))
      lines.push(`\`\`\``)
    }

    const message = lines.join('\n')

    
    const response = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[Telegram] Failed to send error log:', errorData)
      return { success: false, reason: 'telegram_api_error', details: errorData }
    }

    return { success: true }

  } catch (error) {
    console.error('[Telegram] Unexpected error sending error log:', error)
    return { success: false, reason: 'unexpected_error' }
  }
}
