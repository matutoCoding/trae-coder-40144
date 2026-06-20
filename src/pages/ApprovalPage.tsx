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

export const ApprovalPage: React.FC = () => {
  const { bookings } = useBookingStore();
  const { departments, rooms, getDeptById, getRoomById } = useMeetingStore();
  const { getExpenseByBookingId } = useExpenseStore();

  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('pending_apply');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string>('');
  const [rejectRemark, setRejectRemark] = useState('');

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

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending_apply');
    const rejected = bookings.filter((b) => b.status === 'rejected');
    const pendingAmount = pending.reduce((s, b) => {
      const exp = getExpenseByBookingId(b.id);
      return s + (exp?.amount ?? 0);
    }, 0);
    const rejectedAmount = rejected.reduce((s, b) => {
      const exp = getExpenseByBookingId(b.id);
      return s + (exp?.amount ?? 0);
    }, 0);
    return {
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      rejectedAmount: Math.round(rejectedAmount * 100) / 100,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">审批中心</h1>
          <p className="text-sm text-slate-500 mt-1">待办申请集中处理：额度超额申请的审批与驳回管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" className="text-sm px-3 py-1.5">
            待审批 {stats.pendingCount} 条
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="待审批申请"
          value={stats.pendingCount}
          variant="info"
          icon={<ClipboardCheck size={20} />}
          subtitle={`涉及金额 ${formatCurrency(stats.pendingAmount)}`}
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
          value={stats.pendingCount + stats.rejectedCount > 0 ? `${Math.round((1 - stats.rejectedCount / (stats.pendingCount + stats.rejectedCount)) * 100)}%` : '100%'}
          variant="teal"
          icon={<Check size={20} />}
        />
        <StatCard
          title="涉及部门"
          value={new Set(pendingList.map((b) => b.deptId)).size}
          variant="primary"
          icon={<Building2 size={20} />}
          subtitle="申请部门数量"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-primary-700" />
              <h2 className="font-serif font-semibold text-slate-900">申请列表</h2>
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
              <p className="text-sm text-slate-500">暂无申请记录</p>
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
    </div>
  );
};
