import { OrderAuditLogWithUser } from '@/types'

interface AuditLogDisplayProps {
  logs: OrderAuditLogWithUser[]
  formatCurrency: (amount: number) => string
  formatDateTime: (dateString: string) => string
  getPaymentMethodLabel: (method: string) => string
}

export function AuditLogDisplay({ 
  logs, 
  formatCurrency, 
  formatDateTime, 
  getPaymentMethodLabel 
}: AuditLogDisplayProps) {
  if (logs.length === 0) {
    return <p className="text-center text-muted-foreground">Chưa có lịch sử thay đổi</p>
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        
        const changes = log.changes as any
        const hasItemChanges = changes?.item_changes
        
        return (
          <div key={log.id} className="border rounded p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {log.action === 'created' ? 'Tạo đơn hàng' : 'Cập nhật đơn hàng'}
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
              <div className="space-y-3">
                
                {changes?.summary && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-sm mb-2">Tóm tắt:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Số sản phẩm trước:</span>{' '}
                        <span className="font-medium">{changes.summary.total_items_before}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Số sản phẩm sau:</span>{' '}
                        <span className="font-medium">{changes.summary.total_items_after}</span>
                      </div>
                      {changes.summary.items_added > 0 && (
                        <div className="text-green-700">
                          <span className="text-muted-foreground">Đã thêm:</span>{' '}
                          <span className="font-medium">{changes.summary.items_added}</span>
                        </div>
                      )}
                      {changes.summary.items_removed > 0 && (
                        <div className="text-red-700">
                          <span className="text-muted-foreground">Đã xóa:</span>{' '}
                          <span className="font-medium">{changes.summary.items_removed}</span>
                        </div>
                      )}
                      {changes.summary.items_modified > 0 && (
                        <div className="text-orange-700">
                          <span className="text-muted-foreground">Đã sửa:</span>{' '}
                          <span className="font-medium">{changes.summary.items_modified}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                
                {(changes?.old?.subtotal !== changes?.new?.subtotal ||
                  changes?.old?.payment_method !== changes?.new?.payment_method) && (
                  <div>
                    <p className="font-medium text-sm mb-2">Thông tin đơn hàng:</p>
                    <div className="bg-slate-50 p-3 rounded space-y-1 text-sm">
                      {changes?.old?.subtotal !== changes?.new?.subtotal && (
                        <div>
                          <span className="text-muted-foreground">Tổng tiền:</span>{' '}
                          <span className="line-through text-red-600">{formatCurrency(changes.old.subtotal)}</span>
                          {' → '}
                          <span className="font-medium text-green-600">{formatCurrency(changes.new.subtotal)}</span>
                        </div>
                      )}
                      {changes?.old?.payment_method !== changes?.new?.payment_method && (
                        <div>
                          <span className="text-muted-foreground">Thanh toán:</span>{' '}
                          <span className="line-through text-red-600">{getPaymentMethodLabel(changes.old.payment_method)}</span>
                          {' → '}
                          <span className="font-medium text-green-600">{getPaymentMethodLabel(changes.new.payment_method)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                
                {hasItemChanges && (
                  <div className="space-y-2">
                    
                    {changes.item_changes.added?.length > 0 && (
                      <div>
                        <p className="font-medium text-sm text-green-700 mb-1">Sản phẩm được thêm:</p>
                        <div className="bg-green-50 p-2 rounded space-y-1">
                          
                          {changes.item_changes.added.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm flex justify-between">
                              <span>
                                <span className="font-mono text-xs text-muted-foreground">{item.product_sku}</span>
                                {' - '}
                                <span className="font-medium">{item.product_name}</span>
                              </span>
                              <span>
                                <span className="font-medium">{item.quantity}x</span>
                                {' @ '}
                                <span>{formatCurrency(item.unit_price)}</span>
                                {' = '}
                                <span className="font-semibold">{formatCurrency(item.total)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    
                    {changes.item_changes.removed?.length > 0 && (
                      <div>
                        <p className="font-medium text-sm text-red-700 mb-1">Sản phẩm đã xóa:</p>
                        <div className="bg-red-50 p-2 rounded space-y-1">
                          
                          {changes.item_changes.removed.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm flex justify-between">
                              <span>
                                <span className="font-mono text-xs text-muted-foreground">{item.product_sku}</span>
                                {' - '}
                                <span className="font-medium">{item.product_name}</span>
                              </span>
                              <span>
                                <span className="font-medium">{item.quantity}x</span>
                                {' @ '}
                                <span>{formatCurrency(item.unit_price)}</span>
                                {' = '}
                                <span className="font-semibold">{formatCurrency(item.total)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    
                    {changes.item_changes.modified?.length > 0 && (
                      <div>
                        <p className="font-medium text-sm text-orange-700 mb-1">Sản phẩm đã sửa:</p>
                        <div className="bg-orange-50 p-2 rounded space-y-2">
                          
                          {changes.item_changes.modified.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm space-y-1 border-b border-orange-200 pb-2 last:border-0">
                              <div className="font-medium">
                                <span className="font-mono text-xs text-muted-foreground">{item.product_sku}</span>
                                {' - '}
                                {item.product_name}
                              </div>
                              {item.old_quantity !== item.new_quantity && (
                                <div className="pl-2">
                                  <span className="text-muted-foreground">Số lượng:</span>{' '}
                                  <span className="line-through text-red-600">{item.old_quantity}</span>
                                  {' → '}
                                  <span className="font-medium text-green-600">{item.new_quantity}</span>
                                </div>
                              )}
                              {item.old_unit_price !== item.new_unit_price && (
                                <div className="pl-2">
                                  <span className="text-muted-foreground">Đơn giá:</span>{' '}
                                  <span className="line-through text-red-600">{formatCurrency(item.old_unit_price)}</span>
                                  {' → '}
                                  <span className="font-medium text-green-600">{formatCurrency(item.new_unit_price)}</span>
                                </div>
                              )}
                              <div className="pl-2">
                                <span className="text-muted-foreground">Thành tiền:</span>{' '}
                                <span className="line-through text-red-600">{formatCurrency(item.old_total)}</span>
                                {' → '}
                                <span className="font-medium text-green-600">{formatCurrency(item.new_total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                
                {!hasItemChanges && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Chi tiết thay đổi:</p>
                    <pre className="bg-slate-50 p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(log.changes, null, 2)}
                    </pre>
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
