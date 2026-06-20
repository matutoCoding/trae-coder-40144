export interface Department {
  id: string;
  name: string;
  manager: string;
  color: string;
}

export type RoomStatus = 'active' | 'maintenance';

export interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  hourlyRate: number;
  status: RoomStatus;
  features: string[];
}

export type DeviceType = 'projector' | 'tv' | 'whiteboard' | 'camera';

export interface Device {
  id: string;
  roomId: string;
  name: string;
  type: DeviceType;
  enabled: boolean;
}

export type RecurringInterval = 'weekly' | 'biweekly';

export interface RecurringRule {
  id: string;
  deptId: string;
  roomId: string;
  title: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  interval: RecurringInterval;
  enabled: boolean;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending' | 'pending_apply' | 'rejected';
export type BookingSource = 'manual' | 'recurring';

export interface Booking {
  id: string;
  roomId: string;
  deptId: string;
  ruleId?: string;
  title: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: BookingSource;
  isSelfPay: boolean;
  applyRemark?: string;
  rejectRemark?: string;
  rejectAt?: string;
  approveAt?: string;
  approveBy?: string;
}

export interface Quota {
  id: string;
  deptId: string;
  year: number;
  month: number;
  totalAmount: number;
  usedAmount: number;
  resetAt: string;
}

export type PayType = 'quota' | 'selfpay' | 'pending_apply' | 'rejected';
export type OverQuotaStrategy = 'block' | 'apply' | 'selfpay';

export interface Expense {
  id: string;
  bookingId: string;
  deptId: string;
  roomId: string;
  expenseDate: string;
  hours: number;
  unitPrice: number;
  amount: number;
  payType: PayType;
  reimburser?: string;
  rejectRemark?: string;
  rejectAt?: string;
  approveAt?: string;
}

export interface QuotaPolicy {
  overQuotaStrategy: OverQuotaStrategy;
  autoResetMonthly: boolean;
}

export interface MonthlyStatementDeptSummary {
  deptId: string;
  deptName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  selfPay: number;
  pendingApply: number;
  rejected: number;
  finalCheckAmount: number;
}

export interface MonthlyStatementItem {
  expenseId: string;
  bookingId: string;
  deptId: string;
  roomId: string;
  expenseDate: string;
  hours: number;
  unitPrice: number;
  amount: number;
  payType: PayType;
  reimburser?: string;
  meetingTitle: string;
  meetingRoomName: string;
  meetingStartTime: string;
  meetingEndTime: string;
  source: 'manual' | 'recurring';
  approveAt?: string;
  rejectAt?: string;
  rejectRemark?: string;
}

export interface AdjustmentRecord {
  id: string;
  year: number;
  month: number;
  type: 'cancel' | 'reject' | 'modify' | 'quota_change';
  description: string;
  amountChange: number;
  deptId?: string;
  relatedId?: string;
  operator?: string;
  createdAt: string;
}

export interface MonthlyStatement {
  id: string;
  year: number;
  month: number;
  deptSummaries: MonthlyStatementDeptSummary[];
  items: MonthlyStatementItem[];
  totalQuota: number;
  totalUsedQuota: number;
  totalRemaining: number;
  totalSelfPay: number;
  totalPendingApply: number;
  totalRejected: number;
  totalFinalCheck: number;
  archivedAt: string;
  archivedBy?: string;
  remark?: string;
  adjustments?: AdjustmentRecord[];
}
