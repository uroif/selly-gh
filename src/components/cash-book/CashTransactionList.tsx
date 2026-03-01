'use client'

import { CashTransactionWithUser, UserRole } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CashTransactionListProps {
  transactions: CashTransactionWithUser[]
  formatCurrency: (amount: number) => string
  formatDateTime: (dateString: string) => string
  onDelete: (id: string) => Promise<void>
  userRole: UserRole
}

export function CashTransactionList({
  transactions,
  formatCurrency,
  formatDateTime,
}: CashTransactionListProps) {

  const getTypeLabel = (type: string) => {
    return type === 'income' ? 'Thu' : 'Chi'
  }

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  
  
  
  
  
  
  
  
  
  

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có giao dịch nào trong ngày này
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Thời gian</TableHead>
            <TableHead className="w-[80px]">Loại</TableHead>
            <TableHead className="w-[120px]">Người tạo</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead className="text-right w-[140px]">Số tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-mono text-xs">
                {formatDateTime(transaction.created_at)}
              </TableCell>
              <TableCell>
                <span className={`font-medium ${getTypeColor(transaction.transaction_type)}`}>
                  {getTypeLabel(transaction.transaction_type)}
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {transaction.creator_username ||
                 transaction.profiles?.username ||
                 'N/A'}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  {transaction.notes && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {transaction.notes}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className={`text-right font-semibold ${getTypeColor(transaction.transaction_type)}`}>
                {transaction.transaction_type === 'expense' && '-'}
                {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
