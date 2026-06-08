import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Building, Unit, Room, RoomStatus } from '@/types'
import { dbGetAll, dbAdd, dbPut, dbDelete, dbGetByIndex, dbGet, generateId } from '@/db'
import dayjs from 'dayjs'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const buildings = ref<Building[]>([])
  const units = ref<Unit[]>([])
  const rooms = ref<Room[]>([])
  const loading = ref(false)

  const getProjectById = computed(() => (id: string) => projects.value.find(p => p.id === id))
  const getBuildingsByProject = computed(() => (pid: string) => buildings.value.filter(b => b.projectId === pid).sort((a, b) => a.sortOrder - b.sortOrder))
  const getUnitsByBuilding = computed(() => (bid: string) => units.value.filter(u => u.buildingId === bid).sort((a, b) => a.sortOrder - b.sortOrder))
  const getRoomsByProject = computed(() => (pid: string) => rooms.value.filter(r => r.projectId === pid))
  const getRoomsByUnit = computed(() => (uid: string) => rooms.value.filter(r => r.unitId === uid))

  async function loadProjects() {
    loading.value = true
    try {
      projects.value = await dbGetAll<Project>('projects')
      buildings.value = await dbGetAll<Building>('buildings')
      units.value = await dbGetAll<Unit>('units')
      rooms.value = await dbGetAll<Room>('rooms')
    } finally {
      loading.value = false
    }
  }

  async function addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const p: Project = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    await dbAdd('projects', p)
    projects.value.push(p)
    return p
  }

  async function updateProject(id: string, data: Partial<Project>) {
    const p = projects.value.find(x => x.id === id)
    if (!p) return
    const updated = { ...p, ...data, updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
    await dbPut('projects', updated)
    Object.assign(p, updated)
  }

  async function deleteProject(id: string) {
    await dbDelete('projects', id)
    projects.value = projects.value.filter(p => p.id !== id)
    const bIds = buildings.value.filter(b => b.projectId === id).map(b => b.id)
    for (const bid of bIds) { await dbDelete('buildings', bid) }
    buildings.value = buildings.value.filter(b => b.projectId !== id)
    const uIds = units.value.filter(u => u.projectId === id).map(u => u.id)
    for (const uid of uIds) { await dbDelete('units', uid) }
    units.value = units.value.filter(u => u.projectId !== id)
    const rIds = rooms.value.filter(r => r.projectId === id).map(r => r.id)
    for (const rid of rIds) { await dbDelete('rooms', rid) }
    rooms.value = rooms.value.filter(r => r.projectId !== id)
  }

  async function addBuilding(data: Omit<Building, 'id'>): Promise<Building> {
    const b: Building = { ...data, id: generateId() }
    await dbAdd('buildings', b)
    buildings.value.push(b)
    return b
  }

  async function updateBuilding(id: string, data: Partial<Building>) {
    const b = buildings.value.find(x => x.id === id)
    if (!b) return
    const updated = { ...b, ...data }
    await dbPut('buildings', updated)
    Object.assign(b, updated)
  }

  async function deleteBuilding(id: string) {
    await dbDelete('buildings', id)
    buildings.value = buildings.value.filter(b => b.id !== id)
  }

  async function addUnit(data: Omit<Unit, 'id'>): Promise<Unit> {
    const u: Unit = { ...data, id: generateId() }
    await dbAdd('units', u)
    units.value.push(u)
    return u
  }

  async function updateUnit(id: string, data: Partial<Unit>) {
    const u = units.value.find(x => x.id === id)
    if (!u) return
    const updated = { ...u, ...data }
    await dbPut('units', updated)
    Object.assign(u, updated)
  }

  async function deleteUnit(id: string) {
    await dbDelete('units', id)
    units.value = units.value.filter(u => u.id !== id)
  }

  async function addRoom(data: Omit<Room, 'id'>): Promise<Room> {
    const r: Room = { ...data, id: generateId() }
    await dbAdd('rooms', r)
    rooms.value.push(r)
    return r
  }

  async function updateRoom(id: string, data: Partial<Room>) {
    const r = rooms.value.find(x => x.id === id)
    if (!r) return
    const updated = { ...r, ...data }
    await dbPut('rooms', updated)
    Object.assign(r, updated)
  }

  async function deleteRoom(id: string) {
    await dbDelete('rooms', id)
    rooms.value = rooms.value.filter(r => r.id !== id)
  }

  async function updateRoomStatus(id: string, status: RoomStatus) {
    await updateRoom(id, { status })
  }

  async function batchAddRooms(roomList: Omit<Room, 'id'>[]) {
    for (const r of roomList) {
      const room: Room = { ...r, id: generateId() }
      await dbAdd('rooms', room)
      rooms.value.push(room)
    }
  }

  async function loadRoomsByProject(projectId: string) {
    rooms.value = await dbGetByIndex<Room>('rooms', 'projectId', projectId)
  }

  return {
    projects, buildings, units, rooms, loading,
    getProjectById, getBuildingsByProject, getUnitsByBuilding, getRoomsByProject, getRoomsByUnit,
    loadProjects, addProject, updateProject, deleteProject,
    addBuilding, updateBuilding, deleteBuilding,
    addUnit, updateUnit, deleteUnit,
    addRoom, updateRoom, deleteRoom, updateRoomStatus, batchAddRooms, loadRoomsByProject
  }
})
