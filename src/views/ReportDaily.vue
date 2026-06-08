<template>
  <div class="report-daily">
    <el-card shadow="never">
      <div class="page-header">
        <h3>销售报表</h3>
        <div class="filter-area">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 300px" />
          <el-select v-model="reportType" style="width: 100px; margin-left: 8px">
            <el-option label="日报" value="daily" /><el-option label="周报" value="weekly" /><el-option label="月报" value="monthly" />
          </el-select>
          <el-button type="primary" style="margin-left: 8px" @click="generateReport">生成报表</el-button>
          <el-button @click="handleExport"><el-icon><Download /></el-icon>导出</el-button>
        </div>
      </div>

      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="总收款金额" :value="summary.totalAmount" prefix="¥" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="开票数量" :value="summary.receiptCount" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="有效收据金额" :value="summary.activeAmount" prefix="¥" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="作废金额" :value="summary.voidAmount" prefix="¥" />
          </el-card>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="各收款方式汇总" name="method">
          <el-table :data="methodSummary" border stripe>
            <el-table-column prop="method" label="收款方式" width="140" />
            <el-table-column prop="count" label="笔数" width="100" align="center" />
            <el-table-column prop="amount" label="金额" align="right">
              <template #default="{ row }">¥ {{ row.amount.toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="各楼盘收款小计" name="project">
          <el-table :data="projectSummary" border stripe>
            <el-table-column prop="projectName" label="楼盘名称" width="200" />
            <el-table-column prop="count" label="笔数" width="100" align="center" />
            <el-table-column prop="amount" label="金额" align="right">
              <template #default="{ row }">¥ {{ row.amount.toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="明细列表" name="detail">
          <el-table :data="detailList" border stripe size="small">
            <el-table-column prop="receiptNumber" label="收据编号" width="180" />
            <el-table-column prop="paymentUnit" label="付款单位" width="100" />
            <el-table-column prop="paymentReason" label="事由" min-width="140" show-overflow-tooltip />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ PaymentTypeMap[row.paymentType as PaymentType] }}</template>
            </el-table-column>
            <el-table-column label="方式" width="70">
              <template #default="{ row }">{{ PaymentMethodMap[row.paymentMethod as PaymentMethod] }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="paymentDate" label="日期" width="110" />
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '有效' : '已作废' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useReceiptStore } from '@/stores/receipt'
import { useProjectStore } from '@/stores/project'
import type { PaymentType, PaymentMethod } from '@/types'
import { PaymentTypeMap, PaymentMethodMap } from '@/types'
import { exportToExcel } from '@/utils/export'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

const receiptStore = useReceiptStore()
const projectStore = useProjectStore()

const dateRange = ref<[string, string]>([dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')])
const reportType = ref('daily')
const activeTab = ref('method')

const summary = reactive({ totalAmount: 0, receiptCount: 0, activeAmount: 0, voidAmount: 0 })
const methodSummary = ref<{ method: string; count: number; amount: number }[]>([])
const projectSummary = ref<{ projectName: string; count: number; amount: number }[]>([])
const detailList = ref<any[]>([])

function generateReport() {
  if (!dateRange.value || !dateRange.value[0]) {
    ElMessage.warning('请选择日期范围')
    return
  }
  const [start, end] = dateRange.value
  const receipts = receiptStore.receipts.filter(r => r.paymentDate >= start && r.paymentDate <= end)
  const activeReceipts = receipts.filter(r => r.status === 'active')
  const voidReceipts = receipts.filter(r => r.status === 'voided')

  summary.totalAmount = receipts.reduce((s, r) => s + r.amount, 0)
  summary.receiptCount = receipts.length
  summary.activeAmount = activeReceipts.reduce((s, r) => s + r.amount, 0)
  summary.voidAmount = voidReceipts.reduce((s, r) => s + r.amount, 0)

  const mMap: Record<string, { count: number; amount: number }> = {}
  activeReceipts.forEach(r => {
    const label = PaymentMethodMap[r.paymentMethod]
    if (!mMap[label]) mMap[label] = { count: 0, amount: 0 }
    mMap[label].count++
    mMap[label].amount += r.amount
  })
  methodSummary.value = Object.entries(mMap).map(([method, v]) => ({ method, ...v }))

  const pMap: Record<string, { count: number; amount: number }> = {}
  activeReceipts.forEach(r => {
    const p = projectStore.getProjectById(r.projectId)
    const name = p?.name || '未知'
    if (!pMap[name]) pMap[name] = { count: 0, amount: 0 }
    pMap[name].count++
    pMap[name].amount += r.amount
  })
  projectSummary.value = Object.entries(pMap).map(([projectName, v]) => ({ projectName, ...v }))

  detailList.value = receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
  ElMessage.success('报表已生成')
}

function handleExport() {
  const data: Record<string, any[]> = {
    '收款方式汇总': methodSummary.value.map(m => ({ 收款方式: m.method, 笔数: m.count, 金额: m.amount })),
    '楼盘收款小计': projectSummary.value.map(p => ({ 楼盘名称: p.projectName, 笔数: p.count, 金额: p.amount })),
    '明细': detailList.value.map(r => ({
      收据编号: r.receiptNumber, 付款单位: r.paymentUnit, 事由: r.paymentReason,
      类型: PaymentTypeMap[r.paymentType as PaymentType], 方式: PaymentMethodMap[r.paymentMethod as PaymentMethod],
      金额: r.amount, 日期: r.paymentDate, 状态: r.status === 'active' ? '有效' : '已作废'
    }))
  }
  exportToExcel(data, `销售报表_${dateRange.value[0]}_${dateRange.value[1]}`)
  ElMessage.success('报表已导出')
}

generateReport()
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.page-header h3 { font-size: 18px; color: #2c3e50; }
.filter-area { display: flex; align-items: center; }
.stat-card { text-align: center; }
</style>
