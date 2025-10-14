import React from 'react'

interface HistoryFiltersProps {
  selectedFilter: string
  onFilterChange: (filter: string) => void
}

const filters = [
  { id: 'all', label: 'Все', icon: '📋' },
  { id: 'feeding', label: 'Кормления', icon: '🍼' },
  { id: 'diaper', label: 'Подгузники', icon: '💧' },
  { id: 'bath', label: 'Купания', icon: '🛁' },
  { id: 'activity', label: 'Активности', icon: '🎯' },
  { id: 'sleep', label: 'Сон', icon: '😴' }
]

export default function HistoryFilters({ selectedFilter, onFilterChange }: HistoryFiltersProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto mb-3">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`flex items-center gap-1 px-3 py-2 rounded-3xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
            selectedFilter === filter.id
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  )
}
