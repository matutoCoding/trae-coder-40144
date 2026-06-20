import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense } from '@/types';
import { seedExpenses } from '@/data/seed';
import { generateId } from '@/lib/utils';

interface ExpenseFilter {
  deptId?: string;
  roomId?: string;
  startDate?: string;
  endDate?: string;
  payType?: 'quota' | 'selfpay' | 'pending_apply' | 'all';
}

interface ExpenseState {
  expenses: Expense[];
  addExpense: (e: Omit<Expense, 'id'>) => Expense;
  addExpenses: (list: Omit<Expense, 'id'>[]) => Expense[];
  updateExpense: (id: string, e: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  convertToSelfPay: (id: string, reimburser: string) => void;
  filterExpenses: (filter: ExpenseFilter) => Expense[];
  getExpenseByBookingId: (bookingId: string) => Expense | undefined;
  getStatsByDept: () => Array<{ deptId: string; total: number; selfPay: number }>;
  getStatsByRoom: () => Array<{ roomId: string; total: number; hours: number }>;
  reset: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: seedExpenses,

      addExpense: (e) => {
        const ne: Expense = { ...e, id: generateId('exp') };
        set((s) => ({ expenses: [...s.expenses, ne] }));
        return ne;
      },

      addExpenses: (list) => {
        const created = list.map((e) => ({ ...e, id: generateId('exp') }));
        set((s) => ({ expenses: [...s.expenses, ...created] }));
        return created;
      },

      updateExpense: (id, e) =>
        set((s) => ({
          expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...e } : x)),
        })),

      removeExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),

      convertToSelfPay: (id, reimburser) =>
        set((s) => ({
          expenses: s.expenses.map((x) =>
            x.id === id ? { ...x, payType: 'selfpay', reimburser } : x,
          ),
        })),

      filterExpenses: (filter) => {
        return get().expenses.filter((e) => {
          if (filter.deptId && e.deptId !== filter.deptId) return false;
          if (filter.roomId && e.roomId !== filter.roomId) return false;
          if (filter.startDate && e.expenseDate < filter.startDate) return false;
          if (filter.endDate && e.expenseDate > filter.endDate) return false;
          if (filter.payType && filter.payType !== 'all' && e.payType !== filter.payType)
            return false;
          return true;
        });
      },

      getExpenseByBookingId: (bookingId) =>
        get().expenses.find((e) => e.bookingId === bookingId),

      getStatsByDept: () => {
        const map = new Map<string, { total: number; selfPay: number }>();
        for (const e of get().expenses) {
          const cur = map.get(e.deptId) ?? { total: 0, selfPay: 0 };
          cur.total += e.amount;
          if (e.payType === 'selfpay') cur.selfPay += e.amount;
          map.set(e.deptId, cur);
        }
        return Array.from(map.entries()).map(([deptId, v]) => ({
          deptId,
          total: Math.round(v.total * 100) / 100,
          selfPay: Math.round(v.selfPay * 100) / 100,
        }));
      },

      getStatsByRoom: () => {
        const map = new Map<string, { total: number; hours: number }>();
        for (const e of get().expenses) {
          const cur = map.get(e.roomId) ?? { total: 0, hours: 0 };
          cur.total += e.amount;
          cur.hours += e.hours;
          map.set(e.roomId, cur);
        }
        return Array.from(map.entries()).map(([roomId, v]) => ({
          roomId,
          total: Math.round(v.total * 100) / 100,
          hours: Math.round(v.hours * 100) / 100,
        }));
      },

      reset: () => set({ expenses: seedExpenses }),
    }),
    { name: 'mbs-expense-store' },
  ),
);
