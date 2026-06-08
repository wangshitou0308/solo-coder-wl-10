<template>
  <div class="dashboard-page">
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #409eff"><el-icon :size="28"><OfficeBuilding /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ projectStore.projects.length }}</div>
              <div class="stat-label">楼盘项目</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #67c23a"><el-icon :size="28"><House /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ projectStore.rooms.length }}</div>
              <div class="stat-label">房源总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #e6a23c"><el-icon :size="28"><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ customerStore.customers.length }}</div>
              <div class="stat-label">客户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #f56c6c"><el-icon :size="28"><Money /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ totalReceiptAmount.toLocaleString() }}</div>
              <div class="stat-label">累计收款(元)</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight: 600">各楼盘去化率</span></template>
          <div ref="pieChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight: 600">收款方式占比</span></template>
          <div ref="ringChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header><span style="font-weight: 600">月度收款趋势</span></template>
          <div ref="barChartRef" style="height: 320px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight: 600">最近操作日志</span></template>
          <el-table :data="recentLogs" size="small" max-height="300">
            <el-table-column prop="timestamp" label="时间" width="160" />
            <el-table-column prop="userName" label="操作人" width="80" />
            <el-table-column prop="action" label="操作" width="100">
              <template #default="{ row }">{{ actionLabel(row.action) }}</template>
            </el-table-column>
            <el-table-column prop="details" label="详情" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span style="font-weight: 600">待催款提醒</span></template>
          <el-table :data="upcomingReminders" size="small" max-height="300">
            <el-table-column prop="customerName" label="客户" width="80" />
            <el-table-column prop="planName" label="款项" width="80" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="dueDate" label="截止日期" width="110" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isOverdue ? 'danger' : 'warning'" size="small">{{ row.isOverdue ? '已逾期' : '即将到期' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useProjectStore } from '@/stores/project'
import { useCustomerStore } from '@/stores/customer'
import { useReceiptStore } from '@/stores/receipt'
import { useLogStore } from '@/stores/log'
import { PaymentMethodMap } from '@/types'
import dayjs from 'dayjs'

const projectStore = useProjectStore()
const customerStore = useCustomerStore()
const receiptStore = useReceiptStore()
const logStore = useLogStore()

const pieChartRef = ref<HTMLElement>()
const ringChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()

const totalReceiptAmount = computed(() =>
  receiptStore.getActiveReceipts.reduce((sum, r) => sum + r.amount, 0)
)

const recentLogs = computed(() => logStore.getRecentLogs.slice(0, 10))

const upcomingReminders = computed(() => {
  const now = dayjs()
  return customerStore.paymentPlans
    .filter(p => !p.paid)
    .map(p => {
      const dueDate = dayjs(p.dueDate)
      const diff = dueDate.diff(now, 'day')
      const customer = customerStore.getCustomerById(p.customerId)
      return {
        customerName: customer?.name || '未知',
        planName: p.name,
        amount: p.amount,
        dueDate: p.dueDate,
        isOverdue: diff < 0,
        diff
      }
    })
    .filter(r => r.diff <= 7)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 10)
})

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    create_receipt: '开具收据',
    modify_receipt: '修改收据',
    void_receipt: '作废收据',
    create_customer: '新增客户',
    modify_customer: '修改客户',
    modify_room_status: '变更状态'
  }
  return map[action] || action
}

function initPieChart() {
  if (!pieChartRef.value) return
  const chart = echarts.init(pieChartRef.value)
  const data = projectStore.projects.map(p => {
    const projectRooms = projectStore.getRoomsByProject(p.id)
    const sold = projectRooms.filter(r => r.status !== 'available').length
    const total = projectRooms.length || 1
    return { name: p.name, value: Math.round((sold / total) * 100) }
  })
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      data,
      label: { formatter: '{b}\n{c}%' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

function initRingChart() {
  if (!ringChartRef.value) return
  const chart = echarts.init(ringChartRef.value)
  const methodMap: Record<string, number> = {}
  receiptStore.getActiveReceipts.forEach(r => {
    const label = PaymentMethodMap[r.paymentMethod]
    methodMap[label] = (methodMap[label] || 0) + r.amount
  })
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c}' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: Object.entries(methodMap).map(([name, value]) => ({ name, value })),
      label: { formatter: '{b}\n¥{c}' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

function initBarChart() {
  if (!barChartRef.value) return
  const chart = echarts.init(barChartRef.value)
  const monthMap: Record<string, number> = {}
  receiptStore.getActiveReceipts.forEach(r => {
    const month = r.paymentDate.slice(0, 7)
    monthMap[month] = (monthMap[month] || 0) + r.amount
  })
  const months = Object.keys(monthMap).sort()
  const values = months.map(m => monthMap[m])
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: ¥{c}' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', axisLabel: { formatter: '¥{value}' } },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
      barWidth: '40%'
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    initPieChart()
    initRingChart()
    initBarChart()
  }, 300)
})
</script>

<style scoped>
.stat-card {
  border-radius: 8px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}
.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
</style>
