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
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReceiptStore } from '@/stores/receipt'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { useLogStore } from '@/stores/log'
import type { PaymentType, PaymentMethod } from '@/types'
import { PaymentTypeMap, PaymentMethodMap } from '@/types'
import { exportReceiptsToExcel } from '@/utils/export'
import { ElMessage, ElMessageBox } from 'element-plus'

const receiptStore = useReceiptStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const logStore = useLogStore()
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

async function handleVoid(r: any) {
  await ElMessageBox.confirm(`确定作废收据"${r.receiptNumber}"？`, '确认作废', { type: 'warning' })
  await receiptStore.voidReceipt(r.id)
  await logStore.addLog({ userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role, action: 'void_receipt', targetType: 'receipt', targetId: r.id, details: `作废收据 ${r.receiptNumber}`, amountChange: -r.amount })
  ElMessage.success('收据已作废')
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
