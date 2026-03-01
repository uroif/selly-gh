
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { DraftOrder } from '@/lib/draftOrderStorage'
import { formatCurrency } from '../utils/posHelpers'

interface POSDraftsListProps {
  draftOrders: DraftOrder[]
  currentDraftId: string | null
  onLoadDraft: (draft: DraftOrder) => void
  onDeleteDraft: (draftId: string) => void
  onNewOrder: () => void
}

export function POSDraftsList({
  draftOrders,
  currentDraftId,
  onLoadDraft,
  onDeleteDraft,
  onNewOrder
}: POSDraftsListProps) {
  return (
    <div className="px-6 pt-4 pb-4 border-b bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Đơn nháp</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onNewOrder}
        >
          Đơn mới
        </Button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {draftOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Không có đơn nháp
          </p>
        ) : (
          draftOrders.map((draft) => (
            <div
              key={draft.id}
              className={`flex items-center justify-between p-3 bg-white border rounded cursor-pointer hover:bg-gray-50 ${
                currentDraftId === draft.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onLoadDraft(draft)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {draft.items.length} mặt hàng
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(draft.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(draft.updatedAt).toLocaleString('vi-VN')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteDraft(draft.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
