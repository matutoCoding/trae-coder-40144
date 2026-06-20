import { Quota } from '@/types';
import { OverQuotaStrategy } from '@/types';

export interface QuotaCheckResult {
  ok: boolean;
  remaining: number;
  shortfall: number;
  strategy: OverQuotaStrategy;
  message: string;
}

export function checkQuota(
  quota: Quota | undefined,
  amount: number,
  strategy: OverQuotaStrategy,
): QuotaCheckResult {
  const total = quota?.totalAmount ?? 0;
  const used = quota?.usedAmount ?? 0;
  const remaining = Math.max(0, total - used);
  const willUse = used + amount;
  const ok = willUse <= total;
  const shortfall = Math.max(0, willUse - total);

  let message = '';
  if (ok) {
    message = `额度充足：可用 ¥${remaining.toFixed(2)}，本次消费 ¥${amount.toFixed(2)}`;
  } else {
    switch (strategy) {
      case 'block':
        message = `额度不足，已拦截：差额 ¥${shortfall.toFixed(2)}`;
        break;
      case 'apply':
        message = `额度不足：差额 ¥${shortfall.toFixed(2)}，需提交申请`;
        break;
      case 'selfpay':
        message = `额度不足：差额 ¥${shortfall.toFixed(2)}，将转自费`;
        break;
    }
  }
  return { ok, remaining, shortfall, strategy, message };
}

export function getQuotaPercent(quota: Quota | undefined): number {
  if (!quota || quota.totalAmount <= 0) return 0;
  return Math.min(100, Math.round((quota.usedAmount / quota.totalAmount) * 100));
}

export function getQuotaStatus(quota: Quota | undefined): 'normal' | 'warning' | 'danger' {
  const p = getQuotaPercent(quota);
  if (p >= 100) return 'danger';
  if (p >= 80) return 'warning';
  return 'normal';
}
