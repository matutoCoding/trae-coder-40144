import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Check,
  X,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  User,
  AlertTriangle,
  Filter,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { useBookingStore } from '@/stores/bookingStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { BookingStatus } from '@/types';
import { cn, colorMap, textColorMap, formatCurrency } from '@/lib/utils';
import { formatDateTime, formatTime } from '@/utils/dateUtils';
import { approvePendingBooking, rejectPendingBooking } from '@/utils/bookingWorkflow';

type ApprovalViewMode = 'pending' | 'ledger';
type ApprovalStatusFilter = 'all' | 'pending_apply' | 'confirmed' | 'rejected';

export const ApprovalPage: React.FC = () => {
  const { bookings } = useBookingStore();
  const { departments, rooms, getDeptById, getRoomById } = useMeetingStore();
  const { getExpenseByBookingId } = useExpenseStore();

  const [viewMode, setViewMode] = useState<ApprovalViewMode>('pending');

  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('pending_apply');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string>('');
  const [rejectRemark, setRejectRemark] = useState('');

  const now = new Date();
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [ledgerStatus, setLedgerStatus] = useState<ApprovalStatusFilter>('all');
  const [ledgerDept, setLedgerDept] = useState<string>('all');
  const [detailBooking, setDetailBooking] = useState<string | null>(null);

  const goPrevMonth = () => {
    setViewMonth((m) => {
      const d = new Date(m.year, m.month - 2, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };
  const goNextMonth = () => {
    setViewMonth((m) => {
      const d = new Date(m.year, m.month, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };
  const goThisMonth = () => {
    const n = new Date();
    setViewMonth({ year: n.getFullYear(), month: n.getMonth() + 1 });
  };

  const isCurrentMonth = viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth() + 1;

  const pendingList = useMemo(() => {
    let list = bookings;
    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status === statusFilter);
    } else {
      list = list.filter((b) => b.status === 'pending_apply' || b.status === 'rejected');
    }
    if (deptFilter !== 'all') {
      list = list.filter((b) => b.deptId === deptFilter);
    }
    return list.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [bookings, statusFilter, deptFilter]);

  const ledgerList = useMemo(() => {
    const monthStart = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}-01`;
    const monthEnd = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}-${new Date(viewMonth.year, viewMonth.month, 0).getDate()}`;
    let list = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (b.status !== 'pending_apply' && b.status !== 'rejected' && b.status !== 'confirmed') return false;
      const d = b.startAt.slice(0, 10);
      return d >= monthStart && d <= monthEnd;
    });
    if (ledgerStatus !== 'all') {
      if (ledgerStatus === 'confirmed') {
        list = list.filter((b) => b.status === 'confirmed' && !b.isSelfPay);
      } else {
        list = list.filter((b) => b.status === ledgerStatus);
      }
    }
    if (ledgerDept !== 'all') {
      list = list.filter((b) => b.deptId === ledgerDept);
    }
    return list.sort((a, b) => {
      const getTime = (b: typeof bookings[number]) => {
        if (b.status === 'rejected') return b.rejectAt ?? b.startAt;
        if (b.status === 'confirmed' && b.approveAt) return b.approveAt;
        return b.startAt;
      };
      return new Date(getTime(b)).getTime() - new Date(getTime(a)).getTime();
    });
  }, [bookings, viewMonth, ledgerStatus, ledgerDept]);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending_apply');
    const rejected = bookings.filter((b) => b.status === 'rejected');
    const approved = bookings.filter((b) => b.status === 'confirmed' && b.approveAt);
    const pendingAmount = pending.reduce((s, b) => {
      const exp = getExpenseByBookingId(b.id);
      return s + (exp?.amount ?? 0);
    }, 0);
    const rejectedAmount = rejected.reduce((s, b) => {
      const exp = getExpenseByBookingId(b.id);
      return s + (exp?.amount ?? 0);
    }, 0);
    const approvedAmount = approved.reduce((s, b) => {
      const exp = getExpenseByBookingId(b.id);
      return s + (exp?.amount ?? 0);
    }, 0);
    const total = pending.length + rejected.length + approved.length;
    return {
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      approvedCount: approved.length,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      rejectedAmount: Math.round(rejectedAmount * 100) / 100,
      approvedAmount: Math.round(approvedAmount * 100) / 100,
      passRate: total > 0 ? Math.round((approved.length / total) * 100) : 100,
    };
  }, [bookings, getExpenseByBookingId]);

  const handleApprove = (bookingId: string) => {
    if (confirm('确定审批通过？通过后将占用部门额度。')) {
      const r = approvePendingBooking(bookingId);
      if (!r.ok) alert(r.message);
    }
  };

  const openReject = (bookingId: string) => {
    setRejectBookingId(bookingId);
    setRejectRemark('');
    setRejectModalOpen(true);
  };

  const submitReject = () => {
    if (!rejectBookingId) return;
    const r = rejectPendingBooking(rejectBookingId, rejectRemark || undefined);
    if (!r.ok) {
      alert(r.message);
      return;
    }
    setRejectModalOpen(false);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'pending_apply':
        return <Badge variant="info"><AlertTriangle size={11} className="mr-1" /> 待审批</Badge>;
      case 'rejected':
        return <Badge variant="danger"><X size={11} className="mr-1" /> 已驳回</Badge>;
      case 'confirmed':
        return <Badge variant="success"><Check size={11} className="mr-1" /> 已通过</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const detailItem = detailBooking ? bookings.find((b) => b.id === detailBooking) : null;
  const detailExpense = detailItem ? getExpenseByBookingId(detailItem.id) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">审批中心</h1>
          <p className="text-sm text-slate-500 mt-1">待办申请集中处理与审批流水台账查询</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm px-3 py-1.5">
            待审批 {stats.pendingCount} 条
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="待审批申请"
          value={stats.pendingCount}
          variant="info"
          icon={<ClipboardCheck size={20} />}
          subtitle={`涉及金额 ${formatCurrency(stats.pendingAmount)}`}
        />
        <StatCard
          title="已通过申请"
          value={stats.approvedCount}
          variant="teal"
          icon={<Check size={20} />}
          subtitle={`涉及金额 ${formatCurrency(stats.approvedAmount)}`}
        />
        <StatCard
          title="已驳回申请"
          value={stats.rejectedCount}
          variant="rose"
          icon={<X size={20} />}
          subtitle={`涉及金额 ${formatCurrency(stats.rejectedAmount)}`}
        />
        <StatCard
          title="审批通过率"
          value={`${stats.passRate}%`}
          variant="primary"
          icon={<FileText size={20} />}
        />
        <StatCard
          title="涉及部门"
          value={new Set(pendingList.map((b) => b.deptId)).size}
          variant="amber"
          icon={<Building2 size={20} />}
          subtitle="申请部门数量"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('pending')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all',
            viewMode === 'pending'
              ? 'bg-primary-700 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          )}
        >
          待办处理
        </button>
        <button
          onClick={() => setViewMode('ledger')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all',
            viewMode === 'ledger'
              ? 'bg-primary-700 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          )}
        >
          审批流水
        </button>
      </div>

      {viewMode === 'pending' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-primary-700" />
                <h2 className="font-serif font-semibold text-slate-900">待办列表</h2>
                <Badge variant="neutral">共 {pendingList.length} 条</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-36"
                  options={[
                    { value: 'all', label: '全部待处理' },
                    { value: 'pending_apply', label: '待审批' },
                    { value: 'rejected', label: '已驳回' },
                  ]}
                />
                <Select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-40"
                  options={[{ value: 'all', label: '全部部门' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingList.length === 0 ? (
              <div className="p-16 text-center">
                <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm text-slate-500">暂无待办申请</p>
              </div>
            ) : (
              pendingList.map((booking) => {
                const dept = getDeptById(booking.deptId);
                const room = getRoomById(booking.roomId);
                const expense = getExpenseByBookingId(booking.id);
                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'p-5 transition-colors',
                      booking.status === 'rejected' && 'bg-rose-50/30',
                      booking.status === 'pending_apply' && 'hover:bg-slate-50/60',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm',
                          dept ? colorMap(dept.color, 100) : 'bg-slate-100',
                          dept ? textColorMap(dept.color) : 'text-slate-600',
                        )}>
                          <CalendarIcon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">{booking.title}</h3>
                            {getStatusBadge(booking.status)}
                            <Badge variant="neutral">{booking.source === 'recurring' ? '周期生成' : '手动预约'}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Building2 size={12} />
                              <span>{dept?.name ?? '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <FileText size={12} />
                              <span>{room?.name ?? '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <CalendarIcon size={12} />
                              <span>{booking.startAt.slice(0, 10)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Clock size={12} />
                              <span>{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                            </div>
                          </div>
                          {booking.applyRemark && (
                            <div className="mt-2 text-xs text-slate-500">
                              <span className="text-slate-400">申请说明：</span>{booking.applyRemark}
                            </div>
                          )}
                          {booking.rejectRemark && (
                            <div className="mt-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 inline-block">
                              <span className="font-semibold">驳回原因：</span>{booking.rejectRemark}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-0.5">申请金额</p>
                          <p className="font-mono font-bold text-lg text-slate-900">{formatCurrency(expense?.amount ?? 0)}</p>
                          <p className="text-[10px] text-slate-400">{expense?.hours ?? 0}h × {formatCurrency(room?.hourlyRate ?? 0)}</p>
                        </div>
                        {booking.status === 'pending_apply' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Check size={14} />}
                              onClick={() => handleApprove(booking.id)}
                            >
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<X size={14} />}
                              onClick={() => openReject(booking.id)}
                            >
                              驳回
                            </Button>
                          </div>
                        )}
                        {booking.status === 'rejected' && booking.rejectAt && (
                          <div className="text-right text-xs text-slate-400">
                            <p>驳回时间</p>
                            <p className="font-mono">{formatDateTime(new Date(booking.rejectAt))}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-primary-700" />
                <h2 className="font-serif font-semibold text-slate-900">审批流水台账</h2>
                <Badge variant="neutral">共 {ledgerList.length} 条</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                  <button
                    onClick={goPrevMonth}
                    className="p-1 rounded hover:bg-white text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={goThisMonth}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded hover:bg-white transition-colors',
                      isCurrentMonth ? 'text-primary-700 font-semibold' : 'text-slate-700',
                    )}
                  >
                    {viewMonth.year} 年 {viewMonth.month} 月
                  </button>
                  <button
                    onClick={goNextMonth}
                    className="p-1 rounded hover:bg-white text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <Select
                  value={ledgerStatus}
                  onChange={(e) => setLedgerStatus(e.target.value as ApprovalStatusFilter)}
                  className="w-32"
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'pending_apply', label: '待审批' },
                    { value: 'confirmed', label: '已通过' },
                    { value: 'rejected', label: '已驳回' },
                  ]}
                />
                <Select
                  value={ledgerDept}
                  onChange={(e) => setLedgerDept(e.target.value)}
                  className="w-36"
                  options={[{ value: 'all', label: '全部部门' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">会议主题</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">部门</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">会议室</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">会议时间</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">金额</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">审批状态</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">来源</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">处理时间</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-16">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">本月暂无审批流水记录</p>
                    </td>
                  </tr>
                ) : (
                  ledgerList.map((booking) => {
                    const dept = getDeptById(booking.deptId);
                    const room = getRoomById(booking.roomId);
                    const expense = getExpenseByBookingId(booking.id);
                    const processTime = booking.status === 'rejected'
                      ? booking.rejectAt
                      : booking.status === 'confirmed'
                      ? booking.approveAt
                      : null;
                    return (
                      <tr
                        key={booking.id}
                        className={cn(
                          'transition-colors group',
                          booking.status === 'rejected' && 'bg-rose-50/20',
                          booking.status === 'pending_apply' && 'bg-sky-50/20',
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className={cn(
                            'font-medium truncate max-w-[180px]',
                            booking.status === 'rejected' && 'text-slate-500 line-through',
                          )}>{booking.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          {dept && (
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', colorMap(dept.color, 100), textColorMap(dept.color))}>
                              {dept.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{room?.name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-slate-600">{booking.startAt.slice(0, 10)}</p>
                          <p className="font-mono text-[11px] text-slate-400">{formatTime(booking.startAt)}-{formatTime(booking.endAt)}</p>
                        </td>
                        <td className={cn(
                          'px-4 py-3 text-right font-mono font-semibold',
                          booking.status === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-900',
                        )}>{formatCurrency(expense?.amount ?? 0)}</td>
                        <td className="px-4 py-3">{getStatusBadge(booking.status)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="neutral">{booking.source === 'recurring' ? '周期' : '手动'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {processTime ? (
                            <p className="font-mono text-xs text-slate-500">{formatDateTime(new Date(processTime))}</p>
                          ) : (
                            <p className="text-xs text-slate-400">-</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDetailBooking(booking.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-primary-50 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="查看详情"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {ledgerList.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
              <span>共 {ledgerList.length} 条审批流水</span>
              <span>
                待审批 <span className="font-mono font-semibold text-sky-700">{ledgerList.filter((b) => b.status === 'pending_apply').length}</span> ·
                已通过 <span className="font-mono font-semibold text-teal-700">{ledgerList.filter((b) => b.status === 'confirmed').length}</span> ·
                已驳回 <span className="font-mono font-semibold text-rose-700">{ledgerList.filter((b) => b.status === 'rejected').length}</span>
              </span>
            </div>
          )}
        </div>
      )}

      <Modal
        open={rejectModalOpen}
        title="驳回申请"
        size="md"
        onClose={() => setRejectModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>取消</Button>
            <Button variant="danger" onClick={submitReject}>确认驳回</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-rose-800">驳回说明</p>
              <p className="text-xs mt-1 text-rose-700">
                驳回后，该预约将被标记为已驳回，不再占用会议室排期，也不会扣除额度。
              </p>
            </div>
          </div>
          <Textarea
            label="驳回原因（选填）"
            rows={3}
            placeholder="请输入驳回原因，方便申请人了解情况"
            value={rejectRemark}
            onChange={(e) => setRejectRemark(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={!!detailItem}
        title="审批详情"
        size="md"
        onClose={() => setDetailBooking(null)}
      >
        {detailItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-900 text-lg">{detailItem.title}</h3>
              {getStatusBadge(detailItem.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">使用部门</p>
                <p className="font-semibold text-slate-800">{getDeptById(detailItem.deptId)?.name ?? '-'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">会议室</p>
                <p className="font-semibold text-slate-800">{getRoomById(detailItem.roomId)?.name ?? '-'}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">会议日期</p>
                <p className="font-mono text-slate-800">{detailItem.startAt.slice(0, 10)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">会议时段</p>
                <p className="font-mono text-slate-800">{formatTime(detailItem.startAt)} - {formatTime(detailItem.endAt)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">预约来源</p>
                <p className="text-slate-800">{detailItem.source === 'recurring' ? '周期生成' : '手动预约'}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100">
                <p className="text-xs text-slate-400 mb-1">申请金额</p>
                <p className="font-mono font-bold text-primary-800 text-lg">{formatCurrency(detailExpense?.amount ?? 0)}</p>
                <p className="text-[10px] text-slate-500">{detailExpense?.hours ?? 0}h × {formatCurrency(detailExpense?.unitPrice ?? 0)}</p>
              </div>
            </div>

            {detailItem.applyRemark && (
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
                <p className="text-xs text-slate-400 mb-1">申请说明</p>
                <p className="text-sm text-slate-700">{detailItem.applyRemark}</p>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">审批流程</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarIcon size={12} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">提交申请</p>
                    <p className="font-mono text-xs text-slate-600">{formatDateTime(new Date(detailItem.startAt))}</p>
                  </div>
                </div>

                {detailItem.status === 'confirmed' && detailItem.approveAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-teal-700 font-semibold">审批通过</p>
                      <p className="font-mono text-xs text-slate-600">{formatDateTime(new Date(detailItem.approveAt))}</p>
                    </div>
                  </div>
                )}

                {detailItem.status === 'rejected' && detailItem.rejectAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                      <X size={12} className="text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs text-rose-700 font-semibold">审批驳回</p>
                      <p className="font-mono text-xs text-slate-600">{formatDateTime(new Date(detailItem.rejectAt))}</p>
                      {detailItem.rejectRemark && (
                        <p className="text-xs text-rose-600 mt-1">原因：{detailItem.rejectRemark}</p>
                      )}
                    </div>
                  </div>
                )}

                {detailItem.status === 'pending_apply' && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={12} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-700 font-semibold">等待审批中...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
