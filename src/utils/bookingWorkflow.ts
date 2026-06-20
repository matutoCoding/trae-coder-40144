import { useBookingStore } from '@/stores/bookingStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useQuotaStore } from '@/stores/quotaStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useStatementStore } from '@/stores/statementStore';
import { Booking, BookingStatus } from '@/types';
import { calcHours } from '@/utils/dateUtils';
import { parseISO } from 'date-fns';

function recordAdjustmentIfArchived(
  year: number,
  month: number,
  type: 'cancel' | 'reject' | 'modify',
  description: string,
  amountChange: number,
  deptId?: string,
  relatedId?: string,
) {
  const { hasStatement, addAdjustment } = useStatementStore.getState();
  if (!hasStatement(year, month)) return;
  addAdjustment({ year, month, type, description, amountChange, deptId, relatedId });
}

export interface CreateBookingParams {
  roomId: string;
  deptId: string;
  ruleId?: string;
  title: string;
  startAt: string;
  endAt: string;
  source?: 'manual' | 'recurring';
  forceSelfPay?: boolean;
  forcePendingApply?: boolean;
  applyRemark?: string;
}

export interface UpdateBookingParams {
  title?: string;
  roomId?: string;
  deptId?: string;
  startAt?: string;
  endAt?: string;
  isSelfPay?: boolean;
}

export interface WorkflowResult {
  ok: boolean;
  message: string;
  booking?: Booking;
  bookinId?: string;
  error?: string;
  quotaShortfall?: number;
}

function getYearMonth(iso: string): { year: number; month: number } {
  const d = parseISO(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function createBookingWithWorkflow(
  params: CreateBookingParams,
): WorkflowResult {
  const { getRoomById } = useMeetingStore.getState();
  const { addBooking } = useBookingStore.getState();
  const { addExpense } = useExpenseStore.getState();
  const { policy, getQuota, consumeQuota } = useQuotaStore.getState();

  const room = getRoomById(params.roomId);
  if (!room) return { ok: false, message: '会议室不存在' };

  const hours = calcHours(params.startAt, params.endAt);
  const amount = Math.round(hours * room.hourlyRate * 100) / 100;
  const { year, month } = getYearMonth(params.startAt);

  let status: BookingStatus = 'confirmed';
  let isSelfPay = false;
  let payType: 'quota' | 'selfpay' | 'pending_apply' = 'quota';

  if (params.forcePendingApply) {
    status = 'pending_apply';
    payType = 'pending_apply';
  } else if (params.forceSelfPay) {
    isSelfPay = true;
    payType = 'selfpay';
  } else {
    const quota = getQuota(params.deptId, year, month);
    const total = quota?.totalAmount ?? 0;
    const used = quota?.usedAmount ?? 0;
    const remaining = total - used;

    if (amount > remaining && !quota) {
      if (policy.overQuotaStrategy === 'block') {
        return {
          ok: false,
          message: '该部门当月未发放额度，请先发放额度',
          quotaShortfall: amount,
        };
      } else if (policy.overQuotaStrategy === 'apply') {
        status = 'pending_apply';
        payType = 'pending_apply';
      } else {
        isSelfPay = true;
        payType = 'selfpay';
      }
    } else if (amount > remaining) {
      if (policy.overQuotaStrategy === 'block') {
        return {
          ok: false,
          message: `额度不足，差额 ¥${(amount - remaining).toFixed(2)}`,
          quotaShortfall: amount - remaining,
        };
      } else if (policy.overQuotaStrategy === 'apply') {
        status = 'pending_apply';
        payType = 'pending_apply';
      } else {
        isSelfPay = true;
        payType = 'selfpay';
      }
    }
  }

  const booking = addBooking({
    roomId: params.roomId,
    deptId: params.deptId,
    ruleId: params.ruleId,
    title: params.title,
    startAt: params.startAt,
    endAt: params.endAt,
    source: params.source ?? 'manual',
    isSelfPay,
  });

  useBookingStore.getState().updateBooking(booking.id, {
    status,
    applyRemark: params.applyRemark,
  });
  const updatedBooking = { ...booking, status, isSelfPay, applyRemark: params.applyRemark };

  addExpense({
    bookingId: booking.id,
    deptId: params.deptId,
    roomId: params.roomId,
    expenseDate: params.startAt.slice(0, 10),
    hours,
    unitPrice: room.hourlyRate,
    amount,
    payType,
    reimburser: payType === 'selfpay' ? useMeetingStore.getState().getDeptById(params.deptId)?.manager : undefined,
  });

  if (payType === 'quota') {
    consumeQuota(params.deptId, year, month, amount);
  }

  return {
    ok: true,
    message: status === 'pending_apply' ? '预约已提交，等待审批' : '预约成功',
    booking: updatedBooking,
    bookinId: booking.id,
  };
}

export function createBookingsBatchWithWorkflow(
  items: CreateBookingParams[],
): { results: WorkflowResult[]; createdCount: number; pendingCount: number; selfpayCount: number; skippedCount: number; totalQuotaAmount: number; totalSelfpayAmount: number } {
  const results: WorkflowResult[] = [];
  let createdCount = 0;
  let pendingCount = 0;
  let selfpayCount = 0;
  let skippedCount = 0;
  let totalQuotaAmount = 0;
  let totalSelfpayAmount = 0;
  for (const item of items) {
    const r = createBookingWithWorkflow(item);
    results.push(r);
    if (r.ok) {
      createdCount++;
      if (r.booking?.status === 'pending_apply') pendingCount++;
      else if (r.booking?.isSelfPay) {
        selfpayCount++;
        const expense = useExpenseStore.getState().getExpenseByBookingId(r.booking.id);
        if (expense) totalSelfpayAmount += expense.amount;
      } else {
        const expense = useExpenseStore.getState().getExpenseByBookingId(r.booking!.id);
        if (expense) totalQuotaAmount += expense.amount;
      }
    } else {
      skippedCount++;
    }
  }
  return { results, createdCount, pendingCount, selfpayCount, skippedCount, totalQuotaAmount, totalSelfpayAmount };
}

export function updateBookingWithWorkflow(
  bookingId: string,
  params: UpdateBookingParams,
): WorkflowResult {
  const { getRoomById } = useMeetingStore.getState();
  const booking = useBookingStore.getState().bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false, message: '预约不存在' };

  const newStartAt = params.startAt ?? booking.startAt;
  const newEndAt = params.endAt ?? booking.endAt;
  const newRoomId = params.roomId ?? booking.roomId;
  const newDeptId = params.deptId ?? booking.deptId;
  const newIsSelfPay = params.isSelfPay ?? booking.isSelfPay;

  const oldRoom = getRoomById(booking.roomId);
  const newRoom = getRoomById(newRoomId);
  if (!oldRoom || !newRoom) return { ok: false, message: '会议室不存在' };

  const oldHours = calcHours(booking.startAt, booking.endAt);
  const oldAmount = Math.round(oldHours * oldRoom.hourlyRate * 100) / 100;

  const newHours = calcHours(newStartAt, newEndAt);
  const newAmount = Math.round(newHours * newRoom.hourlyRate * 100) / 100;

  const oldYM = getYearMonth(booking.startAt);
  const newYM = getYearMonth(newStartAt);

  const expense = useExpenseStore.getState().getExpenseByBookingId(bookingId);

  const oldPayType = expense?.payType;
  const oldQuotaConsumed = oldPayType === 'quota' ? oldAmount : 0;

  const { policy, getQuota, consumeQuota, refundQuota } = useQuotaStore.getState();

  let newPayType: 'quota' | 'selfpay' | 'pending_apply' = 'quota';
  let newStatus: BookingStatus = booking.status === 'cancelled' ? 'cancelled' : 'confirmed';

  if (booking.status === 'pending_apply' && newIsSelfPay) {
    newPayType = 'selfpay';
    newStatus = 'confirmed';
  } else if (booking.status === 'pending_apply') {
    newPayType = 'pending_apply';
    newStatus = 'pending_apply';
  } else if (newIsSelfPay) {
    newPayType = 'selfpay';
  } else {
    const targetYM = newYM;
    const quota = getQuota(newDeptId, targetYM.year, targetYM.month);
    const currentUsed = (quota?.usedAmount ?? 0) - (oldYM.year === targetYM.year && oldYM.month === targetYM.month ? oldQuotaConsumed : 0);
    const total = quota?.totalAmount ?? 0;
    const remaining = total - currentUsed;

    if (newAmount > remaining) {
      if (policy.overQuotaStrategy === 'block') {
        return {
          ok: false,
          message: `修改后额度不足，差额 ¥${(newAmount - remaining).toFixed(2)}`,
        };
      } else if (policy.overQuotaStrategy === 'apply') {
        newPayType = 'pending_apply';
        newStatus = 'pending_apply';
      } else {
        newPayType = 'selfpay';
      }
    }
  }

  useBookingStore.getState().updateBooking(bookingId, {
    title: params.title ?? booking.title,
    roomId: newRoomId,
    deptId: newDeptId,
    startAt: newStartAt,
    endAt: newEndAt,
    isSelfPay: newPayType === 'selfpay',
    status: newStatus,
  });

  if (oldPayType === 'quota') {
    refundQuota(booking.deptId, oldYM.year, oldYM.month, oldAmount);
  }

  if (expense) {
    useExpenseStore.getState().updateExpense(expense.id, {
      roomId: newRoomId,
      deptId: newDeptId,
      expenseDate: newStartAt.slice(0, 10),
      hours: newHours,
      unitPrice: newRoom.hourlyRate,
      amount: newAmount,
      payType: newPayType,
      reimburser: newPayType === 'selfpay'
        ? (useMeetingStore.getState().getDeptById(newDeptId)?.manager)
        : undefined,
    });
  } else {
    useExpenseStore.getState().addExpense({
      bookingId,
      deptId: newDeptId,
      roomId: newRoomId,
      expenseDate: newStartAt.slice(0, 10),
      hours: newHours,
      unitPrice: newRoom.hourlyRate,
      amount: newAmount,
      payType: newPayType,
      reimburser: newPayType === 'selfpay'
        ? (useMeetingStore.getState().getDeptById(newDeptId)?.manager)
        : undefined,
    });
  }

  if (newPayType === 'quota') {
    consumeQuota(newDeptId, newYM.year, newYM.month, newAmount);
  }

  const amountDelta = newAmount - oldAmount;
  const oldMonthChanged = oldYM.year !== newYM.year || oldYM.month !== newYM.month;
  if (oldMonthChanged) {
    recordAdjustmentIfArchived(
      oldYM.year,
      oldYM.month,
      'modify',
      `预约「${params.title ?? booking.title}」移出本月（已移动到 ${newYM.year}-${String(newYM.month).padStart(2, '0')}）`,
      -oldAmount,
      booking.deptId,
      booking.id,
    );
    recordAdjustmentIfArchived(
      newYM.year,
      newYM.month,
      'modify',
      `预约「${params.title ?? booking.title}」移入本月（来自 ${oldYM.year}-${String(oldYM.month).padStart(2, '0')}）`,
      newAmount,
      newDeptId,
      booking.id,
    );
  } else if (amountDelta !== 0 || oldPayType !== newPayType || booking.deptId !== newDeptId) {
    recordAdjustmentIfArchived(
      newYM.year,
      newYM.month,
      'modify',
      `修改预约「${params.title ?? booking.title}」：金额变化 ${amountDelta >= 0 ? '+' : ''}${amountDelta.toFixed(2)}，类型 ${oldPayType}→${newPayType}`,
      amountDelta,
      newDeptId,
      booking.id,
    );
  }

  return { ok: true, message: '修改成功' };
}

export function cancelBookingWithWorkflow(bookingId: string): WorkflowResult {
  const booking = useBookingStore.getState().bookings.find((b) => b.id === bookingId);
  if (!booking) return { ok: false, message: '预约不存在' };

  const room = useMeetingStore.getState().getRoomById(booking.roomId);
  if (!room) return { ok: false, message: '会议室不存在' };

  const hours = calcHours(booking.startAt, booking.endAt);
  const amount = Math.round(hours * room.hourlyRate * 100) / 100;
  const ym = getYearMonth(booking.startAt);

  const expense = useExpenseStore.getState().getExpenseByBookingId(bookingId);
  if (expense && expense.payType === 'quota') {
    useQuotaStore.getState().refundQuota(booking.deptId, ym.year, ym.month, amount);
  }

  if (expense) {
    useExpenseStore.getState().removeExpense(expense.id);
  }

  useBookingStore.getState().cancelBooking(bookingId);
  recordAdjustmentIfArchived(
    ym.year,
    ym.month,
    'cancel',
    `取消预约「${booking.title}」(${booking.startAt.slice(0, 10)})`,
    -amount,
    booking.deptId,
    booking.id,
  );
  return { ok: true, message: '预约已取消，额度已退回（如适用）' };
}

export function moveBookingWithWorkflow(
  bookingId: string,
  newStartAt: string,
  newEndAt: string,
  newRoomId?: string,
): WorkflowResult {
  const res = updateBookingWithWorkflow(bookingId, {
    startAt: newStartAt,
    endAt: newEndAt,
    roomId: newRoomId,
  });
  return res;
}

export function approvePendingBooking(bookingId: string): WorkflowResult {
  const booking = useBookingStore.getState().bookings.find((b) => b.id === bookingId);
  if (!booking || booking.status !== 'pending_apply') {
    return { ok: false, message: '非待申请状态的预约' };
  }
  const room = useMeetingStore.getState().getRoomById(booking.roomId);
  if (!room) return { ok: false, message: '会议室不存在' };

  const hours = calcHours(booking.startAt, booking.endAt);
  const amount = Math.round(hours * room.hourlyRate * 100) / 100;
  const ym = getYearMonth(booking.startAt);
  const { policy, getQuota, consumeQuota } = useQuotaStore.getState();
  const quota = getQuota(booking.deptId, ym.year, ym.month);
  const remaining = (quota?.totalAmount ?? 0) - (quota?.usedAmount ?? 0);

  if (amount > remaining && policy.overQuotaStrategy === 'block') {
    return { ok: false, message: `额度仍不足，差额 ¥${(amount - remaining).toFixed(2)}` };
  }

  useBookingStore.getState().updateBooking(bookingId, { status: 'confirmed', approveAt: new Date().toISOString() });
  const expense = useExpenseStore.getState().getExpenseByBookingId(bookingId);
  if (expense) {
    useExpenseStore.getState().updateExpense(expense.id, { payType: 'quota', reimburser: undefined, approveAt: new Date().toISOString() });
  }
  consumeQuota(booking.deptId, ym.year, ym.month, amount);
  return { ok: true, message: '审批通过，已扣额度' };
}

export function rejectPendingBooking(bookingId: string, remark?: string): WorkflowResult {
  const booking = useBookingStore.getState().bookings.find((b) => b.id === bookingId);
  if (!booking || booking.status !== 'pending_apply') {
    return { ok: false, message: '非待申请状态的预约' };
  }

  const room = useMeetingStore.getState().getRoomById(booking.roomId);
  const hours = calcHours(booking.startAt, booking.endAt);
  const amount = room ? Math.round(hours * room.hourlyRate * 100) / 100 : 0;
  const ym = getYearMonth(booking.startAt);

  useBookingStore.getState().updateBooking(bookingId, {
    status: 'rejected',
    rejectRemark: remark,
    rejectAt: new Date().toISOString(),
  });

  const expense = useExpenseStore.getState().getExpenseByBookingId(bookingId);
  if (expense) {
    useExpenseStore.getState().updateExpense(expense.id, {
      payType: 'rejected',
      rejectRemark: remark,
      rejectAt: new Date().toISOString(),
    });
  }

  recordAdjustmentIfArchived(
    ym.year,
    ym.month,
    'reject',
    `驳回预约「${booking.title}」(${booking.startAt.slice(0, 10)})${remark ? `：${remark}` : ''}`,
    -amount,
    booking.deptId,
    booking.id,
  );

  return { ok: true, message: '已驳回，排期已释放' };
}

export function switchExpensePayType(expenseId: string, targetType: 'quota' | 'selfpay', reimburser?: string): WorkflowResult {
  const expense = useExpenseStore.getState().expenses.find((e) => e.id === expenseId);
  if (!expense) return { ok: false, message: '消费记录不存在' };
  if (expense.payType === targetType) return { ok: true, message: '已是目标类型' };
  if (expense.payType === 'pending_apply' && targetType === 'quota') {
    return { ok: false, message: '待申请状态请在预约审批中处理' };
  }

  const ym = { year: parseInt(expense.expenseDate.slice(0, 4)), month: parseInt(expense.expenseDate.slice(5, 7)) };

  const { getQuota, consumeQuota, refundQuota, policy } = useQuotaStore.getState();

  if (expense.payType === 'quota') {
    refundQuota(expense.deptId, ym.year, ym.month, expense.amount);
    useExpenseStore.getState().updateExpense(expenseId, { payType: targetType, reimburser });
    useBookingStore.getState().updateBooking(expense.bookingId, { isSelfPay: targetType === 'selfpay' });
    return { ok: true, message: `已切换为${targetType === 'selfpay' ? '自费' : '额度'}，已释放对应额度` };
  }

  if (targetType === 'quota') {
    const quota = getQuota(expense.deptId, ym.year, ym.month);
    const remaining = (quota?.totalAmount ?? 0) - (quota?.usedAmount ?? 0);
    if (expense.amount > remaining) {
      if (policy.overQuotaStrategy === 'block') {
        return { ok: false, message: `额度不足，差额 ¥${(expense.amount - remaining).toFixed(2)}，无法切换` };
      } else if (policy.overQuotaStrategy === 'apply') {
        useExpenseStore.getState().updateExpense(expenseId, { payType: 'pending_apply', reimburser: undefined });
        useBookingStore.getState().updateBooking(expense.bookingId, {
          isSelfPay: false,
          status: 'pending_apply',
        });
        return { ok: true, message: '已转为待申请状态，请审批后再使用额度' };
      }
    }
    consumeQuota(expense.deptId, ym.year, ym.month, expense.amount);
    useExpenseStore.getState().updateExpense(expenseId, { payType: 'quota', reimburser: undefined });
    useBookingStore.getState().updateBooking(expense.bookingId, { isSelfPay: false, status: 'confirmed' });
    return { ok: true, message: '已切换为额度消费，对应额度已占用' };
  }

  return { ok: true, message: '切换完成' };
}
