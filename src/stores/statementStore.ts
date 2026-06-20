import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MonthlyStatement, AdjustmentRecord } from '@/types';
import { generateId } from '@/lib/utils';

interface StatementState {
  statements: MonthlyStatement[];
  adjustments: AdjustmentRecord[];
  addStatement: (s: Omit<MonthlyStatement, 'id'>) => MonthlyStatement;
  getStatement: (year: number, month: number) => MonthlyStatement | undefined;
  getStatementById: (id: string) => MonthlyStatement | undefined;
  hasStatement: (year: number, month: number) => boolean;
  deleteStatement: (id: string) => void;
  addAdjustment: (a: Omit<AdjustmentRecord, 'id' | 'createdAt'>) => AdjustmentRecord;
  getAdjustmentsByMonth: (year: number, month: number) => AdjustmentRecord[];
  getAdjustmentsSinceArchive: (year: number, month: number) => AdjustmentRecord[];
}

export const useStatementStore = create<StatementState>()(
  persist(
    (set, get) => ({
      statements: [],
      adjustments: [],

      addStatement: (s) => {
        const full: MonthlyStatement = { ...s, id: generateId() };
        set((state) => ({ statements: [...state.statements, full] }));
        return full;
      },

      getStatement: (year, month) =>
        get().statements.find((s) => s.year === year && s.month === month),

      getStatementById: (id) => get().statements.find((s) => s.id === id),

      hasStatement: (year, month) =>
        get().statements.some((s) => s.year === year && s.month === month),

      deleteStatement: (id) =>
        set((state) => ({ statements: state.statements.filter((s) => s.id !== id) })),

      addAdjustment: (a) => {
        const full: AdjustmentRecord = { ...a, id: generateId(), createdAt: new Date().toISOString() };
        set((state) => ({ adjustments: [...state.adjustments, full] }));
        return full;
      },

      getAdjustmentsByMonth: (year, month) =>
        get().adjustments.filter((a) => a.year === year && a.month === month),

      getAdjustmentsSinceArchive: (year, month) => {
        const stmt = get().statements.find((s) => s.year === year && s.month === month);
        if (!stmt) return [];
        const archiveTime = new Date(stmt.archivedAt).getTime();
        return get().adjustments.filter(
          (a) => a.year === year && a.month === month && new Date(a.createdAt).getTime() > archiveTime,
        );
      },
    }),
    { name: 'mbs-statement-store' },
  ),
);
