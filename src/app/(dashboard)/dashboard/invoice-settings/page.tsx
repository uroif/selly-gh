'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  InvoiceSettings,
  getInvoiceSettings,
  saveInvoiceSettings,
  resetInvoiceSettings,
} from '@/lib/invoiceSettings'
import { Save, RotateCcw, Printer, Eye, AlertCircle } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'

export default function InvoiceSettingsPage() {
  const { canViewInvoiceSettings, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  
  useEffect(() => {
    
    if (!permissionsLoading && !canViewInvoiceSettings) {
      
      router.push('/dashboard/orders')
      return
    }

    if (!permissionsLoading && canViewInvoiceSettings) {
      async function loadSettings() {
        const loaded = await getInvoiceSettings()
        setSettings(loaded)
      }
      loadSettings()
    }
  }, [canViewInvoiceSettings, permissionsLoading, router])

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      await saveInvoiceSettings(settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      alert('Không thể lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (confirm('Bạn có chắc muốn đặt lại về mặc định?')) {
      try {
        await resetInvoiceSettings()
        const loaded = await getInvoiceSettings()
        setSettings(loaded)
      } catch {
        alert('Không thể đặt lại cài đặt')
      }
    }
  }

  const handlePreview = () => {
    
    const previewWindow = window.open('', '', 'width=300,height=600')
    if (!previewWindow || !settings) return

    const html = generatePreviewHTML(settings)
    previewWindow.document.write(html)
    previewWindow.document.close()
  }

  
  if (permissionsLoading || !settings) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  
  if (!canViewInvoiceSettings) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Cài Đặt Phiếu In</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-8 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6" />
            <p className="font-semibold text-lg">Không có quyền truy cập</p>
          </div>
          <p className="text-sm ml-9">
            Bạn không có quyền xem cài đặt phiếu in. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cài Đặt Phiếu In</h1>
        <p className="text-gray-600">
          Tùy chỉnh thông tin và định dạng cho phiếu in hóa đơn bán hàng
        </p>
      </div>

      
      <div className="flex gap-2 mb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Đang lưu...' : saveSuccess ? 'Đã lưu!' : 'Lưu cài đặt'}
        </Button>
        <Button
          onClick={handlePreview}
          variant="outline"
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Xem thử
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Đặt lại mặc định
        </Button>
      </div>

      
      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="header">Tiêu đề</TabsTrigger>
          <TabsTrigger value="styling">Định dạng</TabsTrigger>
          <TabsTrigger value="footer">Chân trang</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tiêu đề</CardTitle>
              <CardDescription>
                Thông tin hiển thị ở phần đầu hóa đơn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="storeName">Tên cửa hàng *</Label>
                  <Input
                    id="storeName"
                    value={settings.storeName}
                    onChange={(e) =>
                      setSettings({ ...settings, storeName: e.target.value })
                    }
                    placeholder="VD: SHOP THỜI TRANG ABC"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="storeNameFontSize">Cỡ chữ (px)</Label>
                  <Input
                    id="storeNameFontSize"
                    type="number"
                    min="10"
                    max="30"
                    value={settings.storeNameFontSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storeNameFontSize: parseInt(e.target.value) || 18,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="invoiceTitle">Tiêu đề hóa đơn *</Label>
                  <Input
                    id="invoiceTitle"
                    value={settings.invoiceTitle}
                    onChange={(e) =>
                      setSettings({ ...settings, invoiceTitle: e.target.value })
                    }
                    placeholder="VD: HÓA ĐƠN BÁN HÀNG"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="invoiceTitleFontSize">Cỡ chữ (px)</Label>
                  <Input
                    id="invoiceTitleFontSize"
                    type="number"
                    min="10"
                    max="30"
                    value={settings.invoiceTitleFontSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        invoiceTitleFontSize: parseInt(e.target.value) || 16,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="storeAddress">Địa chỉ</Label>
                  <Input
                    id="storeAddress"
                    value={settings.storeAddress}
                    onChange={(e) =>
                      setSettings({ ...settings, storeAddress: e.target.value })
                    }
                    placeholder="VD: 123 Nguyễn Văn A, Q1, TP.HCM"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="storeAddressFontSize">Cỡ chữ (px)</Label>
                  <Input
                    id="storeAddressFontSize"
                    type="number"
                    min="8"
                    max="24"
                    value={settings.storeAddressFontSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storeAddressFontSize: parseInt(e.target.value) || 14,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="storePhone">Số điện thoại</Label>
                  <Input
                    id="storePhone"
                    value={settings.storePhone}
                    onChange={(e) =>
                      setSettings({ ...settings, storePhone: e.target.value })
                    }
                    placeholder="VD: 0901234567"
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="storePhoneFontSize">Cỡ chữ (px)</Label>
                  <Input
                    id="storePhoneFontSize"
                    type="number"
                    min="8"
                    max="24"
                    value={settings.storePhoneFontSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        storePhoneFontSize: parseInt(e.target.value) || 14,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        
        <TabsContent value="styling">
          <Card>
            <CardHeader>
              <CardTitle>Định dạng hiển thị</CardTitle>
              <CardDescription>
                Tùy chỉnh font chữ, kích thước và căn lề
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fontSize">Cỡ chữ (px)</Label>
                <Input
                  id="fontSize"
                  type="number"
                  min="8"
                  max="18"
                  value={settings.fontSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fontSize: parseInt(e.target.value) || 13,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Khuyến nghị: 12-14px cho máy in nhiệt (font đậm hơn dễ đọc)
                </p>
              </div>

              <div>
                <Label htmlFor="fontFamily">Font chữ</Label>
                <select
                  id="fontFamily"
                  value={settings.fontFamily}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fontFamily: e.target.value as InvoiceSettings['fontFamily'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Roboto">Roboto ⭐ (Đậm, hỗ trợ tiếng Việt tốt - Khuyến nghị)</option>
                  <option value="Noto Sans">Noto Sans (Đậm, hỗ trợ tiếng Việt)</option>
                  <option value="Courier New">Courier New (Máy in nhiệt truyền thống)</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Font Roboto và Noto Sans có nét đậm hơn, hiển thị rõ hơn trên máy in nhiệt
                </p>
              </div>

              <div>
                <Label htmlFor="textAlign">Căn lề tiêu đề</Label>
                <select
                  id="textAlign"
                  value={settings.textAlign}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      textAlign: e.target.value as InvoiceSettings['textAlign'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="left">Trái</option>
                  <option value="center">Giữa</option>
                  <option value="right">Phải</option>
                </select>
              </div>

              <div>
                <Label htmlFor="orderIdFontSize">Cỡ chữ {'"'}Mã ĐH{'"'} (px)</Label>
                <Input
                  id="orderIdFontSize"
                  type="number"
                  min="8"
                  max="20"
                  value={settings.orderIdFontSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      orderIdFontSize: parseInt(e.target.value) || 12,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Cỡ chữ cho dòng {'"'}MÃ ĐH: #...{'"'}
                </p>
              </div>

              <div>
                <Label htmlFor="paperWidth">Khổ giấy (mm)</Label>
                <Input
                  id="paperWidth"
                  type="number"
                  min="57"
                  max="80"
                  value={settings.paperWidth}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      paperWidth: parseInt(e.target.value) || 77,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Thông dụng: 57mm, 77mm, 80mm
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        
        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chân trang</CardTitle>
              <CardDescription>
                Lời cảm ơn và ghi chú cuối hóa đơn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="thankYouMessage">Lời cảm ơn</Label>
                <Input
                  id="thankYouMessage"
                  value={settings.thankYouMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      thankYouMessage: e.target.value,
                    })
                  }
                  placeholder="VD: Cảm ơn quý khách!"
                />
              </div>

              <div>
                <Label htmlFor="footerNote">Ghi chú cuối</Label>
                <Input
                  id="footerNote"
                  value={settings.footerNote}
                  onChange={(e) =>
                    setSettings({ ...settings, footerNote: e.target.value })
                  }
                  placeholder="VD: Hẹn gặp lại"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showBarcode"
                  checked={settings.showBarcode}
                  onChange={(e) =>
                    setSettings({ ...settings, showBarcode: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="showBarcode" className="cursor-pointer">
                  Hiển thị mã đơn hàng (dạng barcode)
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt nâng cao</CardTitle>
              <CardDescription>
                Tùy chỉnh chi tiết hiển thị
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showDateTime"
                  checked={settings.showDateTime}
                  onChange={(e) =>
                    setSettings({ ...settings, showDateTime: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="showDateTime" className="cursor-pointer">
                  Hiển thị ngày giờ
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSKU"
                  checked={settings.showSKU}
                  onChange={(e) =>
                    setSettings({ ...settings, showSKU: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="showSKU" className="cursor-pointer">
                  Hiển thị mã SKU sản phẩm
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showItemIndex"
                  checked={settings.showItemIndex}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showItemIndex: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="showItemIndex" className="cursor-pointer">
                  Hiển thị số thứ tự sản phẩm
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showTotalQuantity"
                  checked={settings.showTotalQuantity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showTotalQuantity: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="showTotalQuantity" className="cursor-pointer">
                  Hiển thị tổng số lượng sản phẩm
                </Label>
              </div>

              <div>
                <Label htmlFor="dateTimeFormat">Định dạng ngày tháng</Label>
                <select
                  id="dateTimeFormat"
                  value={settings.dateTimeFormat}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dateTimeFormat: e.target.value as InvoiceSettings['dateTimeFormat'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="vi-VN">Việt Nam (28/12/2025 15:30)</option>
                  <option value="en-US">Quốc tế (12/28/2025 3:30 PM)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <Printer className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cài đặt được lưu trên trình duyệt của bạn</li>
              <li>Sử dụng nút {'"'}Xem thử{'"'} để kiểm tra trước khi in thật</li>
              <li>Khuyến nghị sử dụng font Courier New cho máy in nhiệt</li>
              <li>Các thay đổi sẽ áp dụng cho tất cả hóa đơn in sau đó</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


function generatePreviewHTML(settings: InvoiceSettings): string {
  const now = new Date()
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat(settings.dateTimeFormat, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <title>Xem thử - ${settings.invoiceTitle}</title>
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
            border-bottom: 1px dashed #999;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .items-section {
            margin: 10px 0;
          }
          .item {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #ccc;
          }
          .totals-section {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .total-row.final {
            font-size: ${settings.fontSize + 3}px;
            font-weight: bold;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 2px solid #000;
          }
          .footer {
            margin-top: 12px;
            padding-top: 8px;
            text-align: center;
            border-top: 1px dashed #999;
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
        <div class="header">
          <div class="store-name">${settings.storeName}</div>
          ${settings.storeAddress ? `<div class="store-info">${settings.storeAddress}</div>` : ''}
            ${settings.storePhone ? `<div class="store-phone">SĐT: ${settings.storePhone}</div>` : ''}
            <div class="receipt-title">${settings.invoiceTitle}</div>
          <div class="order-id">Mã ĐH: #DEMO123</div>
        </div>

        ${settings.showDateTime ? `
          <div class="info-section">
            <div class="info-row">
              <span>Ngày:</span>
              <span>${formatDateTime(now)}</span>
            </div>
            <div class="info-row">
              <span>Thanh toán:</span>
              <span>Tiền mặt</span>
            </div>
          </div>
        ` : ''}

        <div class="items-section">
          <div style="font-weight: bold; margin-bottom: 8px;">Chi tiết đơn hàng (2)</div>
          
          <div class="item">
            <div style="font-weight: 600;">${settings.showItemIndex ? '1. ' : ''}Sản phẩm mẫu A</div>
            ${settings.showSKU ? '<div style="font-size: ' + (settings.fontSize - 1) + 'px; color: #666; margin: 2px 0;">SKU: DEMO-001</div>' : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
              <span>100,000đ x 2</span>
              <span style="font-weight: 600;">200,000đ</span>
            </div>
          </div>

          <div class="item">
            <div style="font-weight: 600;">${settings.showItemIndex ? '2. ' : ''}Sản phẩm mẫu B</div>
            ${settings.showSKU ? '<div style="font-size: ' + (settings.fontSize - 1) + 'px; color: #666; margin: 2px 0;">SKU: DEMO-002</div>' : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
              <span>150,000đ x 1</span>
              <span style="font-weight: 600;">150,000đ</span>
            </div>
          </div>
        </div>

        <div class="totals-section">
        <div class="total-row">
          <span>Tổng tiền hàng:</span>
          <span>350,000đ</span>
        </div>
        ${
          settings.showTotalQuantity
            ? `
          <div class="total-row" style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px;">
            <span>Tổng SL sản phẩm:</span>
            <span style="font-weight: 600;">3</span>
          </div>
          `
            : ''
        }
        <div class="total-row final">
          <span>TỔNG CỘNG:</span>
          <span>350,000đ</span>
        </div>
      </div>

        <div class="footer">
          ${settings.thankYouMessage ? `<div class="thank-you">${settings.thankYouMessage}</div>` : ''}
          ${settings.footerNote ? `<div>${settings.footerNote}</div>` : ''}
          ${settings.showBarcode ? '<div class="barcode-placeholder">DEMO-ORDER-123</div>' : ''}
        </div>
      </body>
    </html>
  `
}
