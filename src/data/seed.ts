import {
  Department,
  MeetingRoom,
  Device,
  RecurringRule,
  Booking,
  Quota,
  Expense,
  QuotaPolicy,
} from '@/types';
import { addDays, startOfMonth, format } from 'date-fns';

export const seedDepartments: Department[] = [
  { id: 'dept_1', name: '技术研发部', manager: '张伟', color: 'blue' },
  { id: 'dept_2', name: '市场营销部', manager: '李娜', color: 'green' },
  { id: 'dept_3', name: '财务管理部', manager: '王强', color: 'amber' },
  { id: 'dept_4', name: '人力资源部', manager: '赵敏', color: 'rose' },
  { id: 'dept_5', name: '产品设计部', manager: '陈浩', color: 'violet' },
];

export const seedMeetingRooms: MeetingRoom[] = [
  {
    id: 'room_1',
    name: '星辰会议室',
    location: 'A座 3F-301',
    capacity: 12,
    hourlyRate: 80,
    status: 'active',
    features: ['投影仪', '白板', '视频会议'],
  },
  {
    id: 'room_2',
    name: '云端会议室',
    location: 'A座 3F-302',
    capacity: 8,
    hourlyRate: 60,
    status: 'active',
    features: ['投影仪', '白板'],
  },
  {
    id: 'room_3',
    name: '瀚海会议室',
    location: 'A座 5F-501',
    capacity: 24,
    hourlyRate: 150,
    status: 'active',
    features: ['投影仪', '白板', '视频会议', '音响系统'],
  },
  {
    id: 'room_4',
    name: '晨曦小会议室',
    location: 'B座 2F-205',
    capacity: 4,
    hourlyRate: 40,
    status: 'active',
    features: ['电视屏'],
  },
  {
    id: 'room_5',
    name: '竹林洽谈室',
    location: 'B座 2F-206',
    capacity: 6,
    hourlyRate: 50,
    status: 'active',
    features: ['电视屏', '白板'],
  },
  {
    id: 'room_6',
    name: '梧桐多功能厅',
    location: 'C座 1F',
    capacity: 60,
    hourlyRate: 300,
    status: 'active',
    features: ['投影仪', '视频会议', '音响系统', '舞台灯光'],
  },
  {
    id: 'room_7',
    name: '松柏培训室',
    location: 'C座 2F',
    capacity: 30,
    hourlyRate: 180,
    status: 'maintenance',
    features: ['投影仪', '白板', '视频会议'],
  },
];

export const seedDevices: Device[] = [
  { id: 'dev_1', roomId: 'room_1', name: 'EPSON CB-X50 投影仪', type: 'projector', enabled: true },
  { id: 'dev_2', roomId: 'room_1', name: 'MAXHUB 智能白板', type: 'whiteboard', enabled: true },
  { id: 'dev_3', roomId: 'room_1', name: '罗技 CC4000e 摄像头', type: 'camera', enabled: true },
  { id: 'dev_4', roomId: 'room_2', name: 'BenQ MX560 投影仪', type: 'projector', enabled: true },
  { id: 'dev_5', roomId: 'room_2', name: '得力白板 120x90', type: 'whiteboard', enabled: true },
  { id: 'dev_6', roomId: 'room_3', name: '爱普生 CB-L200X 激光投影', type: 'projector', enabled: true },
  { id: 'dev_7', roomId: 'room_3', name: '华为 TE50 视频会议终端', type: 'camera', enabled: true },
  { id: 'dev_8', roomId: 'room_4', name: '小米电视 ES75 75寸', type: 'tv', enabled: true },
  { id: 'dev_9', roomId: 'room_5', name: 'TCL 65Q10G 电视屏', type: 'tv', enabled: true },
  { id: 'dev_10', roomId: 'room_6', name: '科视 4K 工程投影机', type: 'projector', enabled: true },
];

const today = new Date();
const ym = { y: today.getFullYear(), m: today.getMonth() };

function iso(offsetDays: number, h: number, min = 0): string {
  const d = addDays(today, offsetDays);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

function ymd(offsetDays: number): string {
  return format(addDays(today, offsetDays), 'yyyy-MM-dd');
}

export const seedBookings: Booking[] = [
  {
    id: 'bk_1',
    roomId: 'room_1',
    deptId: 'dept_1',
    title: '技术周例会',
    startAt: iso(0, 9),
    endAt: iso(0, 10, 30),
    status: 'confirmed',
    source: 'recurring',
    isSelfPay: false,
  },
  {
    id: 'bk_2',
    roomId: 'room_2',
    deptId: 'dept_2',
    title: '营销策划讨论',
    startAt: iso(0, 14),
    endAt: iso(0, 16),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_3',
    roomId: 'room_3',
    deptId: 'dept_1',
    title: '架构评审会',
    startAt: iso(1, 10),
    endAt: iso(1, 12),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_4',
    roomId: 'room_5',
    deptId: 'dept_4',
    title: '面试 - 候选人A',
    startAt: iso(1, 15),
    endAt: iso(1, 16),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_5',
    roomId: 'room_1',
    deptId: 'dept_5',
    title: '产品需求评审',
    startAt: iso(2, 9, 30),
    endAt: iso(2, 11, 30),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_6',
    roomId: 'room_6',
    deptId: 'dept_3',
    title: '月度财务大会',
    startAt: iso(3, 14),
    endAt: iso(3, 17),
    status: 'pending',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_7',
    roomId: 'room_4',
    deptId: 'dept_1',
    title: '一对一沟通',
    startAt: iso(-1, 10),
    endAt: iso(-1, 11),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
  {
    id: 'bk_8',
    roomId: 'room_2',
    deptId: 'dept_5',
    title: 'UI 设计走查',
    startAt: iso(-2, 14),
    endAt: iso(-2, 15, 30),
    status: 'confirmed',
    source: 'manual',
    isSelfPay: false,
  },
];

export const seedRecurringRules: RecurringRule[] = [
  {
    id: 'rule_1',
    deptId: 'dept_1',
    roomId: 'room_1',
    title: '技术研发部周例会',
    weekdays: [1],
    startTime: '09:00',
    endTime: '10:30',
    startDate: ymd(0),
    endDate: format(addDays(startOfMonth(today), 180), 'yyyy-MM-dd'),
    interval: 'weekly',
    enabled: true,
  },
  {
    id: 'rule_2',
    deptId: 'dept_2',
    roomId: 'room_2',
    title: '市场营销部晨会',
    weekdays: [1, 3, 5],
    startTime: '08:30',
    endTime: '09:00',
    startDate: ymd(0),
    endDate: format(addDays(startOfMonth(today), 90), 'yyyy-MM-dd'),
    interval: 'weekly',
    enabled: true,
  },
  {
    id: 'rule_3',
    deptId: 'dept_5',
    roomId: 'room_1',
    title: '产品设计双周评审',
    weekdays: [4],
    startTime: '14:00',
    endTime: '16:00',
    startDate: ymd(0),
    endDate: format(addDays(startOfMonth(today), 120), 'yyyy-MM-dd'),
    interval: 'biweekly',
    enabled: true,
  },
];

const monthStart = startOfMonth(today);

export const seedQuotas: Quota[] = [
  {
    id: 'quota_1',
    deptId: 'dept_1',
    year: ym.y,
    month: ym.m + 1,
    totalAmount: 8000,
    usedAmount: 3120,
    resetAt: monthStart.toISOString(),
  },
  {
    id: 'quota_2',
    deptId: 'dept_2',
    year: ym.y,
    month: ym.m + 1,
    totalAmount: 5000,
    usedAmount: 4280,
    resetAt: monthStart.toISOString(),
  },
  {
    id: 'quota_3',
    deptId: 'dept_3',
    year: ym.y,
    month: ym.m + 1,
    totalAmount: 4000,
    usedAmount: 1860,
    resetAt: monthStart.toISOString(),
  },
  {
    id: 'quota_4',
    deptId: 'dept_4',
    year: ym.y,
    month: ym.m + 1,
    totalAmount: 3000,
    usedAmount: 1120,
    resetAt: monthStart.toISOString(),
  },
  {
    id: 'quota_5',
    deptId: 'dept_5',
    year: ym.y,
    month: ym.m + 1,
    totalAmount: 6000,
    usedAmount: 5890,
    resetAt: monthStart.toISOString(),
  },
];

function expenseDateString(offsetDays: number) {
  return format(addDays(today, offsetDays), 'yyyy-MM-dd');
}

export const seedExpenses: Expense[] = [
  {
    id: 'exp_1',
    bookingId: 'bk_7',
    deptId: 'dept_1',
    roomId: 'room_4',
    expenseDate: expenseDateString(-1),
    hours: 1,
    unitPrice: 40,
    amount: 40,
    payType: 'quota',
  },
  {
    id: 'exp_2',
    bookingId: 'bk_8',
    deptId: 'dept_5',
    roomId: 'room_2',
    expenseDate: expenseDateString(-2),
    hours: 1.5,
    unitPrice: 60,
    amount: 90,
    payType: 'quota',
  },
  {
    id: 'exp_3',
    bookingId: 'bk_1',
    deptId: 'dept_1',
    roomId: 'room_1',
    expenseDate: expenseDateString(0),
    hours: 1.5,
    unitPrice: 80,
    amount: 120,
    payType: 'quota',
  },
  {
    id: 'exp_4',
    bookingId: 'bk_2',
    deptId: 'dept_2',
    roomId: 'room_2',
    expenseDate: expenseDateString(0),
    hours: 2,
    unitPrice: 60,
    amount: 120,
    payType: 'selfpay',
    reimburser: '李娜',
  },
  {
    id: 'exp_5',
    bookingId: 'bk_3',
    deptId: 'dept_1',
    roomId: 'room_3',
    expenseDate: expenseDateString(1),
    hours: 2,
    unitPrice: 150,
    amount: 300,
    payType: 'quota',
  },
];

export const defaultQuotaPolicy: QuotaPolicy = {
  overQuotaStrategy: 'apply',
  autoResetMonthly: true,
};
