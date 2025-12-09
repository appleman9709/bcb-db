import { ReactNode, useEffect } from 'react'
import React from 'react';

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl'
  }

  return (
    <div className="modal-overlay">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}>
      </div>
      {/* Modal - объединяем контейнер и содержимое */}
      <div 
        className={`px-3 py-4 modal-content relative w-full ${sizeClasses[size]} mt-10 flex flex-col overflow-hidden overflow-x-hidden rounded-3xl bg-white shadow-2xl animate-bounce-in`}>

        {/* Content */}
        {children}
              {/* Close button */}
      <button
          onClick={onClose}
          className="z-50 absolute top-6 right-6 rounded-3xl p-1.5 text-gray-400 transition-colors duration-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

