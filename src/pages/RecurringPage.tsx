import React, { useMemo, useState } from 'react';
import { format, addDays, startOfMonth, addMonths, parseISO } from 'date-fns';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  Users,
  MapPin,
  PlayCircle,
  PauseCircle,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { useRuleStore } from '@/stores/ruleStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useQuotaStore } from '@/stores/quotaStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { RecurringRule, RecurringInterval } from '@/types';
import { cn, colorMap, textColorMap, borderColorMap, formatCurrency } from '@/lib/utils';
import { WEEKDAY_LABELS, formatTime, calcHours } from '@/utils/dateUtils';
import { generateOccurrences, GeneratedOccurrence } from '@/utils/recurrenceEngine';
import { checkQuota } from '@/utils/quotaValidator';

interface RuleFormData {
  title: string;
  deptId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  interval: RecurringInterval;
}

const defaultForm = (): RuleFormData => ({
  title: '',
  deptId: '',
  roomId: '',
  startTime: '09:00',
  endTime: '10:30',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(addMonths(startOfMonth(new Date()), 3), 'yyyy-MM-dd'),
  weekdays: [1],
  interval: 'weekly',
});

export const RecurringPage: React.FC = () => {
  const { rules, addRule, updateRule, removeRule, toggleRuleEnabled } = useRuleStore();
  const { departments, rooms, getDeptById, getRoomById } = useMeetingStore();
  const { addBookingsBatch, checkConflict, getBookingsByRuleId } = useBookingStore();
  const { getCurrentQuota, policy } = useQuotaStore();
  const { addExpenses } = useExpenseStore();

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm());

  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [previewWeeks, setPreviewWeeks] = useState(8);
  const [occurrenceSelection, setOccurrenceSelection] = useState<Record<string, boolean>>({});
  const [previewWarning, setPreviewWarning] = useState('');
  const [previewResult, setPreviewResult] = useState<{ generated: number; skipped: number; cost: number } | null>(null);

  const previewRule = previewRuleId ? rules.find((r) => r.id === previewRuleId) : null;
  const previewRoom = previewRule ? getRoomById(previewRule.roomId) : undefined;
  const previewDept = previewRule ? getDeptById(previewRule.deptId) : undefined;
  const occurrences = useMemo<GeneratedOccurrence[]>(() => {
    if (!previewRule) return [];
    return generateOccurrences(previewRule, previewWeeks);
  }, [previewRule, previewWeeks]);

  const previewCost = useMemo(() => {
    const selected = occurrences.filter((o) => occurrenceSelection[o.date] !== false);
    const hours = selected.reduce((s, o) => s + o.hours, 0);
    return {
      totalHours: Math.round(hours * 100) / 100,
      totalAmount: Math.round(hours * (previewRoom?.hourlyRate ?? 0) * 100) / 100,
      count: selected.length,
    };
  }, [occurrences, occurrenceSelection, previewRoom]);

  const quotaCheck = useMemo(() => {
    if (!previewRule || !previewDept) return null;
    const quota = getCurrentQuota(previewDept.id);
    return checkQuota(quota, previewCost.totalAmount, policy.overQuotaStrategy);
  }, [previewRule, previewDept, previewCost.totalAmount, getCurrentQuota, policy.overQuotaStrategy]);

  const toggleWeekday = (d: number) => {
    setForm((f) => {
      const ws = f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d];
      ws.sort();
      return { ...f, weekdays: ws };
    });
  };

  const openAddRule = () => {
    setEditingRule(null);
    setForm({ ...defaultForm(), deptId: departments[0]?.id || '', roomId: rooms[0]?.id || '' });
    setRuleModalOpen(true);
  };
  const openEditRule = (r: RecurringRule) => {
    setEditingRule(r);
    setForm({
      title: r.title,
      deptId: r.deptId,
      roomId: r.roomId,
      startTime: r.startTime,
      endTime: r.endTime,
      startDate: r.startDate,
      endDate: r.endDate,
      weekdays: [...r.weekdays],
      interval: r.interval,
    });
    setRuleModalOpen(true);
  };

  const submitRule = () => {
    if (!form.title || !form.deptId || !form.roomId || form.weekdays.length === 0) return;
    if (form.startDate >= form.endDate) return;
    if (editingRule) updateRule(editingRule.id, form);
    else addRule({ ...form, enabled: true });
    setRuleModalOpen(false);
  };

  const openPreview = (rule: RecurringRule) => {
    setPreviewRuleId(rule.id);
    setOccurrenceSelection({});
    setPreviewWarning('');
    setPreviewResult(null);
  };

  const toggleOccurrence = (date: string) => {
    setOccurrenceSelection((s) => ({ ...s, [date]: s[date] === undefined ? false : !s[date] }));
  };

  const executeGeneration = async () => {
    if (!previewRule || !previewDept || !previewRoom) return;
    const selected = occurrences.filter((o) => occurrenceSelection[o.date] !== false);
    if (selected.length === 0) {
      setPreviewWarning('请至少选择一条记录');
      return;
    }
    const skipConflict: GeneratedOccurrence[] = [];
    const toGenerate: GeneratedOccurrence[] = [];
    for (const o of selected) {
      const c = checkConflict(previewRule.roomId, o.startAt, o.endAt);
      if (c) skipConflict.push(o);
      else toGenerate.push(o);
    }

    const isSelfPay = quotaCheck && !quotaCheck.ok && policy.overQuotaStrategy === 'selfpay';

    const created = addBookingsBatch(
      toGenerate.map((o) => ({
        roomId: previewRule.roomId,
        deptId: previewRule.deptId,
        ruleId: previewRule.id,
        title: previewRule.title,
        startAt: o.startAt,
        endAt: o.endAt,
        source: 'recurring',
        isSelfPay,
      })),
    );

    const expenses = created.map((b, i) => {
      const o = toGenerate[i];
      return {
        bookingId: b.id,
        deptId: b.deptId,
        roomId: b.roomId,
        expenseDate: b.startAt.slice(0, 10),
        hours: o.hours,
        unitPrice: previewRoom.hourlyRate,
        amount: Math.round(o.hours * previewRoom.hourlyRate * 100) / 100,
        payType: isSelfPay ? ('selfpay' as const) : ('quota' as const),
      };
    });
    addExpenses(expenses);

    const totalCost = expenses.reduce((s, e) => s + e.amount, 0);
    if (!isSelfPay) {
      const quota = getCurrentQuota(previewDept.id);
      if (quota) {
        const newUsed = Math.min(quota.totalAmount, quota.usedAmount + totalCost);
        useQuotaStore.getState().consumeQuota(previewDept.id, quota.year, quota.month, totalCost);
      }
    }

    setPreviewResult({
      generated: created.length,
      skipped: skipConflict.length,
      cost: Math.round(totalCost * 100) / 100,
    });
    if (skipConflict.length > 0) {
      setPreviewWarning(`${skipConflict.length} 条因时间冲突已跳过`);
    }
  };

  const stats = useMemo(() => {
    const totalRules = rules.length;
    const activeRules = rules.filter((r) => r.enabled).length;
    const totalGenerated = rules.reduce((s, r) => s + getBookingsByRuleId(r.id).length, 0);
    return { totalRules, activeRules, totalGenerated };
  }, [rules, getBookingsByRuleId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">周期生成</h1>
          <p className="text-sm text-slate-500 mt-1">配置部门固定例会规则，批量生成未来预约并进行额度校验</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAddRule}>
          新建周期规则
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="周期规则总数"
          value={stats.totalRules}
          variant="primary"
          icon={<CalendarDays size={20} />}
        />
        <StatCard
          title="运行中规则"
          value={stats.activeRules}
          variant="teal"
          subtitle={`启用率 ${stats.totalRules ? Math.round((stats.activeRules / stats.totalRules) * 100) : 0}%`}
          icon={<PlayCircle size={20} />}
        />
        <StatCard
          title="已生成预约数"
          value={stats.totalGenerated}
          variant="amber"
          icon={<BarChart3 size={20} />}
        />
        <StatCard
          title="覆盖部门数"
          value={new Set(rules.map((r) => r.deptId)).size}
          variant="rose"
          icon={<Users size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {rules.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 p-16 text-center">
            <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">暂无周期规则，创建您的第一条例会规则</p>
            <Button onClick={openAddRule} icon={<Plus size={16} />}>新建规则</Button>
          </div>
        )}
        {rules.map((r) => {
          const dept = getDeptById(r.deptId);
          const room = getRoomById(r.roomId);
          const count = getBookingsByRuleId(r.id).length;
          return (
            <div
              key={r.id}
              className={cn(
                'rounded-2xl border bg-white shadow-card hover:shadow-hover transition-all overflow-hidden',
                r.enabled ? 'border-slate-200' : 'border-slate-200 opacity-75',
              )}
            >
              <div className={cn('h-1.5', dept ? colorMap(dept.color, 500) : 'bg-slate-400')} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-serif text-base font-bold text-slate-900 truncate">
                        {r.title}
                      </h3>
                      <Badge variant={r.enabled ? 'success' : 'neutral'} size="sm">
                        {r.enabled ? '运行中' : '已暂停'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {dept && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-md font-medium',
                          colorMap(dept.color, 100),
                          textColorMap(dept.color),
                        )}>
                          <Users size={11} className="inline mr-1 -mt-0.5" />{dept.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {room?.name || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleRuleEnabled(r.id)}
                      title={r.enabled ? '暂停' : '启用'}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        r.enabled
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50',
                      )}
                    >
                      {r.enabled ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    </button>
                    <button
                      onClick={() => openEditRule(r)}
                      title="编辑"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-700 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`确定删除规则「${r.title}」吗？已生成的预约不会删除。`)) removeRule(r.id);
                      }}
                      title="删除"
                      className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-slate-400 mb-1 flex items-center gap-1">
                      <CalendarDays size={12} /> 周期
                    </p>
                    <p className="font-semibold text-slate-800">
                      {r.interval === 'weekly' ? '每周' : '双周'} · {r.weekdays.map((w) => WEEKDAY_LABELS[w]).join('、')}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-slate-400 mb-1 flex items-center gap-1">
                      <Clock size={12} /> 时段
                    </p>
                    <p className="font-semibold text-slate-800">
                      {r.startTime} - {r.endTime}
                    </p>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-lg bg-gradient-to-r from-primary-50/50 to-teal-50/50 border border-primary-100/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 mb-1 text-[11px]">有效期</p>
                        <p className="font-semibold text-slate-800">
                          {r.startDate} 至 {r.endDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 mb-1 text-[11px]">已生成</p>
                        <p className="font-mono font-bold text-primary-800">{count} 次</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant={r.enabled ? 'secondary' : 'outline'}
                  icon={<Sparkles size={16} />}
                  className="w-full"
                  onClick={() => openPreview(r)}
                  disabled={!r.enabled}
                >
                  {r.enabled ? '批量生成未来预约' : '请先启用规则'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={ruleModalOpen}
        title={editingRule ? '编辑周期规则' : '新建周期规则'}
        size="lg"
        onClose={() => setRuleModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRuleModalOpen(false)}>取消</Button>
            <Button onClick={submitRule}>保存</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="规则名称/会议主题"
              placeholder="如：技术研发部周例会"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="col-span-2"
            />
            <Select
              label="使用部门"
              value={form.deptId}
              onChange={(e) => setForm({ ...form, deptId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Select
              label="会议室"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              options={rooms.map((r) => ({ value: r.id, label: `${r.name} (${r.location})` }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">重复周几</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWeekday(idx)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    form.weekdays.includes(idx)
                      ? 'bg-primary-700 text-white border-primary-700 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="重复间隔"
              value={form.interval}
              onChange={(e) => setForm({ ...form, interval: e.target.value as RecurringInterval })}
              options={[
                { value: 'weekly', label: '每周重复' },
                { value: 'biweekly', label: '每两周重复' },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="time"
                label="开始时间"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <Input
                type="time"
                label="结束时间"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="开始日期"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              type="date"
              label="结束日期"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!previewRule}
        title={`批量生成 - ${previewRule?.title}`}
        size="xl"
        onClose={() => setPreviewRuleId(null)}
      >
        {previewRule && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">部门</p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  {previewDept && (
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      previewDept.color === 'blue' ? 'bg-blue-500' :
                      previewDept.color === 'green' ? 'bg-emerald-500' :
                      previewDept.color === 'amber' ? 'bg-amber-500' :
                      previewDept.color === 'rose' ? 'bg-rose-500' : 'bg-violet-500',
                    )} />
                  )}
                  {previewDept?.name}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">会议室</p>
                <p className="text-sm font-semibold text-slate-800">{previewRoom?.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">时长</p>
                <p className="text-sm font-mono font-semibold text-slate-800">
                  {previewRule.startTime}-{previewRule.endTime}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100">
                <p className="text-xs text-slate-500 mb-1">费率</p>
                <p className="text-sm font-mono font-semibold text-primary-800">
                  {formatCurrency(previewRoom?.hourlyRate ?? 0)} / 小时
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <label className="text-sm font-medium text-slate-700 mr-2">预览范围</label>
                <Select
                  value={String(previewWeeks)}
                  onChange={(e) => setPreviewWeeks(parseInt(e.target.value) || 8)}
                  options={[
                    { value: '4', label: '未来 4 周' },
                    { value: '8', label: '未来 8 周' },
                    { value: '12', label: '未来 12 周' },
                    { value: '24', label: '未来 24 周' },
                  ]}
                  className="inline-block w-36"
                />
              </div>
              <div className="flex-1 flex items-center justify-end gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">计划生成:</span>
                  <span className="font-mono font-bold text-slate-900">{previewCost.count} 次</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">总时长:</span>
                  <span className="font-mono font-bold text-slate-900">{previewCost.totalHours} h</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200">
                  <span className="text-teal-700">预计费用:</span>
                  <span className="font-mono font-bold text-teal-800">{formatCurrency(previewCost.totalAmount)}</span>
                </div>
              </div>
            </div>

            {quotaCheck && (
              <div
                className={cn(
                  'p-4 rounded-xl border flex items-start gap-3',
                  quotaCheck.ok
                    ? 'bg-emerald-50 border-emerald-200'
                    : quotaCheck.strategy === 'block'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200',
                )}
              >
                {quotaCheck.ok ? (
                  <Check size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'font-semibold text-sm',
                    quotaCheck.ok ? 'text-emerald-800' : 'text-amber-800',
                  )}>
                    额度校验结果
                  </p>
                  <p className="text-xs mt-1 text-slate-600">{quotaCheck.message}</p>
                  {quotaCheck.shortfall > 0 && (
                    <p className="text-xs mt-1 text-slate-500">
                      可用额度 {formatCurrency(quotaCheck.remaining)}，
                      差额 {formatCurrency(quotaCheck.shortfall)}
                      {policy.overQuotaStrategy === 'selfpay' && '将标记为自费'}
                      {policy.overQuotaStrategy === 'apply' && '需提交额度申请'}
                      {policy.overQuotaStrategy === 'block' && '，请调整生成数量或追加额度'}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="w-12 text-center px-3 py-2.5 text-xs font-semibold text-slate-600">
                      <Check size={14} className="mx-auto" />
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">日期</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">周</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">时段</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-600">时长</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-600">费用</th>
                  </tr>
                </thead>
                <tbody>
                  {occurrences.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                        范围内无可生成的日期
                      </td>
                    </tr>
                  )}
                  {occurrences.map((o) => {
                    const selected = occurrenceSelection[o.date] !== false;
                    const conflict = checkConflict(previewRule!.roomId, o.startAt, o.endAt);
                    return (
                      <tr
                        key={o.date}
                        className={cn(
                          'border-t border-slate-100 transition-colors',
                          selected ? 'bg-white hover:bg-slate-50' : 'bg-slate-100/50',
                          conflict && 'bg-rose-50/50',
                        )}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => toggleOccurrence(o.date)}
                            className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center transition-all',
                              selected
                                ? 'bg-primary-700 border-primary-700 text-white'
                                : 'bg-white border-slate-300 text-transparent',
                            )}
                            disabled={!!conflict}
                          >
                            <Check size={12} />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-800">{o.date}</td>
                        <td className="px-3 py-2.5 text-slate-600">{o.weekdayLabel}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">
                          {formatTime(o.startAt)} - {formatTime(o.endAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">{o.hours.toFixed(1)}h</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-800 font-semibold">
                          {formatCurrency(o.hours * (previewRoom?.hourlyRate ?? 0))}
                          {conflict && (
                            <span className="ml-2 text-[10px] text-rose-600 font-normal">
                              冲突：{conflict.title}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {previewWarning && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle size={14} /> {previewWarning}
              </p>
            )}
            {previewResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <Check size={20} className="text-emerald-600 shrink-0" />
                <div className="text-sm text-emerald-800">
                  <p className="font-semibold">生成完成</p>
                  <p className="text-xs mt-0.5 text-emerald-700">
                    已生成 {previewResult.generated} 条预约
                    {previewResult.skipped > 0 && `，跳过冲突 ${previewResult.skipped} 条`}
                    ，共消耗 {formatCurrency(previewResult.cost)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 -mx-6 px-6">
              <Button variant="ghost" onClick={() => setPreviewRuleId(null)}>
                {previewResult ? '关闭' : '取消'}
              </Button>
              {!previewResult && (
                <Button
                  icon={<Sparkles size={16} />}
                  onClick={executeGeneration}
                  disabled={quotaCheck?.ok === false && policy.overQuotaStrategy === 'block'}
                >
                  确认生成 {previewCost.count} 条预约
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
