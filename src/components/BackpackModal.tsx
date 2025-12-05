import React from 'react'
import { createPortal } from 'react-dom'

interface InventoryTotals {
  diapers: number
  grams: number
  portions: number
  rawPortions: number
  portionsSource: number
  portionSize: number
}

interface BackpackModalProps {
  isOpen: boolean
  onClose: () => void
  backpackIntroMessage: string
  lowOnDiapers: boolean
  lowOnFormula: boolean
  inventoryTotals: InventoryTotals
  displayPortionsText: string
  portionSizeOunces: number
  portionSizeOuncesInput: string
  onPortionSizeOuncesInputChange: (value: string) => void
  handleApplyPortionSize: () => void
  portionSizeStatus: string | null
  portionSizeStatusClass: string
  restockDiapersInput: string
  restockGramsInput: string
  setRestockDiapersInput: (value: string) => void
  setRestockGramsInput: (value: string) => void
  handleRestockSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  restockPortionsPreviewText: string
  restockLoading: boolean
  restockFeedback: string | null
  restockFeedbackClass: string
}

const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  backpackIntroMessage,
  lowOnDiapers,
  lowOnFormula,
  inventoryTotals,
  displayPortionsText,
  portionSizeOunces,
  portionSizeOuncesInput,
  onPortionSizeOuncesInputChange,
  handleApplyPortionSize,
  portionSizeStatus,
  portionSizeStatusClass,
  restockDiapersInput,
  restockGramsInput,
  setRestockDiapersInput,
  setRestockGramsInput,
  handleRestockSubmit,
  restockPortionsPreviewText,
  restockLoading,
  restockFeedback,
  restockFeedbackClass
}) => {
  if (!isOpen) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-3 py-6 sm:px-4 sm:py-10 sm:pb-16">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Рюкзак семьи"
        className="relative z-[100000] w-full max-w-[360px] pointer-events-auto sm:max-w-md"
      >
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl animate-bounce-in">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 transition-colors"
            aria-label="Закрыть рюкзак"
          >
            ×
          </button>

          <div className="px-3 pt-3 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center">
                <img
                  src="/icons/bag.png"
                  alt="Рюкзак"
                  className="h-10 w-10"
                />
              </div>
              <div className="flex-1">
                <h3>Рюкзак семьи</h3>
                <p className="text-[10px]">{backpackIntroMessage}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 px-3 pb-2 pt-2.5 overflow-y-auto sm:gap-3 sm:px-4 sm:pb-3 sm:pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl border p-2.5 ${lowOnDiapers ? "border-amber-200 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/60"}`}>
                <div className="text-[9px] font-semibold uppercase tracking-wide">Подгузники</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold">{inventoryTotals.diapers}</span>
                  <span className="text-[10px] font-semibold">шт.</span>
                </div>
              </div>

              <div className={`rounded-xl border p-2.5 ${lowOnFormula ? "border-amber-200 bg-amber-50/70" : "border-indigo-100 bg-indigo-50/60"}`}>
                <div className="text-[9px] font-semibold uppercase tracking-wide">Смесь</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold">{displayPortionsText}</span>
                  <span className="text-[10px] font-semibold">порций</span>
                </div>
                <p className="mt-1 text-[9px]">
                  ~{inventoryTotals.grams} г / {portionSizeOunces} оз на порцию
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr,0.8fr] sm:items-center sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Размер порции</span>
                  <span className="text-[10px]">унц.</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(portionSizeOuncesInput) || 1
                      const newValue = Math.max(0.5, current - 0.5)
                      onPortionSizeOuncesInputChange(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Уменьшить размер порции"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold">
                    {portionSizeOuncesInput}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(portionSizeOuncesInput) || 1
                      const newValue = Math.min(20, current + 0.5)
                      onPortionSizeOuncesInputChange(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Увеличить размер порции"
                  >
                    +
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[9px]">
                  Выбранное значение указано в унциях.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyPortionSize}
                className="h-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow transition-colors"
              >
                Сохранить
              </button>
              {portionSizeStatus && (
                <p className={`col-span-full text-center text-[10px] ${portionSizeStatusClass}`}>
                  {portionSizeStatus}
                </p>
              )}
            </div>

            <form
              className="grid grid-cols-1 gap-2 rounded-xl sm:grid-cols-2 sm:gap-3"
              onSubmit={handleRestockSubmit}
            >
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
                  <span>Подгузники</span>
                  <span className="text-[9px]">шт.</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(restockDiapersInput) || 0
                      const newValue = Math.max(0, current - 25)
                      setRestockDiapersInput(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Уменьшить количество подгузников"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold">
                    {restockDiapersInput || "0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(restockDiapersInput) || 0
                      const newValue = Math.min(500, current + 25)
                      setRestockDiapersInput(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Увеличить количество подгузников"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
                  <span>Смесь</span>
                  <span className="text-[9px]">г</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(restockGramsInput) || 0
                      const newValue = Math.max(0, current - 100)
                      setRestockGramsInput(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Уменьшить количество смеси"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold">
                    {restockGramsInput || "0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(restockGramsInput) || 0
                      const newValue = Math.min(4000, current + 100)
                      setRestockGramsInput(newValue.toString())
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    aria-label="Увеличить количество смеси"
                  >
                    +
                  </button>
                </div>
                {restockPortionsPreviewText && (
                  <span className="mt-1.5 block text-[9px] font-medium">
                    ≈ {restockPortionsPreviewText} порций ({portionSizeOunces} оз.)
                  </span>
                )}
              </div>

              <div className="col-span-full flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <button
                  type="submit"
                  disabled={restockLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                >
                  {restockLoading ? "Обработка..." : "Добавить в запасы"}
                </button>

                {restockFeedback && (
                  <div className={`text-center text-[10px] font-medium ${restockFeedbackClass}`} aria-live="polite">
                    {restockFeedback}
                  </div>
                )}
              </div>
            </form>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Закрыть
            </button>

          </div>
        </div>
      </div>,
      document.body
    )
}

export default BackpackModal