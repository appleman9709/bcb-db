import type { FamilyMember, DutyScheduleWithAssignments } from './dataService'
import { dataService } from './dataService'

const HOURS_IN_DAY = 24
const STORAGE_KEY_PREFIX = 'duty-schedule'

export const DEFAULT_BLOCK_DURATION = 3
export const DEFAULT_START_OFFSET = 0
export const ALLOWED_BLOCK_DURATIONS = [1, 2, 3, 4, 6, 8] as const

export interface DutyBlockDefinition {
  id: string
  index: number
  startHour: number
  endHour: number
  displayStartHour: number
  displayEndHour: number
  spansMidnight: boolean
  label: string
}

export interface DutyBlockAssignment {
  blockId: string
  parentId: string | null
}

export interface DutySchedule {
  blocks: DutyBlockAssignment[]
  updatedAt: string
  blockDurationHours: number
  startHourOffset: number
}

const normalizeHourOfDay = (value: number): number => {
  const normalized = value % HOURS_IN_DAY
  return normalized < 0 ? normalized + HOURS_IN_DAY : normalized
}

const ensureBlockDuration = (value: number | undefined | null): number => {
  if (typeof value !== 'number') {
    return DEFAULT_BLOCK_DURATION
  }

  const rounded = Math.round(value)
  return ALLOWED_BLOCK_DURATIONS.includes(rounded as (typeof ALLOWED_BLOCK_DURATIONS)[number])
    ? rounded
    : DEFAULT_BLOCK_DURATION
}

const ensureStartOffset = (value: number | undefined | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_START_OFFSET
  }

  return normalizeHourOfDay(Math.round(value))
}

const formatHourLabel = (hour: number): string =>
  `${hour.toString().padStart(2, '0')}:00`

const createBlockId = (startHour: number, endHour: number): string =>
  `${startHour}-${endHour}`

const parseBlockId = (blockId: string): { startHour: number; endHour: number } => {
  const [start, end] = blockId.split('-').map(Number)
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return { startHour: start, endHour: end }
  }

  return { startHour: 0, endHour: DEFAULT_BLOCK_DURATION }
}

const isHourWithinBlock = (hourOfDay: number, block: DutyBlockDefinition): boolean => {
  if (block.spansMidnight) {
    return hourOfDay >= block.displayStartHour || hourOfDay < block.displayEndHour
  }

  return hourOfDay >= block.displayStartHour && hourOfDay < block.displayEndHour
}

const pairSchedule = (
  schedule: DutySchedule
): Array<{ definition: DutyBlockDefinition; assignment: DutyBlockAssignment }> => {
  const definitions = getDutyBlocks(schedule.blockDurationHours, schedule.startHourOffset)
  const assignments = schedule.blocks

  return definitions.map((definition, index) => ({
    definition,
    assignment: assignments[index] ?? { blockId: definition.id, parentId: null }
  }))
}

const buildAssignmentsFallback = (
  members: FamilyMember[],
  definitions: DutyBlockDefinition[]
): DutyBlockAssignment[] => {
  const hasMembers = members.length > 0

  return definitions.map((definition, index) => {
    if (!hasMembers) {
      return { blockId: definition.id, parentId: null }
    }

    const assignedMember = members[index % members.length]
    return { blockId: definition.id, parentId: String(assignedMember.user_id) }
  })
}

export const getDutyBlocks = (
  blockDurationHours: number = DEFAULT_BLOCK_DURATION,
  startHourOffset: number = DEFAULT_START_OFFSET
): DutyBlockDefinition[] => {
  const safeDuration = ensureBlockDuration(blockDurationHours)
  const safeOffset = ensureStartOffset(startHourOffset)
  const blockCount = HOURS_IN_DAY / safeDuration

  return Array.from({ length: blockCount }, (_, index) => {
    const startHour = safeOffset + index * safeDuration
    const endHour = startHour + safeDuration
    const displayStartHour = normalizeHourOfDay(startHour)
    const displayEndHour = normalizeHourOfDay(endHour)
    const absoluteEndModulo = endHour % HOURS_IN_DAY
    const spansMidnight =
      displayEndHour <= displayStartHour && absoluteEndModulo !== 0

    return {
      id: createBlockId(startHour, endHour),
      index,
      startHour,
      endHour,
      displayStartHour,
      displayEndHour,
      spansMidnight,
      label: `${formatHourLabel(displayStartHour)} — ${formatHourLabel(displayEndHour)}`
    }
  })
}

const getStorageKey = (familyId: number) => `${STORAGE_KEY_PREFIX}-${familyId}`

export const buildDefaultSchedule = (
  members: FamilyMember[],
  blockDurationHours: number = DEFAULT_BLOCK_DURATION,
  startHourOffset: number = DEFAULT_START_OFFSET
): DutySchedule => {
  const safeDuration = ensureBlockDuration(blockDurationHours)
  const safeOffset = ensureStartOffset(startHourOffset)
  const definitions = getDutyBlocks(safeDuration, safeOffset)

  return {
    blocks: buildAssignmentsFallback(members, definitions),
    updatedAt: new Date().toISOString(),
    blockDurationHours: safeDuration,
    startHourOffset: safeOffset
  }
}

const sanitizeSchedule = (
  schedule: DutySchedule,
  members: FamilyMember[]
): DutySchedule => {
  const safeDuration = ensureBlockDuration(schedule.blockDurationHours)
  const safeOffset = ensureStartOffset(schedule.startHourOffset)
  const definitions = getDutyBlocks(safeDuration, safeOffset)
  const assignmentsById = new Map(schedule.blocks?.map(block => [block.blockId, block]) ?? [])
  const validParentIds = new Set(members.map(member => String(member.user_id)))

  const sanitizedBlocks = definitions.map(definition => {
    const existing = assignmentsById.get(definition.id)
    const parentId = existing?.parentId && validParentIds.has(String(existing.parentId))
      ? String(existing.parentId)
      : null

    return {
      blockId: definition.id,
      parentId
    }
  })

  return {
    blocks: sanitizedBlocks,
    updatedAt: schedule.updatedAt ?? new Date().toISOString(),
    blockDurationHours: safeDuration,
    startHourOffset: safeOffset
  }
}

export const loadDutySchedule = (
  familyId: number,
  members: FamilyMember[]
): DutySchedule => {
  if (typeof window === 'undefined' || !familyId) {
    return buildDefaultSchedule(members)
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(familyId))
    if (!raw) {
      return buildDefaultSchedule(members)
    }

    const parsed = JSON.parse(raw) as DutySchedule
    if (!parsed || !Array.isArray(parsed.blocks)) {
      return buildDefaultSchedule(members)
    }

    return sanitizeSchedule(parsed, members)
  } catch (error) {
    console.warn('Unable to load duty schedule, using defaults', error)
    return buildDefaultSchedule(members)
  }
}

export const saveDutySchedule = (familyId: number, schedule: DutySchedule) => {
  if (typeof window === 'undefined' || !familyId) {
    return
  }

  try {
    const payload: DutySchedule = {
      ...schedule,
      updatedAt: new Date().toISOString()
    }
    window.localStorage.setItem(getStorageKey(familyId), JSON.stringify(payload))
  } catch (error) {
    console.error('Unable to persist duty schedule', error)
  }
}

export const findAssignmentByBlockId = (
  schedule: DutySchedule,
  blockId: string
): DutyBlockAssignment | undefined =>
  schedule.blocks.find(block => block.blockId === blockId)

export const findAssignmentForHour = (
  schedule: DutySchedule,
  hourOfDay: number
): DutyBlockAssignment | undefined => {
  const pairs = pairSchedule(schedule)
  return pairs.find(({ definition }) => isHourWithinBlock(hourOfDay, definition))?.assignment
}

export const rebuildScheduleWithDuration = (
  schedule: DutySchedule | null,
  blockDurationHours: number,
  members: FamilyMember[]
): DutySchedule => {
  const safeDuration = ensureBlockDuration(blockDurationHours)
  const baseSchedule = schedule
    ? sanitizeSchedule(schedule, members)
    : buildDefaultSchedule(members)

  if (safeDuration === baseSchedule.blockDurationHours) {
    return baseSchedule
  }

  const fallbackAssignments = buildAssignmentsFallback(
    members,
    getDutyBlocks(safeDuration, baseSchedule.startHourOffset)
  )

  const newDefinitions = getDutyBlocks(safeDuration, baseSchedule.startHourOffset)

  const resultBlocks = newDefinitions.map((definition, index) => {
    const matching = findAssignmentForHour(baseSchedule, definition.displayStartHour)
    const fallback = fallbackAssignments[index]

    return {
      blockId: definition.id,
      parentId: matching?.parentId ?? fallback.parentId
    }
  })

  return {
    blocks: resultBlocks,
    updatedAt: new Date().toISOString(),
    blockDurationHours: safeDuration,
    startHourOffset: baseSchedule.startHourOffset
  }
}

export const rebuildScheduleWithOffset = (
  schedule: DutySchedule | null,
  startHourOffset: number,
  members: FamilyMember[]
): DutySchedule => {
  const safeOffset = ensureStartOffset(startHourOffset)
  const baseSchedule = schedule
    ? sanitizeSchedule(schedule, members)
    : buildDefaultSchedule(members)

  if (safeOffset === baseSchedule.startHourOffset) {
    return baseSchedule
  }

  const fallbackAssignments = buildAssignmentsFallback(
    members,
    getDutyBlocks(baseSchedule.blockDurationHours, safeOffset)
  )

  const newDefinitions = getDutyBlocks(baseSchedule.blockDurationHours, safeOffset)

  const resultBlocks = newDefinitions.map((definition, index) => {
    const matching = findAssignmentForHour(baseSchedule, definition.displayStartHour)
    const fallback = fallbackAssignments[index]

    return {
      blockId: definition.id,
      parentId: matching?.parentId ?? fallback.parentId
    }
  })

  return {
    blocks: resultBlocks,
    updatedAt: new Date().toISOString(),
    blockDurationHours: baseSchedule.blockDurationHours,
    startHourOffset: safeOffset
  }
}

export const buildDisplayName = (member: FamilyMember | undefined): string => {
  if (!member) {
    return 'Не назначено'
  }

  if (member.name && member.name.trim()) {
    return member.name.trim()
  }

  if (member.role && member.role.trim()) {
    return member.role.trim()
  }

  return 'Родитель'
}

// Конвертация между форматами БД и локальным форматом
export const convertFromDatabase = (dbSchedule: DutyScheduleWithAssignments): DutySchedule => {
  const blocks: DutyBlockAssignment[] = dbSchedule.assignments.map(assignment => ({
    blockId: assignment.block_id,
    parentId: assignment.parent_id || null
  }))

  return {
    blocks,
    updatedAt: dbSchedule.updated_at || new Date().toISOString(),
    blockDurationHours: dbSchedule.block_duration_hours,
    startHourOffset: dbSchedule.start_hour_offset
  }
}

export const convertToDatabase = (schedule: DutySchedule) => {
  return {
    block_duration_hours: schedule.blockDurationHours,
    start_hour_offset: schedule.startHourOffset,
    assignments: schedule.blocks.map(block => ({
      block_id: block.blockId,
      parent_id: block.parentId || undefined
    }))
  }
}

// Новые функции для работы с БД
export const loadDutyScheduleFromDatabase = async (): Promise<DutySchedule | null> => {
  try {
    const dbSchedule = await dataService.getDutySchedule()
    if (!dbSchedule) {
      return null
    }
    return convertFromDatabase(dbSchedule)
  } catch (error) {
    console.error('Error loading duty schedule from database', error)
    return null
  }
}

export const saveDutyScheduleToDatabase = async (schedule: DutySchedule): Promise<boolean> => {
  try {
    const dbFormat = convertToDatabase(schedule)
    const result = await dataService.saveDutySchedule(dbFormat)
    return result !== null
  } catch (error) {
    console.error('Error saving duty schedule to database', error)
    return false
  }
}

// Гибридная функция загрузки - сначала БД, потом localStorage как fallback
export const loadDutyScheduleHybrid = async (
  familyId: number,
  members: FamilyMember[]
): Promise<DutySchedule> => {
  try {
    // Пытаемся загрузить из БД
    const dbSchedule = await loadDutyScheduleFromDatabase()
    if (dbSchedule) {
      return sanitizeSchedule(dbSchedule, members)
    }
  } catch (error) {
    console.warn('Failed to load duty schedule from database, falling back to localStorage', error)
  }

  // Fallback к localStorage
  return loadDutySchedule(familyId, members)
}

// Гибридная функция сохранения - сохраняем и в БД, и в localStorage
export const saveDutyScheduleHybrid = async (
  familyId: number,
  schedule: DutySchedule
): Promise<boolean> => {
  let dbSuccess = false
  let localSuccess = false

  // Сохраняем в БД
  try {
    dbSuccess = await saveDutyScheduleToDatabase(schedule)
  } catch (error) {
    console.warn('Failed to save duty schedule to database', error)
  }

  // Сохраняем в localStorage как backup
  try {
    saveDutySchedule(familyId, schedule)
    localSuccess = true
  } catch (error) {
    console.warn('Failed to save duty schedule to localStorage', error)
  }

  return dbSuccess || localSuccess
}
