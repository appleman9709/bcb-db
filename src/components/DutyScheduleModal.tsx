import React, { useMemo } from 'react'
import type { FamilyMember } from '../services/dataService'
import Modal from './Modal'
import Button from './Button'
import {
  ALLOWED_BLOCK_DURATIONS,
  buildDisplayName,
  findAssignmentByBlockId,
  getDutyBlocks,
  rebuildScheduleWithDuration,
  rebuildScheduleWithOffset,
  type DutySchedule
} from '../services/dutyScheduleService'

interface DutyScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  members: FamilyMember[]
  schedule: DutySchedule
  onScheduleChange: (nextSchedule: DutySchedule) => void
}

const COLOR_CLASSES = [
  { indicator: 'bg-blue-500', pill: 'bg-blue-50 text-blue-600 border-blue-200' },
  { indicator: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { indicator: 'bg-purple-500', pill: 'bg-purple-50 text-purple-600 border-purple-200' },
  { indicator: 'bg-amber-500', pill: 'bg-amber-50 text-amber-600 border-amber-200' },
  { indicator: 'bg-rose-500', pill: 'bg-rose-50 text-rose-600 border-rose-200' },
  { indicator: 'bg-sky-500', pill: 'bg-sky-50 text-sky-600 border-sky-200' },
  { indicator: 'bg-lime-500', pill: 'bg-lime-50 text-lime-600 border-lime-200' },
  { indicator: 'bg-fuchsia-500', pill: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200' }
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour)

const getColorForIndex = (index: number) =>
  COLOR_CLASSES[index % COLOR_CLASSES.length]

const formatOffsetLabel = (hour: number) =>
  `${hour.toString().padStart(2, '0')}:00`

export default function DutyScheduleModal({
  isOpen,
  onClose,
  members,
  schedule,
  onScheduleChange
}: DutyScheduleModalProps) {
  const dutyBlocks = useMemo(
    () => getDutyBlocks(schedule.blockDurationHours, schedule.startHourOffset),
    [schedule.blockDurationHours, schedule.startHourOffset]
  )

  const memberMap = useMemo(() => {
    const entries = members.map((member, index) => [
      String(member.user_id),
      { member, color: getColorForIndex(index) }
    ]) as Array<[string, { member: FamilyMember; color: typeof COLOR_CLASSES[number] }]>

    return Object.fromEntries(entries)
  }, [members])

  const handleBlockChange = (blockId: string, parentId: string) => {
    const nextBlocks = schedule.blocks.map(block =>
      block.blockId === blockId
        ? { ...block, parentId: parentId || null }
        : block
    )

    onScheduleChange({
      ...schedule,
      blocks: nextBlocks,
      updatedAt: new Date().toISOString()
    })
  }

  const handleDurationChange = (nextDuration: number) => {
    if (nextDuration === schedule.blockDurationHours) {
      return
    }

    const updated = rebuildScheduleWithDuration(schedule, nextDuration, members)
    onScheduleChange(updated)
  }

  const handleStartOffsetChange = (value: string) => {
    const nextOffset = Number(value)
    if (Number.isNaN(nextOffset) || nextOffset === schedule.startHourOffset) {
      return
    }

    const updated = rebuildScheduleWithOffset(schedule, nextOffset, members)
    onScheduleChange(updated)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">График дежурств</h2>
          <img 
            src="/icons/profile.png" 
            alt="Настройка графика дежурств" 
            className="w-16 h-16 mx-auto"
          />
        </div>

        <div className="grid gap-2 rounded-3xl border border-gray-100 bg-gray-50 p-3">
          <div>
            <p className="text-xs font-semibold text-gray-600">Длительность блока</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ALLOWED_BLOCK_DURATIONS.map(hours => {
                const isActive = hours === schedule.blockDurationHours
                return (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => handleDurationChange(hours)}
                    className={`rounded-3xl border px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-600'
                    }`}
                  >
                    {hours} ч
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600">Смещение начала суток</p>
            <select
              className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={schedule.startHourOffset}
              onChange={event => handleStartOffsetChange(event.target.value)}
            >
              {HOUR_OPTIONS.map(hour => (
                <option key={hour} value={hour}>
                  {formatOffsetLabel(hour)}
                </option>
              ))}
            </select>
          </div>
        </div>


        <div className="space-y-1">
          {dutyBlocks.map(block => {
            const assignment = findAssignmentByBlockId(schedule, block.id)
            const selectedParent = assignment?.parentId
              ? memberMap[assignment.parentId]?.member
              : undefined
            const color = assignment?.parentId
              ? memberMap[assignment.parentId]?.color
              : undefined

            return (
              <div
                key={block.id}
                className="flex items-center gap-2 p-1.5"
              >
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  {color ? (
                    <span className={`h-2 w-2 rounded-full ${color.indicator}`} aria-hidden />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gray-300" aria-hidden />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-0">
                    {block.label}
                  </p>
                </div>
                <label className="sr-only" htmlFor={`duty-block-${block.id}`}>
                  Дежурный для интервала {block.label}
                </label>
                <select
                  id={`duty-block-${block.id}`}
                  value={assignment?.parentId ?? ''}
                  onChange={event => handleBlockChange(block.id, event.target.value)}
                  className="w-36 shrink-0 rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-40"
                >
                  <option value="">Без дежурного</option>
                  {members.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {buildDisplayName(member)}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-gray-400">
            Обновлено {new Date(schedule.updatedAt).toLocaleString('ru-RU')}
          </p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  )
}
