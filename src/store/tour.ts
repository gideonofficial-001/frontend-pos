import { create } from 'zustand'

interface TourState {
  isOpen: boolean
  currentStep: number
  openTour: (step?: number) => void
  closeTour: () => void
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
}

export const useTourStore = create<TourState>((set) => ({
  isOpen: false,
  currentStep: 0,
  openTour: (step = 0) => set({ isOpen: true, currentStep: step }),
  closeTour: () => set({ isOpen: false }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  setStep: (step: number) => set({ currentStep: step }),
}))
