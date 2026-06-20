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

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending' | 'pending_apply';
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

export type PayType = 'quota' | 'selfpay' | 'pending_apply';
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
}

export interface QuotaPolicy {
  overQuotaStrategy: OverQuotaStrategy;
  autoResetMonthly: boolean;
}
