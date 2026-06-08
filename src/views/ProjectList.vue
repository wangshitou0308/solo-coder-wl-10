<template>
  <div class="project-list">
    <el-card shadow="never">
      <div class="page-header">
        <h3>楼盘项目管理</h3>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>新增楼盘
        </el-button>
      </div>
      <el-table :data="projectStore.projects" v-loading="projectStore.loading" stripe border style="width: 100%">
        <el-table-column prop="name" label="楼盘名称" min-width="160" />
        <el-table-column prop="abbreviation" label="缩写" width="80" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="deliveryStandard" label="交付标准" width="120" />
        <el-table-column label="房源数" width="80" align="center">
          <template #default="{ row }">{{ projectStore.getRoomsByProject(row.id).length }}</template>
        </el-table-column>
        <el-table-column label="去化率" width="100" align="center">
          <template #default="{ row }">
            <el-progress :percentage="getProgress(row.id)" :stroke-width="6" style="width: 80px" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="goDetail(row.id)">详情</el-button>
            <el-button size="small" type="primary" link @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑楼盘' : '新增楼盘'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="楼盘名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入楼盘名称" />
        </el-form-item>
        <el-form-item label="缩写" prop="abbreviation">
          <el-input v-model="form.abbreviation" placeholder="用于收据编号前缀，如：HY" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入楼盘地址" />
        </el-form-item>
        <el-form-item label="交付标准" prop="deliveryStandard">
          <el-select v-model="form.deliveryStandard" placeholder="请选择交付标准" style="width: 100%">
            <el-option label="毛坯" value="毛坯" />
            <el-option label="简装" value="简装" />
            <el-option label="精装" value="精装" />
            <el-option label="豪装" value="豪装" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import type { Project } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const projectStore = useProjectStore()
const router = useRouter()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const saving = ref(false)
const formRef = ref()

const form = reactive({ name: '', abbreviation: '', address: '', deliveryStandard: '' })
const rules = {
  name: [{ required: true, message: '请输入楼盘名称', trigger: 'blur' }],
  abbreviation: [{ required: true, message: '请输入缩写', trigger: 'blur' }]
}

function getProgress(pid: string): number {
  const rooms = projectStore.getRoomsByProject(pid)
  if (rooms.length === 0) return 0
  const sold = rooms.filter(r => r.status !== 'available').length
  return Math.round((sold / rooms.length) * 100)
}

function showAddDialog() {
  isEdit.value = false
  editingId.value = ''
  Object.assign(form, { name: '', abbreviation: '', address: '', deliveryStandard: '' })
  dialogVisible.value = true
}

function showEditDialog(row: Project) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, { name: row.name, abbreviation: row.abbreviation, address: row.address, deliveryStandard: row.deliveryStandard })
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await projectStore.updateProject(editingId.value, { ...form })
      ElMessage.success('楼盘已更新')
    } else {
      await projectStore.addProject({ ...form })
      ElMessage.success('楼盘已创建')
    }
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Project) {
  await ElMessageBox.confirm(`确定要删除楼盘"${row.name}"吗？删除后关联的楼栋、单元、房源数据将一并删除。`, '确认删除', { type: 'warning' })
  await projectStore.deleteProject(row.id)
  ElMessage.success('楼盘已删除')
}

function goDetail(id: string) {
  router.push(`/projects/${id}`)
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h3 {
  font-size: 18px;
  color: #2c3e50;
}
</style>
