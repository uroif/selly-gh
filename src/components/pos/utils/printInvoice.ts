
import { createClient } from '@/lib/supabase/client'
import { PaymentMethod } from '@/types'
import { formatCurrency } from './posHelpers'
import { getInvoiceSettings } from '@/lib/invoiceSettings'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  cost_price: number
  products: {
    id: string
    sku: string
    name: string
    price: number
    cost_price: number
    image_url: string | null
  } | null
}

interface OrderData {
  id: string
  subtotal: number
  final_amount: number
  payment_method: PaymentMethod
  created_at: string
  notes?: string | null
  order_items: OrderItem[]
}


export async function printInvoice(orderId: string): Promise<void> {
  const supabase = createClient()

  try {
    
    const settings = await getInvoiceSettings()

    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('[Print] Error fetching order:', error)
      alert('Không thể tải thông tin đơn hàng để in')
      return
    }

    
    const printWindow = window.open('', '', 'width=300,height=600')
    if (!printWindow) {
      alert('Vui lòng cho phép popup để in hóa đơn')
      return
    }

    const orderData = order as OrderData
    const discount = orderData.subtotal - orderData.final_amount
    const hasPromotion = discount > 0

    
    const totalQuantity = orderData.order_items.reduce((sum, item) => {
      if (item.quantity > 0) {
        return sum + item.quantity
      }
      return sum
    }, 0)

    const formatDateTime = (dateString: string) => {
      return new Intl.DateTimeFormat(settings.dateTimeFormat, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString))
    }

    
    const itemsHtml = orderData.order_items
      .map((item, index) => {
        const isReturn = item.quantity < 0
        const total = item.unit_price * item.quantity
        const itemName = item.products?.name || 'Sản phẩm đã xóa'
        const sku = item.products?.sku || 'N/A'
        
        const indexPrefix = settings.showItemIndex ? `${index + 1}. ` : ''
        const skuLine = settings.showSKU
          ? `<div style="font-size: ${settings.fontSize - 1}px; color: #666; margin: 2px 0;">SKU: ${sku}</div>`
          : ''
        
        return `
          <div class="item ${isReturn ? 'return-item' : ''}" style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px dashed #ccc;">
            <div style="font-weight: 700; font-size: ${settings.fontSize + 1}px;">${indexPrefix}${itemName}</div>
            ${skuLine}
            <div style="display: flex; justify-content: space-between; font-size: ${settings.fontSize}px; margin-top: 4px;">
              <span>${formatCurrency(item.unit_price)} x ${item.quantity}</span>
              <span style="font-weight: 700;">${formatCurrency(total)}</span>
            </div>
          </div>
        `
      })
      .join('')

    
    const notesHtml = orderData.notes
      ? `
        <div style="margin: 12px 0; padding: 8px; background-color: #f9f9f9; border: 2px dashed #999; font-size: ${settings.fontSize}px; font-weight: 600;">
          <strong>Ghi chú:</strong>
          <div style="margin-top: 4px;">${orderData.notes}</div>
        </div>
      `
      : ''

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
          <title>Hóa đơn #${orderData.id.substring(0, 8)}</title>
          <style>
            @media print {
              @page {
                size: ${settings.paperWidth}mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: '${settings.fontFamily}', 'Roboto', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              width: ${settings.paperWidth}mm;
              padding: 8px;
              font-size: ${settings.fontSize}px;
              line-height: 1.5;
              font-weight: 600;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              text-align: ${settings.textAlign};
              margin-bottom: 12px;
              border-bottom: 4px solid #000;
              padding-bottom: 8px;
            }
            .store-name {
              font-size: ${settings.storeNameFontSize}px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .store-info {
              font-size: ${settings.storeAddressFontSize}px;
              color: #444;
              margin: 2px 0;
            }
            .store-phone {
              font-size: ${settings.storePhoneFontSize}px;
              color: #444;
              margin: 2px 0;
            }
            .receipt-title {
              font-size: ${settings.invoiceTitleFontSize}px;
              font-weight: bold;
              margin: 6px 0;
            }
            .order-id {
              font-size: ${settings.orderIdFontSize}px;
              color: #666;
            }
            .info-section {
              margin: 10px 0;
              padding-bottom: 8px;
              border-bottom: 2px dashed #999;
              font-size: ${settings.fontSize}px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .info-label {
              color: #666;
            }
            .items-section {
              margin: 10px 0;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: ${settings.fontSize + 1}px;
            }
            .item {
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 2px dashed #ccc;
            }
            .return-item {
              background-color: #fee;
              padding: 6px;
              margin: 0 -6px 8px -6px;
            }
            .totals-section {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 2px solid #000;
              font-size: ${settings.fontSize}px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
            }
            .total-row.discount {
              color: #059669;
            }
            .total-row.final {
              font-size: ${settings.fontSize + 3}px;
              font-weight: bold;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 4px solid #000;
            }
            .footer {
              margin-top: 12px;
              padding-top: 8px;
              text-align: center;
              font-size: ${settings.fontSize}px;
              border-top: 2px dashed #999;
            }
            .thank-you {
              font-weight: 600;
              margin-bottom: 4px;
            }
            .barcode-placeholder {
              margin: 8px 0;
              padding: 4px;
              background-color: #f0f0f0;
              text-align: center;
              font-size: ${settings.fontSize - 2}px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <div class="store-name">${settings.storeName}</div>
            ${settings.storeAddress ? `<div class="store-info">${settings.storeAddress}</div>` : ''}
            ${settings.storePhone ? `<div class="store-phone">SĐT: ${settings.storePhone}</div>` : ''}
            <div class="receipt-title">${settings.invoiceTitle}</div>
            <div class="order-id">Mã ĐH: #${orderData.id.substring(0, 8)}</div>
          </div>

          <!-- Order Info -->
          ${settings.showDateTime ? `
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Ngày:</span>
              <span>${formatDateTime(orderData.created_at)}</span>
            </div>
          </div>
          ` : ''}

          <!-- Notes (if any) -->
          ${notesHtml}

          <!-- Items -->
          <div class="items-section">
            <div class="section-title">Chi tiết đơn hàng (${orderData.order_items.length})</div>
            ${itemsHtml}
          </div>

          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <span>Tổng tiền hàng:</span>
              <span>${formatCurrency(orderData.subtotal)}</span>
            </div>
            ${hasPromotion ? `
              <div class="total-row discount">
                <span>Khuyến mãi:</span>
                <span>-${formatCurrency(discount)}</span>
              </div>
            ` : ''}
            ${
              settings.showTotalQuantity
                ? `
              <div class="total-row" style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px;">
                <span>Tổng SL sản phẩm:</span>
                <span style="font-weight: 600;">${totalQuantity}</span>
              </div>
              `
                : ''
            }
            <div class="total-row final">
              <span>TỔNG CỘNG:</span>
              <span>${formatCurrency(orderData.final_amount)}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            ${settings.thankYouMessage ? `<div class="thank-you">${settings.thankYouMessage}</div>` : ''}
            ${settings.footerNote ? `<div>${settings.footerNote}</div>` : ''}
            ${settings.showBarcode ? `<div class="barcode-placeholder">${orderData.id.substring(0, 12)}</div>` : ''}
          </div>

          <script>
            
            window.onload = function() {
              window.print();
              
              setTimeout(function() {
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  } catch (err) {
    console.error('[Print] Unexpected error:', err)
    alert('Đã xảy ra lỗi khi in hóa đơn')
  }
}
