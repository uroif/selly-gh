# Implementation Plan - Telegram Notifications (Revised)

## 1. Database Schema (`app_settings`)

Create a generic `app_settings` table to store various application configurations, starting with Telegram settings. This allows for future extensibility without creating new tables for every setting.

```sql
create table app_settings (
  key text not null primary key, -- e.g., 'telegram_notifications'
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamp with time zone default now(),
  updated_by uuid references profiles(id)
);

-- Add RLS policies (only admin/owner can access)
alter table app_settings enable row level security;

create policy "Enable read access for authenticated users"
on app_settings for select
to authenticated
using (true);

create policy "Enable all access for admin/owner"
on app_settings for all
to authenticated
using (
  auth.uid() in (
    select id from profiles where role in ('owner', 'admin')
  )
);
```

### Telegram Configuration Structure (stored in `value` column)
Key: `telegram_notifications`
```json
{
  "is_active": false,
  "bot_token": "",
  "chat_id": "",
  "toggles": {
    "send_total_amount": true,
    "send_subtotal_discount": true,
    "send_total_skus": true,
    "send_total_quantity": true,
    "send_product_list": true,
    "send_payment_method": true,
    "send_notes": true,
    "send_created_at": true
  }
}
```

## 2. Server Actions (`src/lib/actions/settings.ts`)

Create a new file for Settings-related actions.

- `getAppSetting(key: string)`: Fetch a setting by key.
- `updateAppSetting(key: string, value: any)`: Update a setting.
- `sendTelegramNotification(orderId: string)`:
    1. Fetch `app_settings` where key = 'telegram_notifications'.
    2. Check `is_active`, `bot_token`, `chat_id`.
    3. Fetch order details.
    4. Construct message based on `toggles`.
    5. Call Telegram API.

## 3. UI Components

### `src/components/settings/TelegramSettings.tsx`
- A generic-looking settings card that specifically handles the Telegram configuration.
- Fetches data using `getAppSetting('telegram_notifications')`.
- Form with:
    - Master Switch: "Bật gửi tin nhắn Telegram"
    - Input: Bot Token (password field for security visual)
    - Input: Chat ID
    - Section: "Tùy chọn nội dung" (Checkboxes for each toggle)
- Save button (updates `app_settings` via `updateAppSetting`).

### Update `src/app/(dashboard)/dashboard/settings/page.tsx`
- Import `TelegramSettings` component.
- Add it to the existing layout (likely below the "Change Password" card).

## 4. Integration

### Update `src/components/pos/hooks/usePOSCheckout.ts`
- Import `sendTelegramNotification` from server actions.
- In `handleCheckout`, inside the success block (after order creation/update), call `sendTelegramNotification(order.id)`.
- **Note:** This should be a non-blocking call (fire and forget) so it doesn't delay the UI response.

## 5. Message Format Template

```
🆕 Đơn hàng mới: #{ORDER_ID_SHORT}

[If send_total_amount]
💰 Tổng cộng: {final_amount}

[If send_subtotal_discount && discount > 0]
💵 Tiền hàng: {subtotal} | Giảm: {discount}

[If send_total_skus || send_total_quantity]
📦 {send_total_skus ? `Mã hàng: ${sku_count}` : ''} {send_total_quantity ? `| SL: ${total_qty}` : ''}

[If send_product_list]
📋 Danh sách:
1. {Product Name}
   {quantity} x {unit_price} = {total}
...

[If send_payment_method]
💳 TT: {payment_method}

[If send_notes && notes]
📝 Ghi chú: {notes}

[If send_created_at]
🕒 {created_at}
```
