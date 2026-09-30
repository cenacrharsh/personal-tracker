import { create } from "zustand"

import { api } from "@/data/api"

export type AuthUser = { id: string; email: string; name: string }

type AuthStatus = "checking" | "authed" | "anon"

type AuthState = {
  user: AuthUser | null
  status: AuthStatus

  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "checking",

  checkAuth: async () => {
    try {
      const { user } = await api<{ user: AuthUser }>("/auth/me")
      set({ user, status: "authed" })
    } catch {
      set({ user: null, status: "anon" })
    }
  },

  login: async (email, password) => {
    const { user } = await api<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    set({ user, status: "authed" })
  },

  signup: async (name, email, password) => {
    const { user } = await api<{ user: AuthUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })
    set({ user, status: "authed" })
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" })
    } finally {
      set({ user: null, status: "anon" })
    }
  },
}))

// Fired by the api client on a 401 from any non-auth route. Reload (as logout
// does) rather than just flipping to the login screen: the data stores would
// otherwise keep this session's data cached into the next login.
window.addEventListener("api:unauthorized", () => {
  window.location.reload()
})
