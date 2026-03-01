
export type UserRole = 'owner' | 'staff'


export interface Profile {
  id: string
  username: string
  role: UserRole
  created_at: string
}


export interface Product {
  id: string
  sku: string
  name: string
  price: number
  cost_price: number
  image_url: string | null
  unit: string | null
  created_at: string
  deleted_at: string | null
}


export interface InventoryItem {
  id: string
  product_id: string
  quantity: number
}


export type InventoryLogType = 'inbound' | 'adjustment'


export interface InventoryLog {
  id: string
  product_id: string
  type: InventoryLogType
  quantity_change: number
  notes: string | null
  created_at: string
  inbound_shipment_id?: string | null
  deleted_at?: string | null
}


export interface Supplier {
  id: string
  name: string
  contact_info: string | null
  created_at: string
  updated_at: string | null
}


export interface InboundShipment {
  id: string
  supplier_id: string | null
  inbound_date: string 
  total_amount: number
  notes: string | null
  created_by: string
  created_at: string
  deleted_at?: string | null
}


export interface InboundShipmentWithSupplier extends InboundShipment {
  suppliers: Supplier | null
}


export interface BatchInboundItem {
  tempId: string 
  product?: ProductWithInventory | null
  sku: string
  name: string
  unit: string
  costPrice: string
  sellPrice: string
  quantity: string
  isNewProduct: boolean
}


export type PaymentMethod = 'cash' | 'card' | 'transfer'


export type OrderStatus = 'completed'


export interface Order {
  id: string
  subtotal: number
  final_amount: number
  payment_method: PaymentMethod
  status: OrderStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_by?: string
  updated_at?: string
  deleted_at?: string | null
  force_delete_at?: string | null
}


export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  cost_price: number
}


export interface CartItem {
  product_id: string
  product: Product
  quantity: number
  unit_price: number
  cost_price: number
}


export interface SessionUser {
  id: string
  username: string
  role: UserRole
}


export interface ProductWithInventory extends Product {
  inventory_items: InventoryItem | null
}


export interface InventoryLogWithProduct extends InventoryLog {
  products: Product | null
}


export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}


export type OrderAuditAction = 'created' | 'updated'


export interface OrderAuditLog {
  id: string
  order_id: string
  action: OrderAuditAction
  changed_by: string
  changed_at: string
  
  changes: Record<string, any> | null
  notes: string | null
}


export interface OrderAuditLogWithUser extends OrderAuditLog {
  changer_username?: string
}






export type CashTransactionType = 'income' | 'expense'


export type CashTransactionCategory =
  | 'other_income'      
  | 'operating_expense' 
  | 'purchase'          
  | 'salary'            
  | 'other_expense'     


export interface CashTransaction {
  id: string
  transaction_date: string 
  transaction_type: CashTransactionType
  amount: number
  category: CashTransactionCategory
  description: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string | null
}


export interface DailyCashBalance {
  id: string
  balance_date: string 
  opening_balance: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string | null
}


export interface DailyCashSummary {
  opening_balance: number
  cash_sales: number
  other_income: number
  total_expenses: number
  closing_balance: number
}


export interface CashTransactionWithUser extends CashTransaction {
  creator_username?: string
  profiles?: {
    username: string
  }
}


export type CashTransactionAuditAction = 'created' | 'updated' | 'deleted'


export interface CashTransactionAuditLog {
  id: string
  cash_transaction_id: string
  action: CashTransactionAuditAction
  changed_by: string
  changed_at: string
  
  changes: Record<string, any> | null
  notes: string | null
}


export interface CashTransactionAuditLogWithUser extends CashTransactionAuditLog {
  changer_username?: string
}
