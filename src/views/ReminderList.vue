<template>
  <div class="reminder-list">
    <el-card shadow="never">
      <div class="page-header">
        <h3>应收催款提醒</h3>
        <el-button type="primary" @click="exportReminders"><el-icon><Download /></el-icon>导出催款清单</el-button>
      </div>
      <el-table :data="reminderList" stripe border style="width: 100%">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="customerName" label="客户姓名" width="100" />
        <el-table-column prop="customerPhone" label="联系电话" width="130" />
        <el-table-column prop="roomLabel" label="房号" width="140" />
        <el-table-column prop="planName" label="款项名称" width="100" />
        <el-table-column prop="amount" label="待收金额" width="120" align="right">
          <template #default="{ row }">¥ {{ row.amount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="dueDate" label="截止日期" width="110" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isOverdue ? 'danger' : 'warning'" size="small">
              {{ row.isOverdue ? `逾期${row.overdueDays}天` : `${row.daysLeft}天后到期` }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesConsultant" label="销售顾问" width="100" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="goLedger(row.roomId)">查看台账</el-button>
            <el-button size="small" link type="success" @click="markPaid(row)">确认收款</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useProjectStore } from '@/stores/project'
import { useReceiptStore } from '@/stores/receipt'
import { exportToExcel } from '@/utils/export'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'

const customerStore = useCustomerStore()
const projectStore = useProjectStore()
const receiptStore = useReceiptStore()
const router = useRouter()

const reminderList = computed(() => {
  const now = dayjs()
  return customerStore.paymentPlans
    .filter(p => !p.paid)
    .map(p => {
      const customer = customerStore.getCustomerById(p.customerId)
      const room = customer ? projectStore.rooms.find(r => r.id === customer.roomId) : null
      const dueDate = dayjs(p.dueDate)
      const diff = dueDate.diff(now, 'day')
      return {
        customerId: p.customerId,
        planId: p.id,
        customerName: customer?.name || '未知',
        customerPhone: customer?.phone || '-',
        roomLabel: room ? `${room.buildingName}-${room.unitName}-${room.roomNumber}` : '-',
        roomId: room?.id || '',
        planName: p.name,
        amount: p.amount,
        dueDate: p.dueDate,
        isOverdue: diff < 0,
        overdueDays: diff < 0 ? Math.abs(diff) : 0,
        daysLeft: diff >= 0 ? diff : 0,
        salesConsultant: customer?.salesConsultant || '-'
      }
    })
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return a.dueDate.localeCompare(b.dueDate)
    })
})

function goLedger(roomId: string) { router.push(`/ledger/${roomId}`) }

async function markPaid(row: any) {
  await ElMessageBox.confirm(`确认"${row.customerName}"的"${row.planName}"已收款？`, '确认', { type: 'success' })
  await customerStore.markPlanPaid(row.planId)
  ElMessage.success('已确认收款')
}

function exportReminders() {
  const data = {
    '催款清单': reminderList.value.map(r => ({
      客户姓名: r.customerName, 联系电话: r.customerPhone, 房号: r.roomLabel,
      款项名称: r.planName, 待收金额: r.amount, 截止日期: r.dueDate,
      状态: r.isOverdue ? `逾期${r.overdueDays}天` : `${r.daysLeft}天后到期`,
      销售顾问: r.salesConsultant
    }))
  }
  exportToExcel(data, `催款清单_${dayjs().format('YYYY-MM-DD')}`)
  ElMessage.success('催款清单已导出')
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 18px; color: #2c3e50; }
</style>
