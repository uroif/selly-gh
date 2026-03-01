

import { createClient } from '@/lib/supabase/client'

export interface InvoiceSettings {
  id?: string
  
  storeName: string
  invoiceTitle: string
  storeAddress: string
  storePhone: string
  
  
  showDateTime: boolean
  dateTimeFormat: 'vi-VN' | 'en-US'
  
  
  fontSize: number 
  fontFamily: 'Roboto' | 'Noto Sans' | 'Courier New' | 'Arial' | 'Times New Roman'
  textAlign: 'left' | 'center' | 'right'
  paperWidth: number 
  
  
  storeNameFontSize: number 
  invoiceTitleFontSize: number 
  storeAddressFontSize: number 
  storePhoneFontSize: number 
  orderIdFontSize: number 
  
  
  thankYouMessage: string
  footerNote: string
  showBarcode: boolean
  
  
  showSKU: boolean
  showItemIndex: boolean
  showTotalQuantity: boolean 
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  
  storeName: 'CỬA HÀNG',
  invoiceTitle: 'HÓA ĐƠN BÁN HÀNG',
  storeAddress: '',
  storePhone: '',
  
  
  showDateTime: true,
  dateTimeFormat: 'vi-VN',
  
  
  fontSize: 13,
  fontFamily: 'Roboto',
  textAlign: 'center',
  paperWidth: 77,
  
  
  storeNameFontSize: 18,
  invoiceTitleFontSize: 16,
  storeAddressFontSize: 14,
  storePhoneFontSize: 14,
  orderIdFontSize: 12,
  
  
  thankYouMessage: 'Cảm ơn quý khách!',
  footerNote: 'Hẹn gặp lại',
  showBarcode: true,
  
  
  showSKU: true,
  showItemIndex: true,
  showTotalQuantity: true,
}



function dbToSettings(dbRow: any): InvoiceSettings {
  return {
    id: dbRow.id,
    storeName: dbRow.store_name || DEFAULT_SETTINGS.storeName,
    invoiceTitle: dbRow.invoice_title || DEFAULT_SETTINGS.invoiceTitle,
    storeAddress: dbRow.store_address || DEFAULT_SETTINGS.storeAddress,
    storePhone: dbRow.store_phone || DEFAULT_SETTINGS.storePhone,
    showDateTime: dbRow.show_date_time ?? DEFAULT_SETTINGS.showDateTime,
    dateTimeFormat: dbRow.date_time_format || DEFAULT_SETTINGS.dateTimeFormat,
    fontSize: dbRow.font_size || DEFAULT_SETTINGS.fontSize,
    fontFamily: dbRow.font_family || DEFAULT_SETTINGS.fontFamily,
    textAlign: dbRow.text_align || DEFAULT_SETTINGS.textAlign,
    paperWidth: dbRow.paper_width || DEFAULT_SETTINGS.paperWidth,
    storeNameFontSize: dbRow.store_name_font_size || DEFAULT_SETTINGS.storeNameFontSize,
    invoiceTitleFontSize: dbRow.invoice_title_font_size || DEFAULT_SETTINGS.invoiceTitleFontSize,
    storeAddressFontSize: dbRow.store_address_font_size || DEFAULT_SETTINGS.storeAddressFontSize,
    storePhoneFontSize: dbRow.store_phone_font_size || DEFAULT_SETTINGS.storePhoneFontSize,
    orderIdFontSize: dbRow.order_id_font_size || DEFAULT_SETTINGS.orderIdFontSize,
    thankYouMessage: dbRow.thank_you_message || DEFAULT_SETTINGS.thankYouMessage,
    footerNote: dbRow.footer_note || DEFAULT_SETTINGS.footerNote,
    showBarcode: dbRow.show_barcode ?? DEFAULT_SETTINGS.showBarcode,
    showSKU: dbRow.show_sku ?? DEFAULT_SETTINGS.showSKU,
    showItemIndex: dbRow.show_item_index ?? DEFAULT_SETTINGS.showItemIndex,
    showTotalQuantity: dbRow.show_total_quantity ?? DEFAULT_SETTINGS.showTotalQuantity,
  }
}



function settingsToDb(settings: InvoiceSettings): any {
  return {
    store_name: settings.storeName,
    invoice_title: settings.invoiceTitle,
    store_address: settings.storeAddress,
    store_phone: settings.storePhone,
    show_date_time: settings.showDateTime,
    date_time_format: settings.dateTimeFormat,
    font_size: settings.fontSize,
    font_family: settings.fontFamily,
    text_align: settings.textAlign,
    paper_width: settings.paperWidth,
    store_name_font_size: settings.storeNameFontSize,
    invoice_title_font_size: settings.invoiceTitleFontSize,
    store_address_font_size: settings.storeAddressFontSize,
    store_phone_font_size: settings.storePhoneFontSize,
    order_id_font_size: settings.orderIdFontSize,
    thank_you_message: settings.thankYouMessage,
    footer_note: settings.footerNote,
    show_barcode: settings.showBarcode,
    show_sku: settings.showSKU,
    show_item_index: settings.showItemIndex,
    show_total_quantity: settings.showTotalQuantity,
  }
}


export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .limit(1)
      .single()
    
    if (error) {
      console.error('[InvoiceSettings] Error reading from database:', error)
      
      return DEFAULT_SETTINGS
    }
    
    if (data) {
      return dbToSettings(data)
    }
    
    return DEFAULT_SETTINGS
  } catch (error) {
    console.error('[InvoiceSettings] Unexpected error:', error)
    return DEFAULT_SETTINGS
  }
}


export async function saveInvoiceSettings(settings: InvoiceSettings): Promise<void> {
  try {
    const supabase = createClient()
    const dbData = settingsToDb(settings)
    
    
    const { data: existing } = await supabase
      .from('invoice_settings')
      .select('id')
      .limit(1)
      .single()
    
    if (existing) {
      
      const { error } = await supabase
        .from('invoice_settings')
        .update(dbData)
        .eq('id', existing.id)
      
      if (error) {
        console.error('[InvoiceSettings] Error updating settings:', error)
        throw new Error('Không thể lưu cài đặt. Vui lòng thử lại.')
      }
    } else {
      
      const { error } = await supabase
        .from('invoice_settings')
        .insert(dbData)
      
      if (error) {
        console.error('[InvoiceSettings] Error inserting settings:', error)
        throw new Error('Không thể lưu cài đặt. Vui lòng thử lại.')
      }
    }
  } catch (error) {
    console.error('[InvoiceSettings] Error saving settings:', error)
    throw error
  }
}


export async function resetInvoiceSettings(): Promise<void> {
  try {
    const supabase = createClient()
    const dbData = settingsToDb(DEFAULT_SETTINGS)
    
    
    const { data: existing } = await supabase
      .from('invoice_settings')
      .select('id')
      .limit(1)
      .single()
    
    if (existing) {
      
      const { error } = await supabase
        .from('invoice_settings')
        .update(dbData)
        .eq('id', existing.id)
      
      if (error) {
        console.error('[InvoiceSettings] Error resetting settings:', error)
        throw new Error('Không thể đặt lại cài đặt. Vui lòng thử lại.')
      }
    }
  } catch (error) {
    console.error('[InvoiceSettings] Error resetting settings:', error)
    throw error
  }
}


export function getDefaultInvoiceSettings(): InvoiceSettings {
  return { ...DEFAULT_SETTINGS }
}
