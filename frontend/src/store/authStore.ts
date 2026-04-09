import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthState, User } from '../types/index'
import api from '../api'

export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.user !== null && state.tokens !== null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      loading: false,
      _hasHydrated: false,

      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),

      login: async (email: string, password: string): Promise<void> => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({ user: data.user, tokens: data.tokens, loading: false })
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      register: async (email: string, password: string, fullName?: string): Promise<void> => {
        set({ loading: true })
        try {
          const { data } = await api.post('/auth/register', {
            email,
            password,
            full_name: fullName || null,
          })
          set({ user: data.user, tokens: data.tokens, loading: false })
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      logout: () => {
        set({ user: null, tokens: null })
      },

      refreshProfile: async (): Promise<User | undefined> => {
        try {
          const { data } = await api.get<User>('/auth/me')
          set({ user: data })
          return data
        } catch {
          get().logout()
        }
      },

      forgotPassword: async (email: string): Promise<unknown> => {
        const { data } = await api.post('/auth/forgot-password', { email })
        return data
      },

      resetPassword: async (token: string, newPassword: string): Promise<unknown> => {
        const { data } = await api.post('/auth/reset-password', {
          token,
          new_password: newPassword,
        })
        return data
      },

      changePassword: async (currentPassword: string, newPassword: string): Promise<unknown> => {
        const { data } = await api.post('/auth/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
        })
        return data
      },

      verifyEmail: async (token: string): Promise<unknown> => {
        const { data } = await api.get(`/auth/verify-email?token=${token}`)
        return data
      },

      resendVerification: async (): Promise<unknown> => {
        const { data } = await api.post('/auth/resend-verification')
        return data
      },

      updateProfile: async (fullName?: string): Promise<User> => {
        const { data } = await api.put<User>('/auth/profile', { full_name: fullName ?? null })
        set({ user: data })
        return data
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, tokens: state.tokens }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
