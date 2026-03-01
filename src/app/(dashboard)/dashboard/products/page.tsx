'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory, InventoryLogWithProduct } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { InboundDialog } from '@/components/products/InboundDialog'
import { EditProductDialog } from '@/components/products/EditProductDialog'
import { ProductHistoryDialog } from '@/components/products/ProductHistoryDialog'
import { ImportDialog } from '@/components/products/ImportDialog'
import { InboundReportTab } from '@/components/products/InboundReportTab'
import { PartnerInboundTab } from '@/components/products/PartnerInboundTab'
import { DeleteConfirmDialog } from '@/components/products/DeleteConfirmDialog'
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, History, Download, Upload, AlertCircle, Package } from 'lucide-react'
import { useAuth } from '@/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'

import * as XLSX from 'xlsx'
import { Pagination } from '@/components/ui/pagination'
import { ProductSummaryCards } from '@/components/products/ProductSummaryCards'
import { vietnameseFilter } from '@/lib/vietnameseSearch'
import { toast } from 'sonner'

type FilterType = 'all' | 'oversold' | 'out-of-stock' | 'low-stock'

export default function ProductsPage() {
  const { canManageProducts, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [logs, setLogs] = useState<InventoryLogWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showCostPrice, setShowCostPrice] = useState(false)
  const [isInboundDialogOpen, setIsInboundDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithInventory | null>(null)
  const [historyProduct, setHistoryProduct] = useState<ProductWithInventory | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductWithInventory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  
  const [productsCurrentPage, setProductsCurrentPage] = useState(1)
  const [productsPerPage, setProductsPerPage] = useState(10)
  const [logsCurrentPage, setLogsCurrentPage] = useState(1)
  const [logsPerPage, setLogsPerPage] = useState(10)
  
  const supabase = createClient()
  useAuth() 
  const hasFetched = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    
    
    
    const pageSize = 1000
    let allProducts: ProductWithInventory[] = []
    let page = 0
    let hasMore = true

    
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    console.log(`Total products in DB: ${totalCount || 0}`)

    
    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data: batch, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory_items (*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching products:', error)
        break
      }

      if (batch && batch.length > 0) {
        allProducts = [...allProducts, ...batch as ProductWithInventory[]]
        page++
        hasMore = batch.length === pageSize
        console.log(`Loaded batch ${page}: ${batch.length} products (Total so far: ${allProducts.length})`)
      } else {
        hasMore = false
      }
    }

    console.log(`✓ Loaded ALL ${allProducts.length} products (Total in DB: ${totalCount || 0})`)
    setProducts(allProducts)

    
    const { data: logsData, error: logsError } = await supabase
      .from('inventory_logs')
      .select(`*, products (*)`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (logsError) {
      console.error('Error fetching logs:', logsError)
    } else {
      setLogs(logsData as InventoryLogWithProduct[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    
    if (!permissionsLoading && !canManageProducts) {
      
      router.push('/dashboard/orders')
      return
    }

    if (!permissionsLoading && canManageProducts && !hasFetched.current) {
      hasFetched.current = true
      fetchData()
    }
  }, [fetchData, canManageProducts, permissionsLoading, router])


  function openDeleteDialog(product: ProductWithInventory) {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deletingProduct) return
    
    setIsDeleting(true)
    
    
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deletingProduct.id)
    
    if (error) {
      console.error('Error deleting product:', error)
      toast.error('Xóa sản phẩm thất bại')
    } else {
      
      setProducts(products.filter((p) => p.id !== deletingProduct.id))
      toast.success(`Đã xóa sản phẩm: ${deletingProduct.name}`)
      setIsDeleteDialogOpen(false)
      setDeletingProduct(null)
    }
    
    setIsDeleting(false)
  }

  const getFilteredProducts = () => {
    
    let filtered = search.trim()
      ? vietnameseFilter(products, search, (p) => [p.name, p.sku])
      : products

    if (filter === 'oversold') {
      filtered = filtered.filter((p) => (p.inventory_items?.quantity || 0) < 0)
    } else if (filter === 'out-of-stock') {
      filtered = filtered.filter((p) => (p.inventory_items?.quantity || 0) === 0)
    } else if (filter === 'low-stock') {
      filtered = filtered.filter((p) => {
        const qty = p.inventory_items?.quantity || 0
        return qty > 0 && qty <= 5
      })
    }

    return filtered
  }

  const filteredProducts = getFilteredProducts()
  
  
  const totalProductsPages = Math.ceil(filteredProducts.length / productsPerPage)
  const productsStartIndex = (productsCurrentPage - 1) * productsPerPage
  const productsEndIndex = productsStartIndex + productsPerPage
  const paginatedProducts = filteredProducts.slice(productsStartIndex, productsEndIndex)
  
  
  const totalLogsPages = Math.ceil(logs.length / logsPerPage)
  const logsStartIndex = (logsCurrentPage - 1) * logsPerPage
  const logsEndIndex = logsStartIndex + logsPerPage
  const paginatedLogs = logs.slice(logsStartIndex, logsEndIndex)
  
  
  useEffect(() => {
    setProductsCurrentPage(1)
  }, [search, filter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const calculateProfit = (sellingPrice: number, costPrice: number) => {
    return sellingPrice - costPrice
  }

  const calculateProfitPercent = (sellingPrice: number, costPrice: number) => {
    if (costPrice === 0) return 0
    return ((sellingPrice - costPrice) / costPrice) * 100
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExportToExcel = () => {
    
    const exportData = products.map(product => ({
      'sku': product.sku,
      'product_name': product.name,
      'unit': product.unit || '',
      'cost_price': product.cost_price,
      'sell_price': product.price,
      'inventory': product.inventory_items?.quantity || 0
    }))

    
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    
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

    
    const date = new Date().toISOString().split('T')[0]
    const filename = `danh-sach-san-pham-${date}.xlsx`

    
    XLSX.writeFile(workbook, filename)
  }

  
  if (permissionsLoading || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Nhập hàng</h1>
        <div className="text-center py-8 text-muted-foreground">Đang tải dữ liệu...</div>
      </div>
    )
  }

  
  if (!canManageProducts) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Nhập hàng</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-8 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6" />
            <p className="font-semibold text-lg">Không có quyền truy cập</p>
          </div>
          <p className="text-sm ml-9">
            Bạn không có quyền quản lý sản phẩm. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Nhập hàng</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Nhập Excel
          </Button>
          <Button variant="outline" onClick={handleExportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button onClick={() => router.push('/dashboard/products/batch-inbound')}>
            <Package className="h-4 w-4 mr-2" />
            Nhập lô hàng
          </Button>
          <Button onClick={() => setIsInboundDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nhập hàng
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Sản phẩm</TabsTrigger>
          <TabsTrigger value="inbound-report">Báo cáo nhập hàng</TabsTrigger>
          <TabsTrigger value="partner-inbound">Nhập hàng đối tác</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động gần đây</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductSummaryCards
            products={products}
            formatCurrency={formatCurrency}
          />
          
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm sản phẩm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    Tất cả
                  </Button>
                  <Button
                    variant={filter === 'low-stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('low-stock')}
                    className={filter === 'low-stock' ? 'bg-amber-600 hover:bg-amber-700' : 'text-amber-600 hover:text-amber-700'}
                  >
                    Sắp hết ({products.filter(p => {
                      const qty = p.inventory_items?.quantity || 0
                      return qty > 0 && qty <= 5
                    }).length})
                  </Button>
                  <Button
                    variant={filter === 'out-of-stock' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('out-of-stock')}
                    className={filter === 'out-of-stock' ? 'bg-orange-600 hover:bg-orange-700' : 'text-orange-600 hover:text-orange-700'}
                  >
                    Hết hàng ({products.filter(p => (p.inventory_items?.quantity || 0) === 0).length})
                  </Button>
                  <Button
                    variant={filter === 'oversold' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('oversold')}
                    className={filter === 'oversold' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 hover:text-red-700'}
                  >
                    Vượt tồn ({products.filter(p => (p.inventory_items?.quantity || 0) < 0).length})
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCostPrice(!showCostPrice)}
                  title={showCostPrice ? "Ẩn giá vốn & LN" : "Hiện giá vốn & LN"}
                >
                  {showCostPrice ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Đang tải sản phẩm...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search || filter !== 'all' ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm. Thêm sản phẩm đầu tiên của bạn!'}
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã hàng</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead className="text-right">Tồn kho</TableHead>
                        {showCostPrice && (
                          <TableHead className="text-right">Giá vốn</TableHead>
                        )}
                        <TableHead className="text-right">Giá bán</TableHead>
                        {showCostPrice && (
                          <>
                            <TableHead className="text-right">LN</TableHead>
                            <TableHead className="text-right">LN %</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => {
                        const currentQty = product.inventory_items?.quantity || 0

                        return (
                          <TableRow key={product.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono">{product.sku}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {product.unit || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${
                                  currentQty < 0
                                    ? 'text-red-700'
                                    : currentQty === 0
                                      ? 'text-orange-700'
                                      : currentQty <= 5
                                        ? 'text-amber-700'
                                        : ''
                                }`}
                              >
                                {currentQty}
                                {currentQty < 0 && ' ⚠️'}
                              </span>
                            </TableCell>
                            {showCostPrice && (
                              <TableCell className="text-right">
                                {formatCurrency(product.cost_price)}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              {formatCurrency(product.price)}
                            </TableCell>
                            {showCostPrice && (
                              <>
                                <TableCell className="text-right">
                                  <span className="font-semibold text-purple-600">
                                    {formatCurrency(calculateProfit(product.price, product.cost_price))}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-semibold text-purple-600">
                                    {formatPercent(calculateProfitPercent(product.price, product.cost_price))}
                                  </span>
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setHistoryProduct(product)
                                    setIsHistoryDialogOpen(true)
                                  }}
                                  title="Xem lịch sử"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product)
                                    setIsEditDialogOpen(true)
                                  }}
                                  title="Chỉnh sửa sản phẩm"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(product)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  
                  
                  <Pagination
                    currentPage={productsCurrentPage}
                    totalPages={totalProductsPages}
                    totalItems={filteredProducts.length}
                    itemsPerPage={productsPerPage}
                    onPageChange={setProductsCurrentPage}
                    onItemsPerPageChange={(value) => {
                      setProductsPerPage(value)
                      setProductsCurrentPage(1)
                    }}
                    itemLabel="sản phẩm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbound-report" className="mt-6">
          <InboundReportTab />
        </TabsContent>

        <TabsContent value="partner-inbound" className="mt-6">
          <PartnerInboundTab />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-muted-foreground">Chưa có hoạt động</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {paginatedLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between items-start border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="font-medium">{log.products?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.type === 'inbound' ? 'Đã thêm' : 'Đã điều chỉnh'}:
                            <span className={log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                              {' '}{log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                            </span>
                            {log.notes && ` - ${log.notes}`}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  
                  <Pagination
                    currentPage={logsCurrentPage}
                    totalPages={totalLogsPages}
                    totalItems={logs.length}
                    itemsPerPage={logsPerPage}
                    onPageChange={setLogsCurrentPage}
                    onItemsPerPageChange={(value) => {
                      setLogsPerPage(value)
                      setLogsCurrentPage(1)
                    }}
                    itemLabel="hoạt động"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      
      <InboundDialog
        open={isInboundDialogOpen}
        onOpenChange={setIsInboundDialogOpen}
        onSuccess={fetchData}
      />

      
      <EditProductDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        product={editingProduct}
        onSuccess={fetchData}
      />

      
      <ProductHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        product={historyProduct}
      />

      
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={fetchData}
      />

      
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        productName={deletingProduct?.name || ''}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
