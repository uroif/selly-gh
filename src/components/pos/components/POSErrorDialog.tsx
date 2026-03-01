
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Copy } from 'lucide-react'
import { useState } from 'react'

interface POSErrorDialogProps {
  open: boolean
  onClose: () => void
  errorMessage: string
  errorDetails?: string[]
}

export function POSErrorDialog({
  open,
  onClose,
  errorMessage,
  errorDetails = []
}: POSErrorDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyDetails = () => {
    const detailsText = errorDetails.join('\n')
    navigator.clipboard.writeText(detailsText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Lỗi xử lý đơn hàng
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-900">{errorMessage}</p>
          </div>

          
          {errorDetails.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Chi tiết lỗi (Log):</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDetails}
                  className="h-8"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copied ? 'Đã sao chép' : 'Sao chép log'}
                </Button>
              </div>
              <div className="p-4 bg-gray-50 border rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                {errorDetails.map((detail, index) => (
                  <div
                    key={index}
                    className={`py-1 ${
                      detail.includes('❌') || detail.includes('ERROR')
                        ? 'text-red-600 font-semibold'
                        : detail.includes('✓') || detail.includes('SUCCESS')
                        ? 'text-green-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
            <p className="font-medium mb-1">💡 Gợi ý:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Kiểm tra kết nối mạng và thử lại</li>
              <li>Nếu lỗi lặp lại, vui lòng sao chép log và báo cáo cho IT</li>
              <li>Đơn hàng chưa được lưu, bạn có thể thử lại hoặc lưu nháp</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="default">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
