


export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}


export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}


export function calculateDiscount(
  promotionType: 'percent' | 'amount',
  promotionValue: string,
  subtotal: number
): number {
  const promoVal = parseFloat(promotionValue) || 0
  
  if (promoVal <= 0) return 0
  
  if (promotionType === 'percent') {
    
    const percent = Math.min(promoVal, 100)
    return (subtotal * percent) / 100
  } else {
    
    return Math.min(promoVal, subtotal)
  }
}


export function getPaymentMethodLabel(method: 'cash' | 'card' | 'transfer'): string {
  const labels = {
    cash: 'Tiền mặt',
    card: 'Thẻ',
    transfer: 'Chuyển khoản'
  }
  return labels[method]
}
