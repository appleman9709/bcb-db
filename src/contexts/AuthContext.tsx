import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { dataService, type Family, type FamilyMember } from '../services/dataService'

type FamilyLookupResult =
  | { error: string }
  | { family: Family; members: FamilyMember[] }

type AuthContextValue = {
  family: Family | null
  member: FamilyMember | null
  findFamilyByName: (familyName: string) => Promise<FamilyLookupResult>
  selectMember: (family: Family, member: FamilyMember) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const defaultValue: AuthContextValue = {
  family: null,
  member: null,
  findFamilyByName: async () => ({ error: 'Контекст авторизации не инициализирован' }),
  selectMember: () => undefined,
  signOut: () => undefined
}

const resetDataService = () => {
  dataService.configure({
    familyId: null,
    authorId: null,
    authorName: null,
    authorRole: null
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null)
  const [member, setMember] = useState<FamilyMember | null>(null)

  useEffect(() => {
    resetDataService()
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
        return { error: 'Не удалось получить список ролей' }
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

    dataService.configure({
      familyId: nextFamily.id,
      authorId: normalizedMember.user_id || `${nextFamily.id}:member`,
      authorName: normalizedMember.name?.trim() || normalizedMember.role?.trim() || 'Участник семьи',
      authorRole: normalizedMember.role?.trim() || 'Участник семьи'
    })
  }, [])

  const signOut = useCallback(() => {
    setFamily(null)
    setMember(null)
    resetDataService()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    family,
    member,
    findFamilyByName,
    selectMember,
    signOut
  }), [family, member, findFamilyByName, selectMember, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return defaultValue
  }

  return context
}
