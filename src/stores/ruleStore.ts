import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RecurringRule } from '@/types';
import { seedRecurringRules } from '@/data/seed';
import { generateId } from '@/lib/utils';

interface RuleState {
  rules: RecurringRule[];
  addRule: (r: Omit<RecurringRule, 'id'>) => RecurringRule;
  updateRule: (id: string, r: Partial<RecurringRule>) => void;
  removeRule: (id: string) => void;
  toggleRuleEnabled: (id: string) => void;
  getActiveRules: () => RecurringRule[];
  reset: () => void;
}

export const useRuleStore = create<RuleState>()(
  persist(
    (set, get) => ({
      rules: seedRecurringRules,

      addRule: (r) => {
        const nr = { ...r, id: generateId('rule') };
        set((s) => ({ rules: [...s.rules, nr] }));
        return nr;
      },

      updateRule: (id, r) =>
        set((s) => ({
          rules: s.rules.map((x) => (x.id === id ? { ...x, ...r } : x)),
        })),

      removeRule: (id) =>
        set((s) => ({ rules: s.rules.filter((x) => x.id !== id) })),

      toggleRuleEnabled: (id) =>
        set((s) => ({
          rules: s.rules.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x,
          ),
        })),

      getActiveRules: () => get().rules.filter((r) => r.enabled),

      reset: () => set({ rules: seedRecurringRules }),
    }),
    { name: 'mbs-rule-store' },
  ),
);
