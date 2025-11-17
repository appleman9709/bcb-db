import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { dataService, type Illness, type Medication, type MedicationReminder } from '../services/dataService'

interface EditIllnessModalProps {
  isOpen: boolean
  illness: Illness | null
  onClose: () => void
  onSuccess: () => void
}

const TIMING_OPTIONS = [
  { value: 'before_meal' as const, label: 'Перед едой' },
  { value: 'after_meal' as const, label: 'После еды' },
  { value: 'during_meal' as const, label: 'Во время еды' },
  { value: 'anytime' as const, label: 'Неважно' }
]

const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4, 5, 6]
const DURATION_DAYS_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14, 21, 30]

export default function EditIllnessModal({ isOpen, illness, onClose, onSuccess }: EditIllnessModalProps) {
  const [illnessName, setIllnessName] = useState('')
  const [doctorDate, setDoctorDate] = useState('')
  const [doctorTime, setDoctorTime] = useState('')
  const [medications, setMedications] = useState<Medication[]>([])
  const [medicationReminders, setMedicationReminders] = useState<Map<number, MedicationReminder[]>>(new Map())
  const [newMedication, setNewMedication] = useState({
    name: '',
    timing_type: 'before_meal' as 'before_meal' | 'after_meal' | 'during_meal' | 'anytime',
    times_per_day: 2,
    duration_days: 5
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (illness && isOpen) {
      setIllnessName(illness.name)
      if (illness.doctor_appointment_time) {
        const dateTime = new Date(illness.doctor_appointment_time)
        setDoctorDate(dateTime.toISOString().split('T')[0])
        setDoctorTime(dateTime.toTimeString().slice(0, 5))
      } else {
        setDoctorDate('')
        setDoctorTime('')
      }
      loadMedications()
    }
  }, [illness, isOpen])

  const loadMedications = async () => {
    if (!illness) return
    try {
      const meds = await dataService.getMedications(illness.id)
      setMedications(meds)
      
      // Загружаем напоминания для каждого лекарства
      const remindersMap = new Map<number, MedicationReminder[]>()
      for (const med of meds) {
        const reminders = await dataService.getMedicationReminders(med.id, 'pending')
        // Фильтруем только будущие напоминания для отображения
        const now = new Date()
        const futureReminders = reminders.filter(r => new Date(r.scheduled_time) > now)
        remindersMap.set(med.id, futureReminders)
      }
      setMedicationReminders(remindersMap)
    } catch (err) {
      console.error('Error loading medications:', err)
    }
  }

  const handleSave = async () => {
    if (!illness) return

    if (!illnessName.trim()) {
      setError('Введите название заболевания')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await dataService.updateIllness(illness.id, {
        name: illnessName,
        doctor_appointment_date: doctorDate || null,
        doctor_appointment_time: doctorDate && doctorTime ? `${doctorDate}T${doctorTime}:00` : null
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error updating illness:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMedication = async () => {
    if (!illness) return

    if (!newMedication.name.trim()) {
      setError('Введите название лекарства')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await dataService.addMedication({
        illness_id: illness.id,
        name: newMedication.name,
        timing_type: newMedication.timing_type,
        times_per_day: newMedication.times_per_day,
        duration_days: newMedication.duration_days,
        start_date: new Date().toISOString()
      })

      await loadMedications()
        setNewMedication({
          name: '',
          timing_type: 'before_meal' as 'before_meal' | 'after_meal' | 'during_meal' | 'anytime',
          times_per_day: 2,
          duration_days: 5
        })
    } catch (err) {
      console.error('Error adding medication:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при добавлении лекарства')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMedication = async (medicationId: number) => {
    if (!illness) return

    if (!confirm('Удалить это лекарство?')) return

    setLoading(true)
    try {
      await dataService.deleteMedication(medicationId)
      await loadMedications()
    } catch (err) {
      console.error('Error deleting medication:', err)
      setError('Не удалось удалить лекарство')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkMedicationTaken = async (medicationId: number) => {
    if (!illness) return

    setLoading(true)
    try {
      // Получаем все напоминания (включая прошедшие)
      const allReminders = await dataService.getMedicationReminders(medicationId)
      const now = new Date()
      
      // Находим ближайшее невыполненное напоминание (прошедшее или будущее)
      const pendingReminders = allReminders.filter(r => r.status === 'pending')
      
      if (pendingReminders.length === 0) {
        // Если нет невыполненных напоминаний, просто обновляем список
        await loadMedications()
        setLoading(false)
        return
      }

      // Сортируем по времени и берем ближайшее (может быть прошедшим)
      const nearestReminder = pendingReminders.sort((a, b) => 
        Math.abs(new Date(a.scheduled_time).getTime() - now.getTime()) - 
        Math.abs(new Date(b.scheduled_time).getTime() - now.getTime())
      )[0]

      if (nearestReminder) {
        await dataService.completeMedicationReminder(nearestReminder.id)
        await loadMedications()
      }
    } catch (err) {
      console.error('Error marking medication as taken:', err)
      setError('Не удалось отметить прием лекарства')
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async () => {
    if (!illness) return

    if (!confirm('Отметить болезнь как вылеченную? Это скроет её из списка активных болезней.')) return

    setLoading(true)
    setError(null)

    try {
      await dataService.updateIllness(illness.id, {
        is_active: false
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error marking illness as recovered:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen || !illness) return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-3 py-6 sm:px-4 sm:py-10">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Редактировать болезнь"
        className="relative z-[100000] w-full max-w-[420px] pointer-events-auto sm:max-w-md"
      >
        <div className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Редактировать болезнь</h3>
                <p className="mt-1 text-xs text-slate-600">{illness.name}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Название заболевания */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Название заболевания
                </label>
                <input
                  type="text"
                  value={illnessName}
                  onChange={(e) => setIllnessName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Запись к врачу */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Запись к врачу
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Дата
                    </label>
                    <input
                      type="date"
                      value={doctorDate}
                      onChange={(e) => setDoctorDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Время
                    </label>
                    <input
                      type="time"
                      value={doctorTime}
                      onChange={(e) => setDoctorTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Лекарства */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Лекарства
                </label>

                {medications.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {medications.map((med) => {
                      const reminders = medicationReminders.get(med.id) || []
                      const nextReminder = reminders.length > 0 
                        ? reminders.sort((a, b) => 
                            new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
                          )[0]
                        : null
                      const isExpired = new Date(med.end_date) < new Date()

                      return (
                        <div key={med.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{med.name}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {TIMING_OPTIONS.find(o => o.value === med.timing_type)?.label}, {med.times_per_day} раз(а) в день, {med.duration_days} дней
                              </p>
                              <p className={`text-xs mt-1 ${isExpired ? 'text-slate-400' : 'text-slate-500'}`}>
                                До: {new Date(med.end_date).toLocaleDateString('ru-RU')}
                              </p>
                              {nextReminder && !isExpired && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                  Следующий прием: {new Date(nextReminder.scheduled_time).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                              {reminders.length === 0 && !isExpired && (
                                <p className="text-xs text-slate-400 mt-1 italic">
                                  Нет запланированных приемов
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedication(med.id)}
                              disabled={loading}
                              className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                              aria-label="Удалить"
                            >
                              ×
                            </button>
                          </div>
                          {!isExpired && (
                            <button
                              type="button"
                              onClick={() => handleMarkMedicationTaken(med.id)}
                              disabled={loading}
                              className="w-full mt-2 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <span>✓</span>
                              <span>Отметить прием</span>
                            </button>
                          )}
                          {isExpired && (
                            <p className="text-xs text-slate-400 mt-2 text-center italic">
                              Курс лечения завершен
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Форма добавления нового лекарства */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Название лекарства/мази
                    </label>
                    <input
                      type="text"
                      value={newMedication.name}
                      onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                      placeholder="Название лекарства/мази"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Время приема
                    </label>
                    <select
                      value={newMedication.timing_type}
                      onChange={(e) => setNewMedication({ ...newMedication, timing_type: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {TIMING_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Раз в день
                      </label>
                      <select
                        value={newMedication.times_per_day}
                        onChange={(e) => setNewMedication({ ...newMedication, times_per_day: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {TIMES_PER_DAY_OPTIONS.map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Дней
                      </label>
                      <select
                        value={newMedication.duration_days}
                        onChange={(e) => setNewMedication({ ...newMedication, duration_days: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {DURATION_DAYS_OPTIONS.map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMedication}
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    Добавить лекарство
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-4 space-y-2">
            <button
              type="button"
              onClick={handleRecover}
              disabled={loading}
              className="w-full rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              ✓ Выздоровел
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

