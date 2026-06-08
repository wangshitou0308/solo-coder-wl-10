import * as XLSX from 'xlsx'
import type { Receipt, Room, Customer, Project } from '@/types'
import { PaymentTypeMap, PaymentMethodMap, RoomStatusMap } from '@/types'

export function exportToExcel(data: Record<string, any[]>, fileName: string) {
  const wb = XLSX.utils.book_new()
  for (const [sheetName, rows] of Object.entries(data)) {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export function exportAllData(
  projects: Project[],
  rooms: Room[],
  customers: Customer[],
  receipts: Receipt[]
) {
  const data: Record<string, any[]> = {}

  data['楼盘项目'] = projects.map(p => ({
    楼盘名称: p.name,
    缩写: p.abbreviation,
    地址: p.address,
    交付标准: p.deliveryStandard,
    创建时间: p.createdAt
  }))

  data['房源信息'] = rooms.map(r => ({
    房号: r.roomNumber,
    楼栋: r.buildingName,
    单元: r.unitName,
    楼层: r.floor,
    户型: r.layout,
    面积: r.area,
    朝向: r.orientation,
    单价: r.unitPrice,
    总价: r.totalPrice,
    状态: RoomStatusMap[r.status]
  }))

  data['客户信息'] = customers.map(c => ({
    姓名: c.name,
    身份证号: c.idCard,
    联系电话: c.phone,
    通讯地址: c.address,
    认购日期: c.subscriptionDate,
    签约日期: c.contractDate,
    销售顾问: c.salesConsultant
  }))

  data['收据记录'] = receipts.map(r => ({
    收据编号: r.receiptNumber,
    付款单位: r.paymentUnit,
    收款事由: r.paymentReason,
    收款类型: PaymentTypeMap[r.paymentType],
    收款方式: PaymentMethodMap[r.paymentMethod],
    金额: r.amount,
    收款日期: r.paymentDate,
    开票人: r.issuer,
    状态: r.status === 'active' ? '有效' : '已作废'
  }))

  exportToExcel(data, `房地产数据备份_${new Date().toISOString().slice(0, 10)}`)
}

export function exportReceiptsToExcel(receipts: Receipt[]) {
  const data = {
    '收据明细': receipts.map(r => ({
      收据编号: r.receiptNumber,
      付款单位: r.paymentUnit,
      收款事由: r.paymentReason,
      收款类型: PaymentTypeMap[r.paymentType],
      收款方式: PaymentMethodMap[r.paymentMethod],
      金额小写: r.amount,
      金额大写: r.amountInWords,
      收款日期: r.paymentDate,
      开票人: r.issuer,
      状态: r.status === 'active' ? '有效' : '已作废'
    }))
  }
  exportToExcel(data, `收据明细_${new Date().toISOString().slice(0, 10)}`)
}
