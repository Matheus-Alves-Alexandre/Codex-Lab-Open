import { create } from 'zustand';

interface ReaderState {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  // future expanding options like fit, layout, etc
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
}));
