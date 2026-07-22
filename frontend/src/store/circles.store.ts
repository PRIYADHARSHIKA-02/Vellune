import { create } from 'zustand'

interface CircleStore {
  circles: any[]
  activeCircleId: string | null
  threads: Record<string, any[]>      // threadId → posts[]
  memberProgress: Record<string, number> // userId → progress

  setCircles: (circles: any[]) => void
  setActiveCircle: (id: string | null) => void
  setThreadPosts: (threadId: string, posts: any[]) => void
  addPost: (threadId: string, post: any) => void
  updateMemberProgress: (userId: string, progress: number) => void
  updateMyProgress: (circleId: string, page: number) => void
}

export const useCircleStore = create<CircleStore>((set) => ({
  circles: [],
  activeCircleId: null,
  threads: {},
  memberProgress: {},

  setCircles: (circles) => set({ circles }),

  setActiveCircle: (id) => set({ activeCircleId: id }),

  setThreadPosts: (threadId, posts) =>
    set((state) => ({
      threads: { ...state.threads, [threadId]: posts },
    })),

  addPost: (threadId, post) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadId]: [...(state.threads[threadId] ?? []), post],
      },
    })),

  updateMemberProgress: (userId, progress) =>
    set((state) => ({
      memberProgress: { ...state.memberProgress, [userId]: progress },
    })),

  updateMyProgress: (circleId, page) =>
    set((state) => ({
      circles: state.circles.map((c) =>
        c.id === circleId ? { ...c, my_progress: page } : c
      ),
    })),
}))
