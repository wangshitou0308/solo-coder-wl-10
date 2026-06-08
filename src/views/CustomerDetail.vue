<template>
  <div class="customer-detail">
    <el-page-header @back="router.push('/customers')">
      <template #content><span style="font-size: 16px; font-weight: 600">客户详情</span></template>
    </el-page-header>
    <el-row :gutter="20" style="margin-top: 16px">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header><span style="font-weight: 600">基本信息</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="客户姓名">{{ customer?.name }}</el-descriptions-item>
            <el-descriptions-item label="身份证号">{{ customer?.idCard }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ customer?.phone }}</el-descriptions-item>
            <el-descriptions-item label="通讯地址" :span="2">{{ customer?.address }}</el-descriptions-item>
            <el-descriptions-item label="楼盘">{{ projectStore.getProjectById(customer?.projectId || '')?.name }}</el-descriptions-item>
            <el-descriptions-item label="房号">{{ getRoomLabel() }}</el-descriptions-item>
            <el-descriptions-item label="认购日期">{{ customer?.subscriptionDate }}</el-descriptions-item>
            <el-descriptions-item label="签约日期">{{ customer?.contractDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="销售顾问">{{ customer?.salesConsultant }}</el-descriptions-item>
            <el-descriptions-item label="房源状态">
              <el-tag v-if="room" :type="statusTagType(room.status)" size="small">{{ RoomStatusMap[room.status] }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span style="font-weight: 600">付款节点计划</span>
              <el-button size="small" type="primary" @click="showAddPlanDialog"><el-icon><Plus /></el-icon></el-button>
            </div>
          </template>
          <el-table :data="plans" size="small" border>
            <el-table-column prop="name" label="款项" width="90" />
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="已收" width="100" align="right">
              <template #default="{ row }">{{ (row.paidAmount || 0).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column label="收款进度" width="140">
              <template #default="{ row }">
                <el-progress :percentage="row.amount > 0 ? Math.round((row.paidAmount || 0) / row.amount * 100) : 0" :stroke-width="14" :text-inside="true" :status="planStatusType(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="dueDate" label="截止日期" width="110" />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="planTagType(row)" size="small">{{ planStatusLabel(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button v-if="(row.paidAmount || 0) < row.amount" size="small" link type="success" @click="markPaid(row)">确认</el-button>
                <el-button size="small" link type="danger" @click="deletePlan(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="planDialogVisible" title="添加付款节点" width="400px" destroy-on-close>
      <el-form :model="planForm" label-width="80px">
        <el-form-item label="款项名称"><el-input v-model="planForm.name" placeholder="如：签约款" /></el-form-item>
        <el-form-item label="金额"><el-input-number v-model="planForm.amount" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="截止日期"><el-date-picker v-model="planForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addPlan">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useProjectStore } from '@/stores/project'
import type { RoomStatus, PaymentPlan, PaymentPlanStatus } from '@/types'
import { RoomStatusMap } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const projectStore = useProjectStore()
const customerId = route.params.id as string

const customer = computed(() => customerStore.getCustomerById(customerId))
const room = computed(() => customer.value ? projectStore.rooms.find(r => r.id === customer.value!.roomId) : null)
const plans = computed(() => customerStore.getPaymentPlansByCustomer(customerId))

function getRoomLabel() {
  if (!room.value) return '-'
  return `${room.value.buildingName}-${room.value.unitName}-${room.value.roomNumber}`
}

function statusTagType(s: RoomStatus): string {
  const m: Record<RoomStatus, string> = { available: 'info', reserved: 'warning', contracted: '', settled: 'success' }
  return m[s]
}

function getPlanStatus(plan: PaymentPlan): PaymentPlanStatus {
  const paid = plan.paidAmount || 0
  if (paid <= 0) return 'unpaid'
  if (paid >= plan.amount) return 'paid'
  return 'partial'
}

function planStatusType(plan: PaymentPlan): '' | 'success' | 'warning' | 'exception' {
  const s = getPlanStatus(plan)
  if (s === 'paid') return 'success'
  if (s === 'partial') return 'warning'
  return 'exception'
}

function planTagType(plan: PaymentPlan): string {
  const s = getPlanStatus(plan)
  if (s === 'paid') return 'success'
  if (s === 'partial') return 'warning'
  return 'info'
}

function planStatusLabel(plan: PaymentPlan): string {
  const s = getPlanStatus(plan)
  if (s === 'paid') return '已收'
  if (s === 'partial') return '部分收'
  return '未收'
}

const planDialogVisible = ref(false)
const planForm = reactive({ name: '', amount: 0, dueDate: '' })

function showAddPlanDialog() { Object.assign(planForm, { name: '', amount: 0, dueDate: '' }); planDialogVisible.value = true }

async function addPlan() {
  await customerStore.addPaymentPlan({ customerId, name: planForm.name, amount: planForm.amount, paidAmount: 0, dueDate: planForm.dueDate, paid: false })
  planDialogVisible.value = false
  ElMessage.success('已添加')
}

async function markPaid(p: PaymentPlan) {
  await customerStore.markPlanPaid(p.id)
  ElMessage.success('已确认付款')
}

async function deletePlan(p: PaymentPlan) {
  await ElMessageBox.confirm('确定删除此付款节点？', '确认', { type: 'warning' })
  await customerStore.deletePaymentPlan(p.id)
}

onMounted(() => {
  if (!customer.value) router.push('/customers')
})
</script>
