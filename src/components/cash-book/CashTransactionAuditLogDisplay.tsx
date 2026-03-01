'use client'

import { CashTransactionAuditLogWithUser } from '@/types'

interface CashTransactionAuditLogDisplayProps {
  logs: CashTransactionAuditLogWithUser[]
  formatCurrency: (amount: number) => string
  formatDateTime: (dateString: string) => string
  getCategoryLabel: (category: string) => string
}

export function CashTransactionAuditLogDisplay({ 
  logs, 
  formatCurrency, 
  formatDateTime,
  getCategoryLabel
}: CashTransactionAuditLogDisplayProps) {
  if (logs.length === 0) {
    return <p className="text-center text-muted-foreground">Chưa có lịch sử thay đổi</p>
  }

  const getTypeLabel = (type: string) => {
    return type === 'income' ? 'Thu' : 'Chi'
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        
        const changes = log.changes as any
        
        return (
          <div key={log.id} className="border rounded p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {log.action === 'created' && 'Tạo giao dịch'}
                  {log.action === 'updated' && 'Cập nhật giao dịch'}
                  {log.action === 'deleted' && 'Xóa giao dịch'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bởi: {log.changer_username || 'N/A'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(log.changed_at)}
              </p>
            </div>
            
            {log.changes && (
              <div className="space-y-2">
                {log.action === 'created' && (
                  <div className="bg-green-50 p-3 rounded space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Loại:</span> <span className="font-medium">{getTypeLabel(changes.transaction_type)}</span></div>
                    <div><span className="text-muted-foreground">Danh mục:</span> <span className="font-medium">{getCategoryLabel(changes.category)}</span></div>
                    <div><span className="text-muted-foreground">Số tiền:</span> <span className="font-medium">{formatCurrency(changes.amount)}</span></div>
                    <div><span className="text-muted-foreground">Mô tả:</span> <span className="font-medium">{changes.description}</span></div>
                    {changes.notes && <div><span className="text-muted-foreground">Ghi chú:</span> <span className="font-medium">{changes.notes}</span></div>}
                  </div>
                )}
                
                {log.action === 'updated' && changes.before && changes.after && (
                  <div className="bg-orange-50 p-3 rounded space-y-2 text-sm">
                    {changes.before.transaction_type !== changes.after.transaction_type && (
                      <div>
                        <span className="text-muted-foreground">Loại:</span>{' '}
                        <span className="line-through text-red-600">{getTypeLabel(changes.before.transaction_type)}</span>
                        {' → '}
                        <span className="font-medium text-green-600">{getTypeLabel(changes.after.transaction_type)}</span>
                      </div>
                    )}
                    {changes.before.category !== changes.after.category && (
                      <div>
                        <span className="text-muted-foreground">Danh mục:</span>{' '}
                        <span className="line-through text-red-600">{getCategoryLabel(changes.before.category)}</span>
                        {' → '}
                        <span className="font-medium text-green-600">{getCategoryLabel(changes.after.category)}</span>
                      </div>
                    )}
                    {changes.before.amount !== changes.after.amount && (
                      <div>
                        <span className="text-muted-foreground">Số tiền:</span>{' '}
                        <span className="line-through text-red-600">{formatCurrency(changes.before.amount)}</span>
                        {' → '}
                        <span className="font-medium text-green-600">{formatCurrency(changes.after.amount)}</span>
                      </div>
                    )}
                    {changes.before.description !== changes.after.description && (
                      <div>
                        <span className="text-muted-foreground">Mô tả:</span>{' '}
                        <span className="line-through text-red-600">{changes.before.description}</span>
                        {' → '}
                        <span className="font-medium text-green-600">{changes.after.description}</span>
                      </div>
                    )}
                    {changes.before.notes !== changes.after.notes && (
                      <div>
                        <span className="text-muted-foreground">Ghi chú:</span>{' '}
                        <span className="line-through text-red-600">{changes.before.notes || '(trống)'}</span>
                        {' → '}
                        <span className="font-medium text-green-600">{changes.after.notes || '(trống)'}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {log.action === 'deleted' && (
                  <div className="bg-red-50 p-3 rounded space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Loại:</span> <span className="font-medium">{getTypeLabel(changes.transaction_type)}</span></div>
                    <div><span className="text-muted-foreground">Danh mục:</span> <span className="font-medium">{getCategoryLabel(changes.category)}</span></div>
                    <div><span className="text-muted-foreground">Số tiền:</span> <span className="font-medium">{formatCurrency(changes.amount)}</span></div>
                    <div><span className="text-muted-foreground">Mô tả:</span> <span className="font-medium">{changes.description}</span></div>
                    {changes.notes && <div><span className="text-muted-foreground">Ghi chú:</span> <span className="font-medium">{changes.notes}</span></div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
