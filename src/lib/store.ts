import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserState {
    hasCompletedOnboarding: boolean;
    dietPhase: 'elimination' | 'reintroduction' | 'maintenance';
    weeklyBudget: number;
    peopleToFeed: number;
    knownTriggers: string[];
    setHasCompletedOnboarding: (val: boolean) => void;
    setDietPhase: (phase: 'elimination' | 'reintroduction' | 'maintenance') => void;
    setWeeklyBudget: (budget: number) => void;
    setPeopleToFeed: (people: number) => void;
    setKnownTriggers: (triggers: string[]) => void;
    resetOnboarding: () => void;
}

// SSR-safe storage: returns a no-op when 'window' is unavailable (Next.js SSR/static build on Vercel)
const noopStorage = {
    getItem: (_name: string) => null,
    setItem: (_name: string, _value: string) => { },
    removeItem: (_name: string) => { },
};

const safeStorage = typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : createJSONStorage(() => noopStorage);

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            hasCompletedOnboarding: false,
            dietPhase: 'elimination',
            weeklyBudget: 100,
            peopleToFeed: 1,
            knownTriggers: [],

            setHasCompletedOnboarding: (val) => set({ hasCompletedOnboarding: val }),
            setDietPhase: (phase) => set({ dietPhase: phase }),
            setWeeklyBudget: (budget) => set({ weeklyBudget: budget }),
            setPeopleToFeed: (people) => set({ peopleToFeed: people }),
            setKnownTriggers: (triggers) => set({ knownTriggers: triggers }),
            resetOnboarding: () => set({
                hasCompletedOnboarding: false,
                dietPhase: 'elimination',
                weeklyBudget: 100,
                peopleToFeed: 1,
                knownTriggers: [],
            }),
        }),
        {
            name: 'gutflow-user-storage',
            storage: safeStorage,
        }
    )
);
