import { useBookingStore } from '@/stores/bookingStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useQuotaStore } from '@/stores/quotaStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { MonthlyStatement, MonthlyStatementDeptSummary, MonthlyStatementItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { calcHours, formatTime } from '@/utils/dateUtils';
import { useStatementStore } from '@/stores/statementStore';

export interface MonthlyStatementSummary {
  totalQuota: number;
  totalUsedQuota: number;
  totalRemaining: number;
  totalSelfPay: number;
  totalPendingApply: number;
  totalRejected: number;
  totalFinalCheck: number;
}

export function buildMonthlyStatement(year: number, month: number): {
  deptSummaries: MonthlyStatementDeptSummary[];
  items: MonthlyStatementItem[];
  summary: MonthlyStatementSummary;
} {
  const { departments, getDeptById, getRoomById } = useMeetingStore.getState();
  const { getQuota } = useQuotaStore.getState();
  const { filterExpenses } = useExpenseStore.getState();
  const { bookings } = useBookingStore.getState();

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const monthExpenses = filterExpenses({ startDate: monthStart, endDate: monthEnd });
  const monthBookings = bookings.filter(
    (b) => b.startAt.slice(0, 10) >= monthStart && b.startAt.slice(0, 10) <= monthEnd,
  );

  const bookingMap = new Map(monthBookings.map((b) => [b.id, b]));

  const items: MonthlyStatementItem[] = monthExpenses.map((e) => {
    const b = bookingMap.get(e.bookingId);
    const room = getRoomById(e.roomId);
    return {
      expenseId: e.id,
      bookingId: e.bookingId,
      deptId: e.deptId,
      roomId: e.roomId,
      expenseDate: e.expenseDate,
      hours: e.hours,
      unitPrice: e.unitPrice,
      amount: e.amount,
      payType: e.payType,
      reimburser: e.reimburser,
      meetingTitle: b?.title ?? '-',
      meetingRoomName: room?.name ?? '-',
      meetingStartTime: b?.startAt ? formatTime(b.startAt) : '-',
      meetingEndTime: b?.endAt ? formatTime(b.endAt) : '-',
      source: b?.source ?? 'manual',
      approveAt: b?.approveAt ?? e.approveAt,
      rejectAt: b?.rejectAt ?? e.rejectAt,
      rejectRemark: b?.rejectRemark ?? e.rejectRemark,
    };
  });

  const deptMap = new Map<string, MonthlyStatementDeptSummary>();
  for (const dept of departments) {
    deptMap.set(dept.id, {
      deptId: dept.id,
      deptName: dept.name,
      totalQuota: 0,
      usedQuota: 0,
      remainingQuota: 0,
      selfPay: 0,
      pendingApply: 0,
      rejected: 0,
      finalCheckAmount: 0,
    });
  }

  for (const e of monthExpenses) {
    const ds = deptMap.get(e.deptId);
    if (!ds) continue;
    if (e.payType === 'quota') ds.usedQuota += e.amount;
    else if (e.payType === 'selfpay') ds.selfPay += e.amount;
    else if (e.payType === 'pending_apply') ds.pendingApply += e.amount;
    else if (e.payType === 'rejected') ds.rejected += e.amount;
  }

  const deptSummaries: MonthlyStatementDeptSummary[] = [];
  for (const dept of departments) {
    const q = getQuota(dept.id, year, month);
    const ds = deptMap.get(dept.id)!;
    ds.totalQuota = q?.totalAmount ?? 0;
    ds.remainingQuota = Math.max(0, ds.totalQuota - ds.usedQuota);
    ds.finalCheckAmount = ds.usedQuota + ds.selfPay;
    deptSummaries.push({
      ...ds,
      usedQuota: Math.round(ds.usedQuota * 100) / 100,
      selfPay: Math.round(ds.selfPay * 100) / 100,
      pendingApply: Math.round(ds.pendingApply * 100) / 100,
      rejected: Math.round(ds.rejected * 100) / 100,
      remainingQuota: Math.round(ds.remainingQuota * 100) / 100,
      finalCheckAmount: Math.round(ds.finalCheckAmount * 100) / 100,
    });
  }

  let totalQuota = 0, totalUsedQuota = 0, totalSelfPay = 0, totalPending = 0, totalRejected = 0;
  for (const ds of deptSummaries) {
    totalQuota += ds.totalQuota;
    totalUsedQuota += ds.usedQuota;
    totalSelfPay += ds.selfPay;
    totalPending += ds.pendingApply;
    totalRejected += ds.rejected;
  }
  const totalRemaining = Math.max(0, totalQuota - totalUsedQuota);
  const totalFinalCheck = totalUsedQuota + totalSelfPay;

  const summary: MonthlyStatementSummary = {
    totalQuota: Math.round(totalQuota * 100) / 100,
    totalUsedQuota: Math.round(totalUsedQuota * 100) / 100,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
    totalSelfPay: Math.round(totalSelfPay * 100) / 100,
    totalPendingApply: Math.round(totalPending * 100) / 100,
    totalRejected: Math.round(totalRejected * 100) / 100,
    totalFinalCheck: Math.round(totalFinalCheck * 100) / 100,
  };

  return { deptSummaries, items, summary };
}

export function archiveMonthlyStatement(
  year: number,
  month: number,
  remark?: string,
  archivedBy?: string,
): MonthlyStatement {
  const { deptSummaries, items, summary } = buildMonthlyStatement(year, month);
  const { addStatement, getAdjustmentsByMonth } = useStatementStore.getState();
  const adjustments = getAdjustmentsByMonth(year, month);
  return addStatement({
    year,
    month,
    deptSummaries,
    items,
    ...summary,
    archivedAt: new Date().toISOString(),
    archivedBy,
    remark,
    adjustments,
  });
}

export function exportMonthlyStatementCSV(year: number, month: number, deptId?: string): string {
  const { deptSummaries, items } = buildMonthlyStatement(year, month);
  const lines: string[] = [];

  lines.push(`# ${year}年${month}月 会议室月结单`);
  lines.push('');
  lines.push('# 部门汇总');
  lines.push('部门,总额度,已用额度,剩余额度,自费,待申请,已驳回,应核对金额(额度+自费)');
  for (const ds of deptSummaries) {
    if (deptId && ds.deptId !== deptId) continue;
    lines.push([
      ds.deptName,
      ds.totalQuota,
      ds.usedQuota,
      ds.remainingQuota,
      ds.selfPay,
      ds.pendingApply,
      ds.rejected,
      ds.finalCheckAmount,
    ].join(','));
  }
  lines.push('');
  lines.push('# 消费明细');
  lines.push('日期,部门,会议室,会议主题,来源,开始时间,结束时间,时长(h),单价,金额,支付类型,报销人,审批时间,驳回时间,驳回原因');
  const filteredItems = deptId ? items.filter((i) => i.deptId === deptId) : items;
  for (const it of filteredItems) {
    const deptName = useMeetingStore.getState().getDeptById(it.deptId)?.name ?? '-';
    const payTypeLabel =
      it.payType === 'quota' ? '额度' :
      it.payType === 'selfpay' ? '自费' :
      it.payType === 'pending_apply' ? '待申请' : '已驳回';
    lines.push([
      it.expenseDate,
      deptName,
      `"${it.meetingRoomName}"`,
      `"${it.meetingTitle}"`,
      it.source === 'manual' ? '手动' : '周期',
      it.meetingStartTime,
      it.meetingEndTime,
      it.hours.toFixed(1),
      it.unitPrice.toFixed(2),
      it.amount.toFixed(2),
      payTypeLabel,
      it.reimburser ?? '',
      it.approveAt ?? '',
      it.rejectAt ?? '',
      it.rejectRemark ? `"${it.rejectRemark}"` : '',
    ].join(','));
  }
  return lines.join('\n');
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
