<template>
  <div class="project-detail">
    <el-page-header @back="router.push('/projects')">
      <template #content>
        <span style="font-size: 16px; font-weight: 600">{{ project?.name || '楼盘详情' }}</span>
      </template>
    </el-page-header>

    <el-tabs v-model="activeTab" style="margin-top: 16px">
      <el-tab-pane label="房源列表" name="list">
        <div class="tab-header">
          <div class="filter-area">
            <el-select v-model="filterBuilding" placeholder="楼栋" clearable style="width: 120px" @change="onFilterChange">
              <el-option v-for="b in buildings" :key="b.id" :label="b.name" :value="b.id" />
            </el-select>
            <el-select v-model="filterUnit" placeholder="单元" clearable style="width: 120px; margin-left: 8px">
              <el-option v-for="u in filteredUnits" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="销售状态" clearable style="width: 120px; margin-left: 8px">
              <el-option v-for="(v, k) in RoomStatusMap" :key="k" :label="v" :value="k" />
            </el-select>
          </div>
          <div>
            <el-button type="primary" @click="showAddRoomDialog"><el-icon><Plus /></el-icon>添加房源</el-button>
            <el-button @click="showBatchRoomDialog"><el-icon><Grid /></el-icon>批量生成</el-button>
            <el-button @click="showBuildingDialog(null)"><el-icon><Plus /></el-icon>添加楼栋</el-button>
          </div>
        </div>

        <div class="building-section" v-for="b in buildings" :key="b.id">
          <div class="building-header">
            <span class="building-name">{{ b.name }}</span>
            <el-button size="small" link type="primary" @click="showBuildingDialog(b)">编辑</el-button>
            <el-button size="small" link type="danger" @click="deleteBuilding(b)">删除</el-button>
            <el-button size="small" link type="primary" @click="showUnitDialog(null, b.id)">添加单元</el-button>
          </div>
          <div v-for="u in projectStore.getUnitsByBuilding(b.id)" :key="u.id" class="unit-section">
            <div class="unit-header">
              <span>{{ u.name }}</span>
              <el-button size="small" link type="primary" @click="showUnitDialog(u, b.id)">编辑</el-button>
              <el-button size="small" link type="danger" @click="deleteUnit(u)">删除</el-button>
            </div>
            <el-table :data="getRoomList(u.id)" size="small" border stripe>
              <el-table-column prop="roomNumber" label="房号" width="90" />
              <el-table-column prop="floor" label="楼层" width="60" align="center" />
              <el-table-column prop="layout" label="户型" width="80" />
              <el-table-column prop="area" label="面积(㎡)" width="90" align="right">
                <template #default="{ row }">{{ row.area.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="orientation" label="朝向" width="70" align="center" />
              <el-table-column prop="unitPrice" label="单价" width="100" align="right">
                <template #default="{ row }">{{ row.unitPrice.toLocaleString() }}</template>
              </el-table-column>
              <el-table-column prop="totalPrice" label="总价" width="120" align="right">
                <template #default="{ row }">{{ row.totalPrice.toLocaleString() }}</template>
              </el-table-column>
              <el-table-column prop="deliveryStandard" label="交付标准" width="80" />
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)" size="small">{{ RoomStatusMap[row.status] }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" link type="primary" @click="showEditRoomDialog(row)">编辑</el-button>
                  <el-dropdown trigger="click" @command="(cmd: string) => changeStatus(row.id, cmd as RoomStatus)">
                    <el-button size="small" link type="warning">变更状态</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-for="(v, k) in RoomStatusMap" :key="k" :command="k">{{ v }}</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button size="small" link type="primary" @click="goLedger(row.id)">台账</el-button>
                  <el-button size="small" link type="danger" @click="deleteRoom(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="楼盘表" name="table">
        <div class="tab-header">
          <el-select v-model="tableBuildingId" placeholder="选择楼栋" style="width: 160px" @change="onTableBuildingChange">
            <el-option v-for="b in buildings" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
          <el-select v-model="tableUnitId" placeholder="选择单元" style="width: 160px; margin-left: 8px">
            <el-option v-for="u in tableUnits" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </div>
        <div v-if="tableUnitId" class="room-table-grid">
          <div v-for="floor in floorList" :key="floor" class="floor-row">
            <div class="floor-label">{{ floor }}F</div>
            <div v-for="room in getRoomsByFloor(floor)" :key="room.id"
                 class="room-cell" :class="'status-' + room.status"
                 @click="onRoomCellClick(room)">
              <div class="room-number">{{ room.roomNumber }}</div>
              <div class="room-info">{{ room.layout }} · {{ room.area }}㎡</div>
              <div class="room-price">{{ (room.totalPrice / 10000).toFixed(0) }}万</div>
            </div>
          </div>
        </div>
        <div class="table-legend">
          <span class="legend-item"><span class="legend-dot status-available"></span>在售</span>
          <span class="legend-item"><span class="legend-dot status-reserved"></span>已定</span>
          <span class="legend-item"><span class="legend-dot status-contracted"></span>已签约</span>
          <span class="legend-item"><span class="legend-dot status-settled"></span>已结清</span>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="buildingDialogVisible" :title="editingBuilding ? '编辑楼栋' : '添加楼栋'" width="400px" destroy-on-close>
      <el-form :model="buildingForm" label-width="70px">
        <el-form-item label="楼栋名称"><el-input v-model="buildingForm.name" placeholder="如：1栋" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="buildingForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="buildingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBuilding">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="unitDialogVisible" :title="editingUnit ? '编辑单元' : '添加单元'" width="400px" destroy-on-close>
      <el-form :model="unitForm" label-width="70px">
        <el-form-item label="单元名称"><el-input v-model="unitForm.name" placeholder="如：1单元" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="unitForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="unitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUnit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roomDialogVisible" :title="editingRoom ? '编辑房源' : '添加房源'" width="620px" destroy-on-close>
      <el-form ref="roomFormRef" :model="roomForm" :rules="roomRules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="楼栋" prop="buildingId">
              <el-select v-model="roomForm.buildingId" style="width: 100%" @change="onRoomBuildingChange">
                <el-option v-for="b in buildings" :key="b.id" :label="b.name" :value="b.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单元" prop="unitId">
              <el-select v-model="roomForm.unitId" style="width: 100%">
                <el-option v-for="u in roomFormUnits" :key="u.id" :label="u.name" :value="u.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="房号" prop="roomNumber"><el-input v-model="roomForm.roomNumber" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="楼层" prop="floor"><el-input-number v-model="roomForm.floor" :min="-5" :max="200" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="户型"><el-input v-model="roomForm.layout" placeholder="如：三室两厅" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="面积" prop="area"><el-input-number v-model="roomForm.area" :min="0" :precision="2" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="朝向"><el-input v-model="roomForm.orientation" placeholder="如：南北" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价" prop="unitPrice"><el-input-number v-model="roomForm.unitPrice" :min="0" style="width: 100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="总价" prop="totalPrice"><el-input-number v-model="roomForm.totalPrice" :min="0" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="交付标准">
              <el-select v-model="roomForm.deliveryStandard" style="width: 100%">
                <el-option label="毛坯" value="毛坯" /><el-option label="简装" value="简装" />
                <el-option label="精装" value="精装" /><el-option label="豪装" value="豪装" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="roomForm.status" style="width: 100%">
                <el-option v-for="(v, k) in RoomStatusMap" :key="k" :label="v" :value="k" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="roomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialogVisible" title="批量生成房源" width="560px" destroy-on-close>
      <el-form :model="batchForm" label-width="90px">
        <el-form-item label="楼栋">
          <el-select v-model="batchForm.buildingId" style="width: 100%">
            <el-option v-for="b in buildings" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="单元">
          <el-select v-model="batchForm.unitId" style="width: 100%">
            <el-option v-for="u in projectStore.getUnitsByBuilding(batchForm.buildingId)" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="起始楼层"><el-input-number v-model="batchForm.startFloor" :min="-5" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束楼层"><el-input-number v-model="batchForm.endFloor" :min="1" style="width: 100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="每层户数"><el-input-number v-model="batchForm.roomsPerFloor" :min="1" :max="20" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积(㎡)"><el-input-number v-model="batchForm.area" :min="0" :precision="2" style="width: 100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="户型"><el-input v-model="batchForm.layout" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="朝向"><el-input v-model="batchForm.orientation" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价"><el-input-number v-model="batchForm.unitPrice" :min="0" style="width: 100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="交付标准">
          <el-select v-model="batchForm.deliveryStandard" style="width: 100%">
            <el-option label="毛坯" value="毛坯" /><el-option label="简装" value="简装" />
            <el-option label="精装" value="精装" /><el-option label="豪装" value="豪装" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roomCellDialogVisible" :title="cellRoom?.roomNumber" width="400px">
      <template v-if="cellRoom">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="户型">{{ cellRoom.layout }}</el-descriptions-item>
          <el-descriptions-item label="面积">{{ cellRoom.area }}㎡</el-descriptions-item>
          <el-descriptions-item label="朝向">{{ cellRoom.orientation }}</el-descriptions-item>
          <el-descriptions-item label="单价">{{ cellRoom.unitPrice.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="总价">{{ cellRoom.totalPrice.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(cellRoom.status)" size="small">{{ RoomStatusMap[cellRoom.status] }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="roomCellDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="goLedger(cellRoom!.id)">查看台账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useLogStore } from '@/stores/log'
import { useAuthStore } from '@/stores/auth'
import type { Building, Unit, Room, RoomStatus } from '@/types'
import { RoomStatusMap } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const logStore = useLogStore()
const authStore = useAuthStore()

const projectId = route.params.id as string
const project = computed(() => projectStore.getProjectById(projectId))
const buildings = computed(() => projectStore.getBuildingsByProject(projectId))
const activeTab = ref('list')

const filterBuilding = ref('')
const filterUnit = ref('')
const filterStatus = ref('')

const filteredUnits = computed(() => {
  if (!filterBuilding.value) return projectStore.getUnitsByBuilding(buildings.value[0]?.id || '')
  return projectStore.getUnitsByBuilding(filterBuilding.value)
})

function onFilterChange() { filterUnit.value = '' }

function getRoomList(uid: string): Room[] {
  let rooms = projectStore.getRoomsByUnit(uid)
  if (filterStatus.value) rooms = rooms.filter(r => r.status === filterStatus.value)
  return rooms
}

function statusTagType(s: RoomStatus): string {
  const m: Record<RoomStatus, string> = { available: 'info', reserved: 'warning', contracted: '', settled: 'success' }
  return m[s]
}

async function changeStatus(id: string, status: RoomStatus) {
  await projectStore.updateRoomStatus(id, status)
  const room = projectStore.rooms.find(r => r.id === id)
  await logStore.addLog({
    userId: authStore.user!.id, userName: authStore.user!.realName, userRole: authStore.user!.role,
    action: 'modify_room_status', targetType: 'room', targetId: id,
    details: `${room?.roomNumber} 状态变更为 ${RoomStatusMap[status]}`
  })
  ElMessage.success('状态已更新')
}

function goLedger(roomId: string) { router.push(`/ledger/${roomId}`) }

const buildingDialogVisible = ref(false)
const editingBuilding = ref<Building | null>(null)
const buildingForm = reactive({ name: '', sortOrder: 0, projectId: '' })

function showBuildingDialog(b: Building | null) {
  editingBuilding.value = b
  if (b) { Object.assign(buildingForm, { name: b.name, sortOrder: b.sortOrder, projectId: b.projectId }) }
  else { Object.assign(buildingForm, { name: '', sortOrder: buildings.value.length + 1, projectId }) }
  buildingDialogVisible.value = true
}

async function saveBuilding() {
  if (editingBuilding.value) {
    await projectStore.updateBuilding(editingBuilding.value.id, { name: buildingForm.name, sortOrder: buildingForm.sortOrder })
  } else {
    await projectStore.addBuilding(buildingForm)
  }
  buildingDialogVisible.value = false
  ElMessage.success('已保存')
}

async function deleteBuilding(b: Building) {
  await ElMessageBox.confirm(`确定删除楼栋"${b.name}"？`, '确认', { type: 'warning' })
  await projectStore.deleteBuilding(b.id)
}

const unitDialogVisible = ref(false)
const editingUnit = ref<Unit | null>(null)
const unitForm = reactive({ name: '', sortOrder: 0, projectId: '', buildingId: '' })

function showUnitDialog(u: Unit | null, bid: string) {
  editingUnit.value = u
  if (u) { Object.assign(unitForm, { name: u.name, sortOrder: u.sortOrder, projectId: u.projectId, buildingId: u.buildingId }) }
  else { Object.assign(unitForm, { name: '', sortOrder: 1, projectId, buildingId: bid }) }
  unitDialogVisible.value = true
}

async function saveUnit() {
  if (editingUnit.value) {
    await projectStore.updateUnit(editingUnit.value.id, { name: unitForm.name, sortOrder: unitForm.sortOrder })
  } else {
    await projectStore.addUnit(unitForm)
  }
  unitDialogVisible.value = false
  ElMessage.success('已保存')
}

async function deleteUnit(u: Unit) {
  await ElMessageBox.confirm(`确定删除单元"${u.name}"？`, '确认', { type: 'warning' })
  await projectStore.deleteUnit(u.id)
}

const roomDialogVisible = ref(false)
const editingRoom = ref<Room | null>(null)
const roomFormRef = ref()
const roomForm = reactive({
  projectId: '', buildingId: '', unitId: '', roomNumber: '', buildingName: '', unitName: '',
  floor: 1, layout: '', area: 0, orientation: '', unitPrice: 0, totalPrice: 0, deliveryStandard: '毛坯', status: 'available' as RoomStatus
})
const roomRules = {
  buildingId: [{ required: true, message: '请选择楼栋', trigger: 'change' }],
  unitId: [{ required: true, message: '请选择单元', trigger: 'change' }],
  roomNumber: [{ required: true, message: '请输入房号', trigger: 'blur' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  totalPrice: [{ required: true, message: '请输入总价', trigger: 'blur' }]
}

const roomFormUnits = computed(() => projectStore.getUnitsByBuilding(roomForm.buildingId))

function onRoomBuildingChange() { roomForm.unitId = '' }

function showAddRoomDialog() {
  editingRoom.value = null
  Object.assign(roomForm, { projectId, buildingId: '', unitId: '', roomNumber: '', buildingName: '', unitName: '', floor: 1, layout: '', area: 0, orientation: '', unitPrice: 0, totalPrice: 0, deliveryStandard: '毛坯', status: 'available' as RoomStatus })
  roomDialogVisible.value = true
}

function showEditRoomDialog(r: Room) {
  editingRoom.value = r
  Object.assign(roomForm, { ...r })
  roomDialogVisible.value = true
}

async function saveRoom() {
  await roomFormRef.value?.validate()
  const b = buildings.value.find(x => x.id === roomForm.buildingId)
  const u = projectStore.getUnitsByBuilding(roomForm.buildingId).find(x => x.id === roomForm.unitId)
  roomForm.buildingName = b?.name || ''
  roomForm.unitName = u?.name || ''
  if (editingRoom.value) {
    await projectStore.updateRoom(editingRoom.value.id, { ...roomForm })
  } else {
    await projectStore.addRoom({ ...roomForm, projectId })
  }
  roomDialogVisible.value = false
  ElMessage.success('已保存')
}

async function deleteRoom(r: Room) {
  await ElMessageBox.confirm(`确定删除房源"${r.roomNumber}"？`, '确认', { type: 'warning' })
  await projectStore.deleteRoom(r.id)
}

const batchDialogVisible = ref(false)
const batchForm = reactive({
  buildingId: '', unitId: '', startFloor: 1, endFloor: 18, roomsPerFloor: 4,
  area: 100, layout: '', orientation: '', unitPrice: 0, deliveryStandard: '毛坯'
})

function showBatchRoomDialog() {
  Object.assign(batchForm, { buildingId: '', unitId: '', startFloor: 1, endFloor: 18, roomsPerFloor: 4, area: 100, layout: '', orientation: '', unitPrice: 0, deliveryStandard: '毛坯' })
  batchDialogVisible.value = true
}

async function handleBatchGenerate() {
  const b = buildings.value.find(x => x.id === batchForm.buildingId)
  const u = projectStore.getUnitsByBuilding(batchForm.buildingId).find(x => x.id === batchForm.unitId)
  if (!b || !u) return ElMessage.warning('请选择楼栋和单元')
  const rooms: Omit<Room, 'id'>[] = []
  for (let f = batchForm.startFloor; f <= batchForm.endFloor; f++) {
    for (let i = 1; i <= batchForm.roomsPerFloor; i++) {
      const roomNum = `${f}${String(i).padStart(2, '0')}`
      rooms.push({
        projectId, buildingId: b.id, unitId: u.id, roomNumber: roomNum,
        buildingName: b.name, unitName: u.name, floor: f, layout: batchForm.layout,
        area: batchForm.area, orientation: batchForm.orientation,
        unitPrice: batchForm.unitPrice, totalPrice: Math.round(batchForm.area * batchForm.unitPrice),
        deliveryStandard: batchForm.deliveryStandard, status: 'available'
      })
    }
  }
  await projectStore.batchAddRooms(rooms)
  batchDialogVisible.value = false
  ElMessage.success(`已生成${rooms.length}套房源`)
}

const tableBuildingId = ref('')
const tableUnitId = ref('')
const tableUnits = computed(() => projectStore.getUnitsByBuilding(tableBuildingId.value))

function onTableBuildingChange() { tableUnitId.value = '' }

const floorList = computed(() => {
  if (!tableUnitId.value) return []
  const rs = projectStore.getRoomsByUnit(tableUnitId.value)
  const floors = [...new Set(rs.map(r => r.floor))].sort((a, b) => b - a)
  return floors
})

function getRoomsByFloor(floor: number): Room[] {
  return projectStore.getRoomsByUnit(tableUnitId.value).filter(r => r.floor === floor)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

const roomCellDialogVisible = ref(false)
const cellRoom = ref<Room | null>(null)

function onRoomCellClick(r: Room) { cellRoom.value = r; roomCellDialogVisible.value = true }

watch(buildings, (v) => {
  if (v.length > 0 && !tableBuildingId.value) tableBuildingId.value = v[0].id
}, { immediate: true })

watch(tableUnits, (v) => {
  if (v.length > 0 && !tableUnitId.value) tableUnitId.value = v[0].id
}, { immediate: true })

onMounted(() => {
  if (!project.value) router.push('/projects')
})
</script>

<style scoped>
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-area { display: flex; align-items: center; }
.building-section { margin-bottom: 24px; }
.building-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 2px solid #409eff;
  margin-bottom: 12px;
}
.building-name { font-size: 16px; font-weight: 600; color: #2c3e50; }
.unit-section { margin: 12px 0 20px 16px; }
.unit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}
.room-table-grid { padding: 16px 0; }
.floor-row { display: flex; align-items: center; margin-bottom: 4px; }
.floor-label { width: 40px; text-align: center; font-size: 12px; color: #999; flex-shrink: 0; }
.room-cell {
  flex: 1;
  min-width: 100px;
  height: 70px;
  margin: 2px;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.2s;
}
.room-cell:hover { transform: scale(1.05); }
.room-number { font-weight: 600; margin-bottom: 2px; }
.room-info { color: #666; }
.room-price { color: #e6a23c; font-weight: 600; }
.status-available { background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; }
.status-reserved { background: #fff3e0; border: 1px solid #ffe0b2; color: #ef6c00; }
.status-contracted { background: #e3f2fd; border: 1px solid #bbdefb; color: #1565c0; }
.status-settled { background: #f3e5f5; border: 1px solid #ce93d8; color: #7b1fa2; }
.table-legend {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  font-size: 13px;
  color: #666;
}
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}
</style>
