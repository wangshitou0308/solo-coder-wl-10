<template>
  <div class="log-list">
    <el-card shadow="never">
      <div class="page-header">
        <h3>操作日志</h3>
        <div class="filter-area">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 300px" />
          <el-select v-model="filterAction" placeholder="操作类型" clearable style="width: 120px; margin-left: 8px">
            <el-option label="开具收据" value="create_receipt" />
            <el-option label="修改收据" value="modify_receipt" />
            <el-option label="作废收据" value="void_receipt" />
            <el-option label="新增客户" value="create_customer" />
            <el-option label="修改客户" value="modify_customer" />
            <el-option label="变更状态" value="modify_room_status" />
          </el-select>
          <el-button type="primary" style="margin-left: 8px" @click="loadData">查询</el-button>
        </div>
      </div>
      <el-table :data="filteredLogs" v-loading="logStore.loading" stripe border style="width: 100%">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="timestamp" label="时间" width="170" />
        <el-table-column prop="userName" label="操作人" width="90" />
        <el-table-column label="角色" width="90">
          <template #default="{ row }">{{ UserRoleMap[row.userRole as UserRole] }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{ row }">{{ actionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="details" label="详情" min-width="250" show-overflow-tooltip />
        <el-table-column label="金额变动" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.amountChange" :style="{ color: row.amountChange > 0 ? '#67c23a' : '#f56c6c' }">
              {{ row.amountChange > 0 ? '+' : '' }}{{ row.amountChange?.toLocaleString() }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLogStore } from '@/stores/log'
import type { UserRole } from '@/types'
import { UserRoleMap } from '@/types'
import dayjs from 'dayjs'

const logStore = useLogStore()

const dateRange = ref<[string, string]>([dayjs().subtract(30, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')])
const filterAction = ref('')

const filteredLogs = computed(() => {
  let list = logStore.logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  if (filterAction.value) list = list.filter(l => l.action === filterAction.value)
  return list
})

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    create_receipt: '开具收据', modify_receipt: '修改收据', void_receipt: '作废收据',
    create_customer: '新增客户', modify_customer: '修改客户', modify_room_status: '变更状态'
  }
  return map[action] || action
}

async function loadData() {
  if (dateRange.value && dateRange.value[0]) {
    await logStore.loadLogsByDateRange(dateRange.value[0], dateRange.value[1])
  } else {
    await logStore.loadLogs()
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.page-header h3 { font-size: 18px; color: #2c3e50; }
.filter-area { display: flex; align-items: center; }
</style>
