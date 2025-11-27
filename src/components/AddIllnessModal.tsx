import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { dataService, type Illness, type Medication } from '../services/dataService'

interface MedicationForm {
  name: string
  timing_type: 'before_meal' | 'after_meal' | 'during_meal' | 'anytime'
  times_per_day: number
  duration_days: number
}

interface AddIllnessModalProps {
  isOpen: boolean
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

export default function AddIllnessModal({ isOpen, onClose, onSuccess }: AddIllnessModalProps) {
  const [step, setStep] = useState(1)
  const [illnessName, setIllnessName] = useState('')
  const [hasMedications, setHasMedications] = useState<boolean | null>(null)
  const [medications, setMedications] = useState<MedicationForm[]>([])
  const [currentMedication, setCurrentMedication] = useState<MedicationForm>({
    name: '',
    timing_type: 'before_meal',
    times_per_day: 2,
    duration_days: 5
  })
  const [hasDoctorAppointment, setHasDoctorAppointment] = useState<boolean | null>(null)
  const [doctorDate, setDoctorDate] = useState('')
  const [doctorTime, setDoctorTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleNext = () => {
    if (step === 1) {
      if (!illnessName.trim()) {
        setError('Введите название заболевания')
        return
      }
      setError(null)
      setStep(2)
    } else if (step === 2) {
      if (hasMedications === null) {
        setError('Выберите ответ')
        return
      }
      if (hasMedications && medications.length === 0) {
        setError('Добавьте хотя бы одно лекарство')
        return
      }
      setError(null)
      setStep(3)
    } else if (step === 3) {
      if (hasDoctorAppointment === null) {
        setError('Выберите ответ')
        return
      }
      if (hasDoctorAppointment && (!doctorDate || !doctorTime)) {
        setError('Укажите дату и время записи к врачу')
        return
      }
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
    }
  }

  const handleAddMedication = () => {
    if (!currentMedication.name.trim()) {
      setError('Введите название лекарства')
      return
    }
    setError(null)
    setMedications([...medications, currentMedication])
    setCurrentMedication({
      name: '',
      timing_type: 'before_meal',
      times_per_day: 2,
      duration_days: 5
    })
  }

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // Создаем болезнь
      const illness = await dataService.addIllness({
        name: illnessName,
        doctor_appointment_date: hasDoctorAppointment && doctorDate ? doctorDate : undefined,
        doctor_appointment_time: hasDoctorAppointment && doctorDate && doctorTime 
          ? `${doctorDate}T${doctorTime}:00` 
          : undefined
      })

      if (!illness) {
        throw new Error('Не удалось создать запись о болезни')
      }

      // Добавляем лекарства
      if (hasMedications && medications.length > 0) {
        const startDate = new Date().toISOString()
        for (const med of medications) {
          await dataService.addMedication({
            illness_id: illness.id,
            name: med.name,
            timing_type: med.timing_type,
            times_per_day: med.times_per_day,
            duration_days: med.duration_days,
            start_date: startDate
          })
        }
      }

      // Сбрасываем форму
      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error adding illness:', err)
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setIllnessName('')
    setHasMedications(null)
    setMedications([])
    setCurrentMedication({
      name: '',
      timing_type: 'before_meal',
      times_per_day: 2,
      duration_days: 5
    })
    setHasDoctorAppointment(null)
    setDoctorDate('')
    setDoctorTime('')
    setError(null)
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onClose()
    }
  }

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
        aria-label="Добавить болезнь"
        className="relative z-[100000] w-full max-w-[420px] pointer-events-auto sm:max-w-md"
      >
        <div className="relative max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Добавить болезнь</h3>
                <p className="mt-1 text-xs text-slate-600">Шаг {step} из 3</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 transition-colors disabled:opacity-50"
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

            {/* Step 1: Название заболевания */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Название заболевания
                  </label>
                  <input
                    type="text"
                    value={illnessName}
                    onChange={(e) => setIllnessName(e.target.value)}
                    placeholder="Например: Воспаление пальца на ноге"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2: Лекарства */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    Есть лекарства для приема по расписанию?
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHasMedications(true)
                        setError(null)
                      }}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        hasMedications === true
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasMedications(false)
                        setMedications([])
                        setError(null)
                      }}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        hasMedications === false
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>

                {hasMedications && (
                  <div className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {medications.map((med, index) => (
                        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{med.name}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {TIMING_OPTIONS.find(o => o.value === med.timing_type)?.label}, {med.times_per_day} раз(а) в день, {med.duration_days} дней
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedication(index)}
                              className="ml-2 text-red-500"
                              aria-label="Удалить"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Какие?
                        </label>
                        <input
                          type="text"
                          value={currentMedication.name}
                          onChange={(e) => setCurrentMedication({ ...currentMedication, name: e.target.value })}
                          placeholder="Название лекарства/мази"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Какое время приема?
                        </label>
                        <select
                          value={currentMedication.timing_type}
                          onChange={(e) => setCurrentMedication({ ...currentMedication, timing_type: e.target.value as any })}
                          className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 transition-all duration-200 flex items-center"
                        >
                          {TIMING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Сколько раз в день?
                        </label>
                        <select
                          value={currentMedication.times_per_day}
                          onChange={(e) => setCurrentMedication({ ...currentMedication, times_per_day: parseInt(e.target.value) })}
                          className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 transition-all duration-200 flex items-center"
                        >
                          {TIMES_PER_DAY_OPTIONS.map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Сколько дней принимать?
                        </label>
                        <select
                          value={currentMedication.duration_days}
                          onChange={(e) => setCurrentMedication({ ...currentMedication, duration_days: parseInt(e.target.value) })}
                          className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 transition-all duration-200 flex items-center"
                        >
                          {DURATION_DAYS_OPTIONS.map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMedication}
                        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
                      >
                        Добавить лекарство
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Запись к врачу */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    Есть запись к врачу?
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHasDoctorAppointment(true)
                        setError(null)
                      }}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        hasDoctorAppointment === true
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasDoctorAppointment(false)
                        setDoctorDate('')
                        setDoctorTime('')
                        setError(null)
                      }}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        hasDoctorAppointment === false
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Нет
                    </button>
                  </div>
                </div>

                {hasDoctorAppointment && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Когда? (Дата)
                      </label>
                      <input
                        type="date"
                        value={doctorDate}
                        onChange={(e) => setDoctorDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 transition-all duration-200 flex items-center"
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
                        className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-2 transition-all duration-200 flex items-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className=" px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors disabled:opacity-50"
                >
                  Назад
                </button>
              )}
              <button
                type="button"
                onClick={step === 3 ? handleSubmit : handleNext}
                disabled={loading}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Сохранение...' : step === 3 ? 'Сохранить' : 'Далее'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

