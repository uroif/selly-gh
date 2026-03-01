'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Upload, AlertCircle, CheckCircle2, XCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface ImportRow {
  sku: string
  product_name: string
  unit: string
  cost_price: number | string
  sell_price: number | string
  inventory: number | string
}

interface ImportResult {
  success: boolean
  message: string
  details?: {
    inserted: number
    updated: number
    errors: number
    errorMessages: string[]
  }
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const supabase = createClient()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setResult(null)
    setProgress({ current: 0, total: 0, percentage: 0 })

    try {
      
      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as ArrayBuffer)
          } else {
            reject(new Error('Failed to read file'))
          }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
      })

      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[]

      if (jsonData.length === 0) {
        setResult({
          success: false,
          message: 'File không có dữ liệu'
        })
        setIsProcessing(false)
        return
      }

      
      setProgress({ current: 0, total: jsonData.length, percentage: 0 })

      
      const firstRow = jsonData[0]
      const requiredColumns = ['sku', 'product_name', 'cost_price', 'sell_price', 'inventory']
      
      
      const normalizedColumns = Object.keys(firstRow).map(key =>
        key.toLowerCase().replace(/\s+/g, '_')
      )
      
      
      const missingColumns = requiredColumns.filter(col => !normalizedColumns.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('Available columns:', normalizedColumns)
        console.log('Missing columns:', missingColumns)
        setResult({
          success: false,
          message: `File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`
        })
        setIsProcessing(false)
        return
      }

      
      let inserted = 0
      let updated = 0
      let errors = 0
      const errorMessages: string[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        
        const current = i + 1
        const percentage = Math.round((current / jsonData.length) * 100)
        setProgress({ current, total: jsonData.length, percentage })
        
        try {
          
          const normalizedRow: Record<string, string | number> = {}
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/\s/g, '_')
            normalizedRow[normalizedKey] = row[key as keyof ImportRow]
          })

          const sku = String(normalizedRow.sku || '').trim()
          const product_name = String(normalizedRow['tên_sản_phẩm'] || normalizedRow.product_name || '').trim()
          const unit = String(normalizedRow['đơn_vị_tính'] || normalizedRow.unit || '').trim()
          const cost_price = normalizedRow['giá_vốn'] || normalizedRow.cost_price
          const sell_price = normalizedRow['giá_bán'] || normalizedRow.sell_price
          const inventory = normalizedRow['tồn_kho'] || normalizedRow.inventory

          if (!sku || !product_name) {
            errorMessages.push(`Dòng bị thiếu SKU hoặc tên sản phẩm`)
            errors++
            continue
          }

          
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id, inventory_items(id, quantity)')
            .eq('sku', sku)
            .is('deleted_at', null)
            .single()

          if (existingProduct) {
            
            const updateData: { name?: string; unit?: string | null; cost_price?: number; price?: number } = {}
            
            if (product_name !== '' && product_name !== null && product_name !== undefined) {
              updateData.name = product_name
            }
            
            if (unit !== '' && unit !== null && unit !== undefined) {
              updateData.unit = unit || null
            }
            
            if (cost_price !== '' && cost_price !== null && cost_price !== undefined) {
              updateData.cost_price = Number(cost_price)
            }
            
            if (sell_price !== '' && sell_price !== null && sell_price !== undefined) {
              updateData.price = Number(sell_price)
            }

            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', existingProduct.id)

              if (updateError) {
                errorMessages.push(`SKU ${sku}: Lỗi cập nhật sản phẩm - ${updateError.message}`)
                errors++
                continue
              }
            }

            
            if (inventory !== '' && inventory !== null && inventory !== undefined) {
              const inventoryChange = Number(inventory)
              
              
              
              const logType = inventoryChange >= 0 ? 'inbound' : 'adjustment'
              const { error: logError } = await supabase.from('inventory_logs').insert({
                product_id: existingProduct.id,
                type: logType,
                quantity_change: inventoryChange,
                notes: 'Nhập từ Excel'
              })

              if (logError) {
                errorMessages.push(`SKU ${sku}: Lỗi nhập hàng - ${logError.message}`)
                errors++
                continue
              }
            }

            updated++
          } else {
            
            const { data: newProduct, error: insertError } = await supabase
              .from('products')
              .insert({
                sku,
                name: product_name,
                unit: unit || null,
                cost_price: Number(cost_price) || 0,
                price: Number(sell_price) || 0,
                image_url: null
              })
              .select('id')
              .single()

            if (insertError) {
              errorMessages.push(`SKU ${sku}: Lỗi tạo sản phẩm - ${insertError.message}`)
              errors++
              continue
            }

            
            if (inventory !== '' && inventory !== null && inventory !== undefined) {
              const inventoryChange = Number(inventory)
              
              
              
              const logType = inventoryChange >= 0 ? 'inbound' : 'adjustment'
              const { error: logError } = await supabase.from('inventory_logs').insert({
                product_id: newProduct.id,
                type: logType,
                quantity_change: inventoryChange,
                notes: 'Nhập từ Excel'
              })

              if (logError) {
                errorMessages.push(`SKU ${sku}: Lỗi nhập hàng - ${logError.message}`)
                errors++
                continue
              }
            }

            inserted++
          }
        } catch (error) {
          errorMessages.push(`Lỗi xử lý dòng: ${error instanceof Error ? error.message : 'Unknown error'}`)
          errors++
        }
      }

      setResult({
        success: inserted + updated > 0,
        message: `Hoàn thành: ${inserted} sản phẩm mới, ${updated} sản phẩm cập nhật, ${errors} lỗi`,
        details: {
          inserted,
          updated,
          errors,
          errorMessages: errorMessages.slice(0, 10) 
        }
      })

      if (inserted + updated > 0) {
        onSuccess()
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Lỗi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    setIsProcessing(false)
    
    
    event.target.value = ''
  }

  const handleClose = () => {
    setResult(null)
    onOpenChange(false)
  }

  const handleDownloadTemplate = () => {
    
    const templateData = [
      {
        'sku': 'PRODUCT-001',
        'product_name': 'Sample Product',
        'unit': 'Cái',
        'cost_price': 50000,
        'sell_price': 75000,
        'inventory': 10
      }
    ]

    
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    
    worksheet['!cols'] = [
      { wch: 15 }, 
      { wch: 30 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 10 }  
    ]

    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')

    
    XLSX.writeFile(workbook, 'import-template.xlsx')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập sản phẩm từ Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Click để chọn file Excel
              </span>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              File phải có các cột: sku, product_name, unit (tùy chọn), cost_price, sell_price, inventory
            </p>
          </div>

          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-sm text-blue-700">Đang xử lý file...</span>
              </div>
              
              {progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>Tiến trình: {progress.current} / {progress.total} bản ghi</span>
                    <span className="font-semibold">{progress.percentage}%</span>
                  </div>
                  
                  
                  <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg ${
              result.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && result.details.errorMessages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-700 mb-1">Chi tiết lỗi:</p>
                      <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                        {result.details.errorMessages.map((msg, idx) => (
                          <li key={idx} className="flex items-start">
                            <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                      {result.details.errors > result.details.errorMessages.length && (
                        <p className="text-xs text-red-600 mt-1">
                          ... và {result.details.errors - result.details.errorMessages.length} lỗi khác
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 space-y-2">
            <p className="font-medium text-gray-700">Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nếu SKU đã tồn tại: cập nhật tên sản phẩm, giá vốn và giá bán (nếu không để trống), <strong>cộng thêm</strong> tồn kho</li>
              <li>Nếu SKU chưa tồn tại: tạo sản phẩm mới</li>
              <li>Để trống tên sản phẩm, giá vốn hoặc giá bán nếu không muốn cập nhật</li>
              <li>Tồn kho sẽ được cộng thêm vào số lượng hiện tại (không ghi đè). <strong>Cho phép giá trị âm</strong> để trừ tồn kho</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
