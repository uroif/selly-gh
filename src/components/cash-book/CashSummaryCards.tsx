'use client'

import { DailyCashSummary } from '@/types'
import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react'

interface CashSummaryCardsProps {
  summary: DailyCashSummary
  formatCurrency: (amount: number) => string
  onRefreshOpeningBalance?: () => void
  refreshLoading?: boolean
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  amount: string
  bgColor: string
  borderColor: string
  iconColor: string
  textColor: string
  onRefresh?: () => void
  refreshLoading?: boolean
}

function StatCard({
  icon,
  title,
  amount,
  bgColor,
  borderColor,
  iconColor,
  textColor,
  onRefresh,
  refreshLoading,
}: StatCardProps) {
  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 transition-transform hover:scale-105`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor} aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshLoading}
            className={`ml-auto p-1 rounded hover:bg-gray-200 transition-colors ${refreshLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Tính lại số dư đầu ngày từ số dư cuối ngày hôm trước"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-600 ${refreshLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>
        {amount}
      </div>
    </div>
  )
}

export function CashSummaryCards({
  summary,
  formatCurrency,
  onRefreshOpeningBalance,
  refreshLoading
}: CashSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      
      <StatCard
        icon={<Wallet className="h-5 w-5" />}
        title="Số dư đầu ngày"
        amount={formatCurrency(summary.opening_balance)}
        bgColor="bg-blue-50"
        borderColor="border-blue-200"
        iconColor="text-blue-600"
        textColor="text-blue-900"
        onRefresh={onRefreshOpeningBalance}
        refreshLoading={refreshLoading}
      />
      
      
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        title="Thu TM bán hàng"
        amount={formatCurrency(summary.cash_sales)}
        bgColor="bg-green-50"
        borderColor="border-green-200"
        iconColor="text-green-600"
        textColor="text-green-900"
      />
      
      
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Thu khác"
        amount={formatCurrency(summary.other_income)}
        bgColor="bg-yellow-50"
        borderColor="border-yellow-200"
        iconColor="text-yellow-600"
        textColor="text-yellow-900"
      />
      
      
      <StatCard
        icon={<TrendingDown className="h-5 w-5" />}
        title="Chi khác"
        amount={formatCurrency(summary.total_expenses)}
        bgColor="bg-red-50"
        borderColor="border-red-200"
        iconColor="text-red-600"
        textColor="text-red-900"
      />
      
      
      <StatCard
        icon={<PiggyBank className="h-5 w-5" />}
        title="Số dư cuối ngày"
        amount={formatCurrency(summary.closing_balance)}
        bgColor="bg-purple-50"
        borderColor="border-purple-200"
        iconColor="text-purple-600"
        textColor="text-purple-900"
      />
    </div>
  )
}
