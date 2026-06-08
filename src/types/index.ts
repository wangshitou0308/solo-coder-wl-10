export type RoomStatus = 'available' | 'reserved' | 'contracted' | 'settled'
export type PaymentType = 'deposit' | 'downpayment' | 'installment' | 'balance' | 'agency_fee'
export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'wechat' | 'alipay'
export type UserRole = 'manager' | 'finance' | 'sales'
export type ReceiptStatus = 'active' | 'voided'

export const RoomStatusMap: Record<RoomStatus, string> = {
  available: '在售',
  reserved: '已定',
  contracted: '已签约',
  settled: '已结清'
}

export const PaymentTypeMap: Record<PaymentType, string> = {
  deposit: '定金',
  downpayment: '首付款',
  installment: '分期款',
  balance: '尾款',
  agency_fee: '代收费'
}

export const PaymentMethodMap: Record<PaymentMethod, string> = {
  cash: '现金',
  transfer: '转账',
  pos: 'POS机',
  wechat: '微信',
  alipay: '支付宝'
}

export const UserRoleMap: Record<UserRole, string> = {
  manager: '经理',
  finance: '财务',
  sales: '销售顾问'
}

export interface Project {
  id: string
  name: string
  abbreviation: string
  address: string
  deliveryStandard: string
  createdAt: string
  updatedAt: string
}

export interface Building {
  id: string
  projectId: string
  name: string
  sortOrder: number
}

export interface Unit {
  id: string
  projectId: string
  buildingId: string
  name: string
  sortOrder: number
}

export interface Room {
  id: string
  projectId: string
  buildingId: string
  unitId: string
  roomNumber: string
  buildingName: string
  unitName: string
  floor: number
  layout: string
  area: number
  orientation: string
  unitPrice: number
  totalPrice: number
  deliveryStandard: string
  status: RoomStatus
}

export interface Customer {
  id: string
  name: string
  idCard: string
  phone: string
  address: string
  roomId: string
  projectId: string
  subscriptionDate: string
  contractDate: string
  salesConsultant: string
  createdAt: string
  updatedAt: string
}

export type PaymentPlanStatus = 'unpaid' | 'partial' | 'paid'

export interface PaymentPlan {
  id: string
  customerId: string
  name: string
  amount: number
  paidAmount: number
  dueDate: string
  paid: boolean
  status?: PaymentPlanStatus
}

export interface Receipt {
  id: string
  receiptNumber: string
  projectId: string
  roomId: string
  customerId: string
  paymentPlanId?: string
  paymentUnit: string
  paymentReason: string
  paymentType: PaymentType
  paymentMethod: PaymentMethod
  amount: number
  amountInWords: string
  paymentDate: string
  issuer: string
  status: ReceiptStatus
  voidReason?: string
  voidedBy?: string
  voidedAt?: string
  printCount?: number
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  username: string
  password: string
  realName: string
  role: UserRole
  disabled?: boolean
}

export interface OperationLog {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  targetType: string
  targetId: string
  details: string
  amountChange?: number
  timestamp: string
}
