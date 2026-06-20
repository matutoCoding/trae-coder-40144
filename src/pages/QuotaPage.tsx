import React, { useMemo, useState } from 'react';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Plus,
  PiggyBank,
  Shield,
  Settings,
  ArrowUpCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { useQuotaStore } from '@/stores/quotaStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { OverQuotaStrategy } from '@/types';
import { cn, colorMap, textColorMap, formatCurrency } from '@/lib/utils';
import { getQuotaPercent, getQuotaStatus } from '@/utils/quotaValidator';

const OVER_QUOTA_OPTIONS: Array<{ value: OverQuotaStrategy; label: string; desc: string; color: string }> = [
  { value: 'block', label: '超额拦截', desc: '额度不足时不允许创建预约', color: 'rose' },
  { value: 'apply', label: '转申请', desc: '超额部分需提交审批申请', color: 'amber' },
  { value: 'selfpay', label: '自费转换', desc: '超额部分自动标记为自费', color: 'teal' },
];

export const QuotaPage: React.FC = () => {
  const { quotas, policy, grantQuota, addToQuota, resetMonthlyQuotas, setPolicy, getAllCurrentQuotas, getQuota } = useQuotaStore();
  const { departments, getDeptById } = useMeetingStore();
  const { filterExpenses } = useExpenseStore();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantType, setGrantType] = useState<'grant' | 'add'>('grant');
  const [grantForm, setGrantForm] = useState({
    deptId: '',
    amount: '',
    remark: '',
  });
  const [policyOpen, setPolicyOpen] = useState(false);
  const [localPolicy, setLocalPolicy] = useState(policy);

  const monthStart = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}-01`;
  const monthEnd = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}-${new Date(viewMonth.year, viewMonth.month, 0).getDate()}`;

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

  const monthQuotas = useMemo(() => {
    const m = new Map<string, (typeof quotas)[number]>();
    for (const q of quotas) {
      if (q.year === viewMonth.year && q.month === viewMonth.month) m.set(q.deptId, q);
    }
    return m;
  }, [quotas, viewMonth]);

  const monthExpensesByDept = useMemo(() => {
    const list = filterExpenses({ startDate: monthStart, endDate: monthEnd });
    const map = new Map<string, { quota: number; selfpay: number; pending: number; rejected: number }>();
    for (const e of list) {
      const entry = map.get(e.deptId) ?? { quota: 0, selfpay: 0, pending: 0, rejected: 0 };
      if (e.payType === 'quota') entry.quota += e.amount;
      else if (e.payType === 'selfpay') entry.selfpay += e.amount;
      else if (e.payType === 'pending_apply') entry.pending += e.amount;
      else if (e.payType === 'rejected') entry.rejected += e.amount;
      map.set(e.deptId, entry);
    }
    return map;
  }, [filterExpenses, monthStart, monthEnd]);

  const overallStats = useMemo(() => {
    let total = 0, used = 0, pending = 0, rejected = 0, selfpay = 0;
    for (const q of monthQuotas.values()) {
      total += q.totalAmount;
      used += q.usedAmount;
    }
    for (const e of monthExpensesByDept.values()) {
      pending += e.pending;
      rejected += e.rejected;
      selfpay += e.selfpay;
    }
    const over = Array.from(monthQuotas.values()).filter((q) => q.usedAmount > q.totalAmount);
    const warn = Array.from(monthQuotas.values()).filter(
      (q) => q.totalAmount > 0 && q.usedAmount / q.totalAmount >= 0.8 && q.usedAmount <= q.totalAmount,
    );
    return {
      total,
      used,
      pending: Math.round(pending * 100) / 100,
      rejected: Math.round(rejected * 100) / 100,
      selfpay: Math.round(selfpay * 100) / 100,
      remaining: Math.max(0, total - used),
      pct: total ? Math.round((used / total) * 100) : 0,
      overCount: over.length,
      warnCount: warn.length,
    };
  }, [monthQuotas, monthExpensesByDept]);

  const openGrant = (type: 'grant' | 'add', deptId = '') => {
    setGrantType(type);
    setGrantForm({ deptId: deptId || departments[0]?.id || '', amount: '', remark: '' });
    setGrantModalOpen(true);
  };

  const submitGrant = () => {
    const amount = parseFloat(grantForm.amount);
    if (!grantForm.deptId || isNaN(amount) || amount <= 0) return;
    if (grantType === 'grant') grantQuota(grantForm.deptId, viewMonth.year, viewMonth.month, amount);
    else addToQuota(grantForm.deptId, viewMonth.year, viewMonth.month, amount);
    setGrantModalOpen(false);
  };

  const savePolicy = () => {
    setPolicy(localPolicy);
    setPolicyOpen(false);
  };

  const triggerReset = () => {
    if (confirm(`确定重置 ${viewMonth.year} 年 ${viewMonth.month} 月所有部门额度吗？已使用额度将归零，不累加到下月。`)) {
      resetMonthlyQuotas();
    }
  };

  const isCurrentMonth = viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth() + 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-slate-900">额度管控</h1>
            <p className="text-sm text-slate-500 mt-1">
              部门月度额度发放、使用与策略管理
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <button
              onClick={goPrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="上个月"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goThisMonth}
              className={cn(
                'px-2 py-0.5 text-sm font-medium rounded hover:bg-primary-50 transition-colors',
                isCurrentMonth ? 'text-primary-700 font-semibold' : 'text-slate-700 hover:text-primary-700',
              )}
              title="回到本月"
            >
              {viewMonth.year} 年 {viewMonth.month} 月
            </button>
            <button
              onClick={goNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="下个月"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Settings size={16} />} onClick={() => { setLocalPolicy(policy); setPolicyOpen(true); }}>
            策略配置
          </Button>
          {isCurrentMonth && (
            <Button variant="outline" icon={<RefreshCw size={16} />} onClick={triggerReset}>
              重置本月额度
            </Button>
          )}
          <Button icon={<Plus size={16} />} onClick={() => openGrant('grant')}>
            发放额度
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="发放总额度"
          value={formatCurrency(overallStats.total)}
          variant="primary"
          icon={<Wallet size={20} />}
        />
        <StatCard
          title="已使用额度"
          value={formatCurrency(overallStats.used)}
          subtitle={`使用率 ${overallStats.pct}%`}
          variant="teal"
          icon={<TrendingUp size={20} />}
          trend={{ direction: overallStats.pct > 50 ? 'up' : 'flat', value: `${overallStats.pct}%` }}
        />
        <StatCard
          title="剩余可用"
          value={formatCurrency(overallStats.remaining)}
          variant="amber"
          icon={<PiggyBank size={20} />}
        />
        <StatCard
          title="待申请金额"
          value={formatCurrency(overallStats.pending)}
          variant="info"
          icon={<Clock size={20} />}
          subtitle="待审批中"
        />
        <StatCard
          title="已驳回金额"
          value={formatCurrency(overallStats.rejected)}
          variant="rose"
          icon={<X size={20} />}
          subtitle={`${overallStats.warnCount + overallStats.overCount} 个部门预警`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-primary-700" />
            <h2 className="font-serif font-semibold text-slate-900">部门额度明细</h2>
            <Badge variant="info">{viewMonth.year}-{String(viewMonth.month).padStart(2, '0')}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" />已使用</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" />待申请</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />自费</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />已驳回</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {departments.map((dept) => {
            const q = monthQuotas.get(dept.id);
            const status = getQuotaStatus(q);
            const pct = getQuotaPercent(q);
            const exp = monthExpensesByDept.get(dept.id);
            const used = q?.usedAmount ?? 0;
            const total = q?.totalAmount ?? 0;
            const remaining = Math.max(0, total - used);
            const over = Math.max(0, used - total);
            const pending = exp?.pending ?? 0;
            const selfpay = exp?.selfpay ?? 0;
            const rejected = exp?.rejected ?? 0;
            return (
              <div
                key={dept.id}
                className={cn(
                  'p-5 transition-colors hover:bg-slate-50/60',
                  status === 'danger' && 'bg-rose-50/30',
                  status === 'warning' && 'bg-amber-50/20',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', colorMap(dept.color, 100), textColorMap(dept.color))}>
                      <span className="font-bold font-serif text-lg">{dept.name.slice(0, 1)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                        <span className="text-xs text-slate-500">主管：{dept.manager}</span>
                        {status === 'danger' && <Badge variant="danger">已超额</Badge>}
                        {status === 'warning' && <Badge variant="warning">额度预警</Badge>}
                        {status === 'normal' && total > 0 && <Badge variant="success">正常</Badge>}
                        {total === 0 && <Badge variant="neutral">未发放</Badge>}
                      </div>
                      <div className="mt-3 max-w-lg">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500">额度使用率</span>
                          <span className="font-mono font-semibold text-slate-800">{pct}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              status === 'danger' && 'bg-gradient-to-r from-rose-400 to-rose-600',
                              status === 'warning' && 'bg-gradient-to-r from-amber-400 to-amber-600',
                              status === 'normal' && 'bg-gradient-to-r from-teal-400 to-emerald-600',
                              pct === 0 && 'bg-slate-200',
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                          {status === 'danger' && over > 0 && total > 0 && (
                            <div className="h-full -mt-2.5 bg-gradient-to-r from-rose-200 to-rose-100 rounded-full" style={{ width: `${Math.min(100, (over / total) * 100 + 100)}%`, marginLeft: '100%' }} />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            已用 <span className="font-mono text-slate-700">{formatCurrency(used)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            待申请 <span className="font-mono text-slate-700">{formatCurrency(pending)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            自费 <span className="font-mono text-slate-700">{formatCurrency(selfpay)}</span>
                          </span>
                          {rejected > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              驳回 <span className="font-mono text-slate-700">{formatCurrency(rejected)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm shrink-0">
                    <div className="text-center">
                      <p className="text-slate-400 text-xs mb-1">总额度</p>
                      <p className="font-mono font-bold text-slate-900">{formatCurrency(total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs mb-1">{over > 0 ? '超额部分' : '剩余可用'}</p>
                      <p className={cn(
                        'font-mono font-bold',
                        over > 0 ? 'text-rose-700' : 'text-emerald-700',
                      )}>{formatCurrency(over > 0 ? over : remaining)}</p>
                    </div>
                    <div className="text-center flex flex-col justify-center gap-1.5">
                      <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => openGrant('add', dept.id)}>
                        追加
                      </Button>
                      <Button size="sm" icon={<ArrowUpCircle size={14} />} onClick={() => openGrant('grant', dept.id)}>
                        重设
                      </Button>
                    </div>
                  </div>
                </div>
                {q?.resetAt && (
                  <div className="mt-2 pl-16 text-xs text-slate-400">
                    最近重置：{new Date(q.resetAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={grantModalOpen}
        title={grantType === 'grant' ? '发放部门月度额度' : '追加临时额度'}
        onClose={() => setGrantModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGrantModalOpen(false)}>取消</Button>
            <Button onClick={submitGrant}>
              {grantType === 'grant' ? '确认发放' : '确认追加'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="选择部门"
            value={grantForm.deptId}
            onChange={(e) => setGrantForm({ ...grantForm, deptId: e.target.value })}
            options={departments.map((d) => {
              const q = monthQuotas.get(d.id);
              const label = q
                ? `${d.name} (当前 ${formatCurrency(q.totalAmount)} / 已用 ${formatCurrency(q.usedAmount)})`
                : `${d.name} (未发放)`;
              return { value: d.id, label };
            })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              min={0}
              step={100}
              label={grantType === 'grant' ? '月度额度（元）' : '追加金额（元）'}
              placeholder="输入金额，如 5000"
              value={grantForm.amount}
              onChange={(e) => setGrantForm({ ...grantForm, amount: e.target.value })}
            />
            <div className="flex items-end">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 w-full">
                <p className="text-xs text-slate-500 mb-0.5">生效月份</p>
                <p className="font-mono font-semibold text-slate-800">{viewMonth.year} 年 {viewMonth.month} 月</p>
              </div>
            </div>
          </div>
          <Textarea
            label="备注说明"
            rows={3}
            placeholder="发放原因、审批单号等（选填）"
            value={grantForm.remark}
            onChange={(e) => setGrantForm({ ...grantForm, remark: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={policyOpen}
        title="额度策略配置"
        onClose={() => setPolicyOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPolicyOpen(false)}>取消</Button>
            <Button onClick={savePolicy}>保存配置</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" /> 超额处理策略
            </h4>
            <p className="text-xs text-slate-500 mb-3">当部门额度不足时，系统采用的处理方式</p>
            <div className="grid grid-cols-3 gap-3">
              {OVER_QUOTA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocalPolicy({ ...localPolicy, overQuotaStrategy: opt.value })}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all',
                    localPolicy.overQuotaStrategy === opt.value
                      ? opt.color === 'rose' ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-200'
                        : opt.color === 'amber' ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200'
                        : 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-sm font-semibold',
                      opt.color === 'rose' ? 'text-rose-700' : opt.color === 'amber' ? 'text-amber-700' : 'text-teal-700',
                    )}>
                      {opt.label}
                    </span>
                    {localPolicy.overQuotaStrategy === opt.value && (
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-white',
                        opt.color === 'rose' ? 'bg-rose-500' : opt.color === 'amber' ? 'bg-amber-500' : 'bg-teal-500',
                      )}>
                        <Check size={13} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-primary-800 mb-1 flex items-center gap-2">
                  <RefreshCw size={16} /> 月度自动重置
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  每月 1 日自动将所有部门已用额度归零，额度不累计到下月。
                  <br />关闭后需手动重置，已用额度可跨月累计。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocalPolicy({ ...localPolicy, autoResetMonthly: !localPolicy.autoResetMonthly })}
                className={cn(
                  'relative w-14 h-8 rounded-full transition-colors shrink-0',
                  localPolicy.autoResetMonthly ? 'bg-primary-700' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all',
                    localPolicy.autoResetMonthly ? 'left-7' : 'left-1',
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
