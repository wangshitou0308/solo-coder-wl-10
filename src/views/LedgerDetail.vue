<template>
  <div class="ledger-detail">
    <el-page-header @back="router.back()">
      <template #content>
        <span style="font-size: 16px; font-weight: 600">
          收款台账 - {{ room?.buildingName }} {{ room?.unitName }} {{ room?.roomNumber }}
        </span>
      </template>
    </el-page-header>

    <el-row :gutter="20" style="margin-top: 16px">
      <el-col :span="8">
        <el-card shadow="never" class="summary-card">
          <el-statistic title="总应收金额" :value="totalReceivable" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="summary-card">
          <el-statistic title="累计已收金额" :value="totalReceived" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="summary-card">
          <el-statistic title="剩余应收金额" :value="remaining" prefix="¥" />
          <el-progress :percentage="totalReceivable > 0 ? Math.round(totalReceived / totalReceivable * 100) : 0" :stroke-width="8" style="margin-top: 8px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">收据明细</span>
          <div>
            <el-button type="primary" size="small" @click="exportPdf"><el-icon><Download /></el-icon>导出PDF</el-button>
            <el-button v-if="authStore.canManageReceipts" size="small" @click="goNewReceipt"><el-icon><Plus /></el-icon>开具收据</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
        <el-descriptions-item label="客户">{{ customer?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ customer?.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="房源状态">
          <el-tag v-if="room" :type="statusType" size="small">{{ RoomStatusMap[room.status] }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-table :data="activeReceipts" size="small" border stripe>
        <el-table-column prop="receiptNumber" label="收据编号" width="180" />
        <el-table-column prop="paymentReason" label="收款事由" min-width="140" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ PaymentTypeMap[row.paymentType] }}</template>
        </el-table-column>
        <el-table-column label="方式" width="70">
          <template #default="{ row }">{{ PaymentMethodMap[row.paymentMethod] }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="paymentDate" label="收款日期" width="110" />
        <el-table-column prop="issuer" label="开票人" width="80" />
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '有效' : '已作废' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useCustomerStore } from '@/stores/customer'
import { useReceiptStore } from '@/stores/receipt'
import { useAuthStore } from '@/stores/auth'
import type { RoomStatus } from '@/types'
import { RoomStatusMap, PaymentTypeMap, PaymentMethodMap } from '@/types'
import { ElMessage } from 'element-plus'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const customerStore = useCustomerStore()
const receiptStore = useReceiptStore()
const authStore = useAuthStore()
const roomId = route.params.roomId as string

const room = computed(() => projectStore.rooms.find(r => r.id === roomId))
const customer = computed(() => customerStore.customers.find(c => c.roomId === roomId))
const activeReceipts = computed(() => receiptStore.getActiveReceiptsByRoom(roomId))

const totalReceivable = computed(() => room.value?.totalPrice || 0)
const totalReceived = computed(() => activeReceipts.value.reduce((s, r) => s + r.amount, 0))
const remaining = computed(() => Math.max(0, totalReceivable.value - totalReceived.value))

const statusType = computed(() => {
  if (!room.value) return 'info'
  const m: Record<RoomStatus, string> = { available: 'info', reserved: 'warning', contracted: '', settled: 'success' }
  return m[room.value.status]
})

function goNewReceipt() { router.push('/receipts/new') }

async function exportPdf() {
  const el = document.querySelector('.ledger-detail') as HTMLElement
  if (!el) return
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 190
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
    const fileName = `收款台账_${room.value?.buildingName || ''}_${room.value?.roomNumber || ''}.pdf`
    pdf.save(fileName)
    ElMessage.success('PDF已导出')
  } catch (e) {
    ElMessage.error('PDF导出失败')
  }
}

onMounted(() => {
  if (!room.value) router.back()
})
</script>

<style scoped>
.summary-card { text-align: center; }
</style>
