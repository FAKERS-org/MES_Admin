import type { components } from "@/lib/api/schema";
import { create } from "zustand";

type UniversityDraft = components["schemas"]["UniversityCreate"];

interface CreateUniversityState {
    step: number;
    draft: Partial<UniversityDraft>;
    setStep: (step: number) => void;
    updateDraft: (data: Partial<UniversityDraft>) => void;
    reset: () => void;
}

export const useCreateUniversityStore = create<CreateUniversityState>(set => ({
    step: 1,
    draft: {},
    setStep: step => set({ step }),
    updateDraft: data => set(state => ({ draft: { ...state.draft, ...data } })),
    reset: () => set({ step: 1, draft: {} }),
}));
