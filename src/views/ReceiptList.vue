<template>
  <div class="receipt-list">
    <el-card shadow="never">
      <div class="page-header">
        <h3>收据管理</h3>
        <el-button v-if="authStore.canManageReceipts" type="primary" @click="router.push('/receipts/new')"><el-icon><Plus /></el-icon>开具收据</el-button>
      </div>
      <div class="filter-area">
        <el-select v-model="filterProject" placeholder="楼盘" clearable style="width: 160px">
          <el-option v-for="p in projectStore.projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="filterType" placeholder="收款类型" clearable style="width: 120px; margin-left: 8px">
          <el-option v-for="(v, k) in PaymentTypeMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-select v-model="filterMethod" placeholder="收款方式" clearable style="width: 120px; margin-left: 8px">
          <el-option v-for="(v, k) in PaymentMethodMap" :key="k" :label="v" :value="k" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 100px; margin-left: 8px">
          <el-option label="有效" value="active" /><el-option label="已作废" value="voided" />
        </el-select>
        <el-input v-model="filterKeyword" placeholder="搜索收据编号/客户" clearable style="width: 200px; margin-left: 8px" />
        <el-button style="margin-left: 8px" @click="handleExport"><el-icon><Download /></el-icon>导出</el-button>
      </div>
      <el-table :data="filteredReceipts" v-loading="receiptStore.loading" stripe border style="margin-top: 12px; width: 100%">
        <el-table-column prop="receiptNumber" label="收据编号" width="180" />
        <el-table-column prop="paymentUnit" label="付款单位" width="100" />
        <el-table-column prop="paymentReason" label="收款事由" min-width="140" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ PaymentTypeMap[row.paymentType as PaymentType] }}</template>
        </el-table-column>
        <el-table-column label="方式" width="70">
          <template #default="{ row }">{{ PaymentMethodMap[row.paymentMethod as PaymentMethod] }}</template>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="authStore.canManageReceipts" size="small" link type="primary" @click="router.push(`/receipts/${row.id}`)">编辑</el-button>
            <el-button size="small" link type="primary" @click="router.push(`/receipts/print/${row.id}`)">打印</el-button>
            <el-button v-if="row.status === 'active' && authStore.canManageReceipts" size="small" link type="danger" @click="handleVoid(row)">作废</el-button>
            <el-button v-if="row.status === 'voided'" size="small" link type="info" @click="showVoidDetail(row)">作废详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="voidDialogVisible" title="作废收据" width="460px" :close-on-click-modal="false" destroy-on-close>
      <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
        <template #title>确定作废收据"{{ voidTargetReceipt?.receiptNumber }}"？作废后不可恢复。</template>
      </el-alert>
      <el-form :model="voidForm" label-width="80px">
        <el-form-item label="作废原因" required>
          <el-input v-model="voidForm.reason" type="textarea" :rows="3" placeholder="请填写作废原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="voidDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="voidLoading" @click="confirmVoid">确认作废</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="voidDetailVisible" title="作废记录" width="460px" destroy-on-close>
      <el-descriptions :column="1" border v-if="voidDetailReceipt">
        <el-descriptions-item label="收据编号">{{ voidDetailReceipt.receiptNumber }}</el-descriptions-item>
        <el-descriptions-item label="作废原因">{{ voidDetailReceipt.voidReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作废人">{{ voidDetailReceipt.voidedBy || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作废时间">{{ voidDetailReceipt.voidedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="打印次数">{{ voidDetailReceipt.printCount || 0 }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '@/stores/receipt'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { useLogStore } from '@/stores/log'
import { useCustomerStore } from '@/stores/customer'
import type { PaymentType, PaymentMethod, Receipt } from '@/types'
import { PaymentTypeMap, PaymentMethodMap } from '@/types'
import { exportReceiptsToExcel } from '@/utils/export'
import { ElMessage } from 'element-plus'

const receiptStore = useReceiptStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const logStore = useLogStore()
const customerStore = useCustomerStore()
const router = useRouter()

const filterProject = ref('')
const filterType = ref('')
const filterMethod = ref('')
const filterStatus = ref('')
const filterKeyword = ref('')

const filteredReceipts = computed(() => {
  let list = receiptStore.receipts
  if (filterProject.value) list = list.filter(r => r.projectId === filterProject.value)
  if (filterType.value) list = list.filter(r => r.paymentType === filterType.value)
  if (filterMethod.value) list = list.filter(r => r.paymentMethod === filterMethod.value)
  if (filterStatus.value) list = list.filter(r => r.status === filterStatus.value)
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase()
    list = list.filter(r => r.receiptNumber.toLowerCase().includes(kw) || r.paymentUnit.includes(kw))
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const voidDialogVisible = ref(false)
const voidLoading = ref(false)
const voidTargetReceipt = ref<Receipt | null>(null)
const voidForm = reactive({ reason: '' })

function handleVoid(r: Receipt) {
  voidTargetReceipt.value = r
  voidForm.reason = ''
  voidDialogVisible.value = true
}

async function confirmVoid() {
  if (!voidForm.reason.trim()) {
    ElMessage.warning('请填写作废原因')
    return
  }
  voidLoading.value = true
  try {
    const r = voidTargetReceipt.value!
    if (r.paymentPlanId && r.amount > 0) {
      await customerStore.subtractPaidAmount(r.paymentPlanId, r.amount)
    }
    await receiptStore.voidReceipt(r.id, voidForm.reason, authStore.user!.realName)
    await logStore.addLog({ userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role, action: 'void_receipt', targetType: 'receipt', targetId: r.id, details: `作废收据 ${r.receiptNumber}，原因：${voidForm.reason}`, amountChange: -r.amount })
    voidDialogVisible.value = false
    ElMessage.success('收据已作废')
  } finally {
    voidLoading.value = false
  }
}

const voidDetailVisible = ref(false)
const voidDetailReceipt = ref<Receipt | null>(null)

function showVoidDetail(r: Receipt) {
  voidDetailReceipt.value = r
  voidDetailVisible.value = true
}

function handleExport() {
  exportReceiptsToExcel(filteredReceipts.value)
  ElMessage.success('收据数据已导出')
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { font-size: 18px; color: #2c3e50; }
.filter-area { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
</style>
