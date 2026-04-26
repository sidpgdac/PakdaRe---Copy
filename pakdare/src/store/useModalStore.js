/**
 * useModalStore — Zustand store for all global modal state.
 * Extracts wardModal + complaintModal out of App.jsx (God Component)
 * so App no longer re-renders every time a modal opens/closes.
 */
import { create } from 'zustand';

export const useModalStore = create((set) => ({
  wardModal:      null,
  complaintModal: null,

  openWardModal:      (ward)      => set({ wardModal: ward }),
  closeWardModal:     ()          => set({ wardModal: null }),

  openComplaintModal: (complaint) => set({ complaintModal: complaint }),
  closeComplaintModal:()          => set({ complaintModal: null }),
  patchComplaintModal:(patch)     => set(s =>
    s.complaintModal ? { complaintModal: { ...s.complaintModal, ...patch } } : {}
  ),
}));
