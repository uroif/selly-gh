'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { InboundShipmentWithSupplier, Supplier, Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InboundShipmentDetailsDialog } from './InboundShipmentDetailsDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { Eye, Package, Search, X, ChevronDown, Trash2 } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { Pagination } from '@/components/ui/pagination'
import { vietnameseMatch } from '@/lib/vietnameseSearch'

interface ShipmentWithProductCount extends InboundShipmentWithSupplier {
  product_count?: number
  total_quantity?: number
  product_logs?: Array<{ products: Product | null }>
}

export function PartnerInboundTab() {
  const [shipments, setShipments] = useState<ShipmentWithProductCount[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<InboundShipmentWithSupplier | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [shipmentToDelete, setShipmentToDelete] = useState<InboundShipmentWithSupplier | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supplierDropdownRef = useRef<HTMLDivElement>(null)
  
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date())
  })
  
  const supabase = createClient()
  const hasFetched = useRef(false)

  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching suppliers:', error)
    } else {
      setSuppliers(data || [])
    }
  }, [supabase])

  const fetchShipments = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('inbound_shipments')
      .select('*, suppliers(*)')
      .gte('inbound_date', format(dateRange.from, 'yyyy-MM-dd'))
      .lte('inbound_date', format(dateRange.to, 'yyyy-MM-dd'))
      .is('deleted_at', null)
      .order('inbound_date', { ascending: false })

    if (error) {
      console.error('Error fetching shipments:', error)
      setLoading(false)
      return
    }

    
    const filtered = (data as InboundShipmentWithSupplier[]).filter(
      (shipment) => shipment.supplier_id !== null
    )

    
    const shipmentsWithCounts = await Promise.all(
      filtered.map(async (shipment) => {
        const { data: logs, error: logsError } = await supabase
          .from('inventory_logs')
          .select('*, products(*)')
          .eq('inbound_shipment_id', shipment.id)

        if (logsError) {
          console.error('Error fetching product count:', logsError)
          return { ...shipment, product_count: 0, total_quantity: 0, product_logs: [] }
        }

        const totalQuantity = logs?.reduce((sum, log) => {
          return sum + (log.quantity_change || 0)
        }, 0) || 0

        return { 
          ...shipment, 
          product_count: logs?.length || 0,
          total_quantity: totalQuantity,
          product_logs: logs
        }
      })
    )

    setShipments(shipmentsWithCounts)
    setLoading(false)
  }, [dateRange, supabase])

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchSuppliers()
      fetchShipments()
    }
  }, [fetchSuppliers, fetchShipments])

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  
  useEffect(() => {
    if (hasFetched.current) {
      fetchShipments()
    }
  }, [fetchShipments])

  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: startOfDay(subDays(new Date(), days - 1)),
      to: endOfDay(new Date())
    })
  }

  const handleFromDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: startOfDay(date),
        to: prev.to
      }))
    }
  }

  const handleToDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: prev.from,
        to: endOfDay(date)
      }))
    }
  }

  const handleViewDetails = (shipment: InboundShipmentWithSupplier) => {
    setSelectedShipment(shipment)
    setIsDetailsDialogOpen(true)
  }

  const handleDeleteClick = (shipment: InboundShipmentWithSupplier) => {
    setShipmentToDelete(shipment)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!shipmentToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc('soft_delete_inbound_shipment', {
        shipment_id: shipmentToDelete.id
      })

      if (error) {
        console.error('Error deleting shipment:', error)
        alert('Có lỗi xảy ra khi xóa lô hàng. Vui lòng thử lại.')
      } else {
        
        fetchShipments()
        setDeleteConfirmOpen(false)
        setShipmentToDelete(null)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('Có lỗi xảy ra khi xóa lô hàng. Vui lòng thử lại.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  
  const filteredShipments = shipments.filter(shipment => {
    
    if (selectedSuppliers.length > 0) {
      if (!shipment.supplier_id || !selectedSuppliers.includes(shipment.supplier_id)) {
        return false
      }
    }
    
    
    if (search.trim()) {
      const hasMatchingProduct = shipment.product_logs?.some(log => {
        const product = log.products
        if (!product) return false
        
        return (
          vietnameseMatch(product.sku || '', search) ||
          vietnameseMatch(product.name || '', search)
        )
      })
      
      return hasMatchingProduct
    }
    
    return true
  })

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => {
      if (prev.includes(supplierId)) {
        return prev.filter(id => id !== supplierId)
      } else {
        return [...prev, supplierId]
      }
    })
  }

  const clearSupplierFilter = () => {
    setSelectedSuppliers([])
  }

  
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex)

  
  useEffect(() => {
    setCurrentPage(1)
  }, [search, dateRange])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nhập hàng đối tác
          </CardTitle>
        </CardHeader>
        <CardContent>
          
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap items-end">
              
              <div className="w-[200px]">
                <Label className="text-xs">Tìm sản phẩm</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="SKU / Tên..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              
              <div className="w-[180px]" ref={supplierDropdownRef}>
                <Label className="text-xs">Nhà cung cấp</Label>
                <div className="relative mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-9 justify-between text-left font-normal text-sm px-3"
                    onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                  >
                    <span className="truncate">
                      {selectedSuppliers.length === 0
                        ? 'Tất cả'
                        : `${selectedSuppliers.length} đã chọn`}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0 ml-1" />
                  </Button>
                  
                  {showSupplierDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                      {selectedSuppliers.length > 0 && (
                        <div className="p-2 border-b">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 h-8 text-xs"
                            onClick={clearSupplierFilter}
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Xóa bộ lọc
                          </Button>
                        </div>
                      )}
                      <div className="p-1">
                        {suppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => toggleSupplier(supplier.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSuppliers.includes(supplier.id)}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-gray-300"
                            />
                            <span className="text-sm">{supplier.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              
              
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium whitespace-nowrap">Từ:</label>
                <Input
                  type="date"
                  value={format(dateRange.from, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    if (!isNaN(date.getTime())) {
                      handleFromDateSelect(date)
                    }
                  }}
                  className="w-[130px] h-9 text-sm"
                />
              </div>

              
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium whitespace-nowrap">Đến:</label>
                <Input
                  type="date"
                  value={format(dateRange.to, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    if (!isNaN(date.getTime())) {
                      handleToDateSelect(date)
                    }
                  }}
                  min={format(dateRange.from, 'yyyy-MM-dd')}
                  className="w-[130px] h-9 text-sm"
                />
              </div>

              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(7)}
                className="h-9 px-3 text-sm"
              >
                7 ngày
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(30)}
                className="h-9 px-3 text-sm"
              >
                30 ngày
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(90)}
                className="h-9 px-3 text-sm"
              >
                90 ngày
              </Button>
            </div>
          </div>

          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'Không tìm thấy nhà cung cấp' : 'Chưa có lô hàng nhập từ đối tác trong khoảng thời gian này'}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày hóa đơn</TableHead>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead className="text-right">Tổng số sản phẩm</TableHead>
                    <TableHead className="text-right">Tổng số lượng nhập</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedShipments.map((shipment) => (
                    <TableRow key={shipment.id} className="hover:bg-muted/50">
                      <TableCell>
                        {format(new Date(shipment.inbound_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {shipment.suppliers?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {shipment.product_count || 0}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {(shipment.total_quantity || 0).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">
                        {formatCurrency(shipment.total_amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {shipment.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(shipment)}
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(shipment)}
                            title="Xóa lô hàng"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredShipments.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value)
                  setCurrentPage(1)
                }}
                itemLabel="lô hàng"
              />
            </div>
          )}
        </CardContent>
      </Card>

      
      <InboundShipmentDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        shipment={selectedShipment}
      />

      
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        productName={
          shipmentToDelete
            ? `lô hàng từ "${shipmentToDelete.suppliers?.name}" (${format(new Date(shipmentToDelete.inbound_date), 'dd/MM/yyyy')})`
            : ''
        }
      />
    </div>
  )
}
