import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quota, QuotaPolicy } from '@/types';
import { seedQuotas, defaultQuotaPolicy } from '@/data/seed';
import { generateId } from '@/lib/utils';
import { startOfMonth, format } from 'date-fns';

interface QuotaState {
  quotas: Quota[];
  policy: QuotaPolicy;
  grantQuota: (deptId: string, year: number, month: number, amount: number) => void;
  addToQuota: (deptId: string, year: number, month: number, amount: number) => void;
  consumeQuota: (deptId: string, year: number, month: number, amount: number) => boolean;
  refundQuota: (deptId: string, year: number, month: number, amount: number) => void;
  getQuota: (deptId: string, year: number, month: number) => Quota | undefined;
  getCurrentQuota: (deptId: string) => Quota | undefined;
  getAllCurrentQuotas: () => Quota[];
  resetMonthlyQuotas: () => void;
  setPolicy: (p: Partial<QuotaPolicy>) => void;
  reset: () => void;
}

export const useQuotaStore = create<QuotaState>()(
  persist(
    (set, get) => ({
      quotas: seedQuotas,
      policy: defaultQuotaPolicy,

      grantQuota: (deptId, year, month, amount) => {
        set((s) => {
          const existing = s.quotas.find(
            (q) => q.deptId === deptId && q.year === year && q.month === month,
          );
          if (existing) {
            return {
              quotas: s.quotas.map((q) =>
                q.id === existing.id
                  ? { ...q, totalAmount: amount, usedAmount: Math.min(q.usedAmount, amount) }
                  : q,
              ),
            };
          }
          const nq: Quota = {
            id: generateId('quota'),
            deptId,
            year,
            month,
            totalAmount: amount,
            usedAmount: 0,
            resetAt: startOfMonth(new Date(year, month - 1)).toISOString(),
          };
          return { quotas: [...s.quotas, nq] };
        });
      },

      addToQuota: (deptId, year, month, amount) => {
        set((s) => {
          const existing = s.quotas.find(
            (q) => q.deptId === deptId && q.year === year && q.month === month,
          );
          if (existing) {
            return {
              quotas: s.quotas.map((q) =>
                q.id === existing.id
                  ? { ...q, totalAmount: q.totalAmount + amount }
                  : q,
              ),
            };
          }
          const nq: Quota = {
            id: generateId('quota'),
            deptId,
            year,
            month,
            totalAmount: amount,
            usedAmount: 0,
            resetAt: startOfMonth(new Date(year, month - 1)).toISOString(),
          };
          return { quotas: [...s.quotas, nq] };
        });
      },

      consumeQuota: (deptId, year, month, amount) => {
        const q = get().getQuota(deptId, year, month);
        if (!q) return false;
        const newUsed = q.usedAmount + amount;
        if (newUsed > q.totalAmount && get().policy.overQuotaStrategy === 'block') {
          return false;
        }
        set((s) => ({
          quotas: s.quotas.map((x) =>
            x.id === q.id ? { ...x, usedAmount: Math.round(newUsed * 100) / 100 } : x,
          ),
        }));
        return true;
      },

      refundQuota: (deptId, year, month, amount) => {
        const q = get().getQuota(deptId, year, month);
        if (!q) return;
        set((s) => ({
          quotas: s.quotas.map((x) =>
            x.id === q.id
              ? { ...x, usedAmount: Math.max(0, Math.round((x.usedAmount - amount) * 100) / 100) }
              : x,
          ),
        }));
      },

      getQuota: (deptId, year, month) =>
        get().quotas.find(
          (q) => q.deptId === deptId && q.year === year && q.month === month,
        ),

      getCurrentQuota: (deptId) => {
        const now = new Date();
        return get().getQuota(deptId, now.getFullYear(), now.getMonth() + 1);
      },

      getAllCurrentQuotas: () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const result: Quota[] = [];
        for (const q of get().quotas) {
          if (q.year === y && q.month === m) result.push(q);
        }
        return result;
      },

      resetMonthlyQuotas: () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const resetAt = startOfMonth(now).toISOString();
        set((s) => ({
          quotas: s.quotas.map((q) =>
            q.year === y && q.month === m
              ? { ...q, usedAmount: 0, resetAt }
              : q,
          ),
        }));
      },

      setPolicy: (p) => set((s) => ({ policy: { ...s.policy, ...p } })),

      reset: () => set({ quotas: seedQuotas, policy: defaultQuotaPolicy }),
    }),
    { name: 'mbs-quota-store' },
  ),
);
