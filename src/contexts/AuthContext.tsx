
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { dataService, type Family, type FamilyMember } from '../services/dataService'

type FamilyLookupResult =
  | { error: string }
  | { family: Family; members: FamilyMember[] }

type AuthContextValue = {
  family: Family | null
  member: FamilyMember | null
  initialized: boolean
  findFamilyByName: (familyName: string) => Promise<FamilyLookupResult>
  selectMember: (family: Family, member: FamilyMember) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const defaultValue: AuthContextValue = {
  family: null,
  member: null,
  initialized: true,
  findFamilyByName: async () => ({ error: 'Контекст не инициализирован' }),
  selectMember: () => undefined,
  signOut: () => undefined
}

const STORAGE_KEY = 'babycare-auth-selection'

const resetDataService = () => {
  dataService.configure({
    familyId: null,
    authorId: null,
    authorName: null,
    authorRole: null
  })
}

const buildAuthorDefaults = (member: FamilyMember | null) => ({
  authorId: member?.user_id ?? null,
  authorName: member?.name?.trim() || member?.role?.trim() || 'Участник семьи',
  authorRole: member?.role?.trim() || 'Участник семьи'
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null)
  const [member, setMember] = useState<FamilyMember | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    resetDataService()

    if (typeof window === 'undefined') {
      setInitialized(true)
      return
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        console.log('Found stored auth data:', stored)
        const parsed = JSON.parse(stored) as {
          family?: Partial<Family>
          member?: Partial<FamilyMember>
        }

        if (parsed.family?.id && parsed.family?.name && parsed.member?.user_id) {
          // Дополнительная валидация данных
          const familyId = Number(parsed.family.id)
          const familyName = String(parsed.family.name).trim()
          const userId = String(parsed.member.user_id).trim()
          
          if (familyId && !isNaN(familyId) && familyName && userId) {
            const restoredFamily: Family = {
              id: familyId,
              name: familyName,
              created_at: parsed.family.created_at ?? new Date().toISOString()
            }

            const memberFamilyId = parsed.member.family_id ? Number(parsed.member.family_id) : familyId

            const restoredMember: FamilyMember = {
              family_id: memberFamilyId,
              user_id: userId,
              role: parsed.member.role ?? null,
              name: parsed.member.name ?? null,
              created_at: parsed.member.created_at ?? new Date().toISOString()
            }

            setFamily(restoredFamily)
            setMember(restoredMember)

            const defaults = buildAuthorDefaults(restoredMember)
            dataService.configure({
              familyId: restoredFamily.id,
              authorId: defaults.authorId,
              authorName: defaults.authorName,
              authorRole: defaults.authorRole
            })
            
            console.log('Auth data restored from localStorage:', { family: restoredFamily, member: restoredMember })
          } else {
            // Данные невалидны, очищаем localStorage
            console.warn('Invalid data in localStorage, clearing...')
            window.localStorage.removeItem(STORAGE_KEY)
          }
        }
      }
    } catch (error) {
      console.error('Unable to restore auth selection', error)
      // Очищаем поврежденные данные из localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } finally {
      setInitialized(true)
      console.log('Auth initialization completed. Family:', family, 'Member:', member)
    }
  }, [])

  const findFamilyByName = useCallback(async (familyName: string): Promise<FamilyLookupResult> => {
    const trimmedName = familyName.trim()
    if (!trimmedName) {
      return { error: 'Введите название семьи' }
    }

    try {
      const { data: familyRecord, error } = await supabase
        .from('families')
        .select('id, name, created_at')
        .ilike('name', trimmedName)
        .maybeSingle<Family>()

      if (error) {
        if ((error as { code?: string }).code === 'PGRST116') {
          return { error: 'Семья не найдена' }
        }

        console.error('Unable to load family by name', error)
        return { error: 'Не удалось найти семью' }
      }

      if (!familyRecord) {
        return { error: 'Семья не найдена' }
      }

      type MemberRow = Omit<FamilyMember, 'user_id'> & { user_id: string | number }

      const { data: memberRows, error: membersError } = await supabase
        .from('family_members')
        .select('family_id, user_id, role, name, created_at')
        .eq('family_id', familyRecord.id)
        .order('created_at', { ascending: true })
        .returns<MemberRow[]>()

      if (membersError) {
        console.error('Unable to load family members', membersError)
        return { error: 'Не удалось загрузить участников семьи' }
      }

      const members: FamilyMember[] = (memberRows ?? []).map(row => ({
        ...row,
        user_id: String(row.user_id)
      }))

      return { family: familyRecord, members }
    } catch (error) {
      console.error('Unexpected error while looking up family', error)
      return { error: 'Не удалось найти семью' }
    }
  }, [])

  const selectMember = useCallback((nextFamily: Family, nextMember: FamilyMember) => {
    const normalizedMember: FamilyMember = {
      ...nextMember,
      user_id: String(nextMember.user_id)
    }

    setFamily(nextFamily)
    setMember(normalizedMember)

    const defaults = buildAuthorDefaults(normalizedMember)
    dataService.configure({
      familyId: nextFamily.id,
      authorId: defaults.authorId,
      authorName: defaults.authorName,
      authorRole: defaults.authorRole
    })

    if (typeof window !== 'undefined') {
      const payload = {
        family: {
          id: nextFamily.id,
          name: nextFamily.name,
          created_at: nextFamily.created_at
        },
        member: {
          family_id: normalizedMember.family_id,
          user_id: normalizedMember.user_id,
          role: normalizedMember.role,
          name: normalizedMember.name,
          created_at: normalizedMember.created_at
        }
      }

      try {
        const serialized = JSON.stringify(payload)
        window.localStorage.setItem(STORAGE_KEY, serialized)
        console.log('Auth data saved to localStorage:', payload)
      } catch (storageError) {
        console.error('Unable to persist auth selection', storageError)
      }
    }
  }, [])

  const signOut = useCallback(() => {
    setFamily(null)
    setMember(null)
    resetDataService()

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    family,
    member,
    initialized,
    findFamilyByName,
    selectMember,
    signOut
  }), [family, member, initialized, findFamilyByName, selectMember, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return defaultValue
  }

  return context
}
