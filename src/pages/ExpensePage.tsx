import React, { useMemo, useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  CreditCard,
  Banknote,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3 as BarIcon,
  AlertTriangle,
  Check as CheckIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { useExpenseStore } from '@/stores/expenseStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { Expense, PayType } from '@/types';
import { cn, formatCurrency, colorMap, textColorMap } from '@/lib/utils';
import { formatDateTime, getRecentMonths, formatDate } from '@/utils/dateUtils';
import { switchExpensePayType, approvePendingBooking } from '@/utils/bookingWorkflow';

export const ExpensePage: React.FC = () => {
  const { expenses, filterExpenses, getStatsByDept, getStatsByRoom, convertToSelfPay, updateExpense } = useExpenseStore();
  const { departments, rooms, getDeptById, getRoomById } = useMeetingStore();

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [payTypeFilter, setPayTypeFilter] = useState<'all' | PayType>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [sortField, setSortField] = useState<'expenseDate' | 'amount' | 'hours'>('expenseDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [chartOpen, setChartOpen] = useState(true);

  const [selfpayModal, setSelfpayModal] = useState<Expense | null>(null);
  const [reimburser, setReimburser] = useState('');
  const [detailModal, setDetailModal] = useState<Expense | null>(null);

  const filtered = useMemo(() => {
    let list = filterExpenses({
      deptId: deptFilter === 'all' ? undefined : deptFilter,
      roomId: roomFilter === 'all' ? undefined : roomFilter,
      payType: payTypeFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter((e) => {
        const dept = getDeptById(e.deptId)?.name ?? '';
        const room = getRoomById(e.roomId)?.name ?? '';
        return (
          dept.toLowerCase().includes(kw) ||
          room.toLowerCase().includes(kw) ||
          (e.reimburser ?? '').toLowerCase().includes(kw) ||
          e.id.toLowerCase().includes(kw)
        );
      });
    }
    list = [...list].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const r = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [expenses, deptFilter, roomFilter, payTypeFilter, startDate, endDate, keyword, sortField, sortDir, filterExpenses, getDeptById, getRoomById]);

  const summary = useMemo(() => {
    let total = 0, quota = 0, self = 0, hours = 0, pending = 0;
    for (const e of filtered) {
      total += e.amount;
      hours += e.hours;
      if (e.payType === 'quota') quota += e.amount;
      else if (e.payType === 'selfpay') self += e.amount;
      else if (e.payType === 'pending_apply') pending += e.amount;
    }
    return {
      count: filtered.length,
      total: Math.round(total * 100) / 100,
      quota: Math.round(quota * 100) / 100,
      self: Math.round(self * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      hours: Math.round(hours * 100) / 100,
      avg: filtered.length ? Math.round((total / filtered.length) * 100) / 100 : 0,
    };
  }, [filtered]);

  const deptChartData = useMemo(() => {
    return getStatsByDept()
      .map((s) => ({
        name: getDeptById(s.deptId)?.name ?? s.deptId,
        总消费: s.total,
        自费: s.selfPay,
        额度: Math.max(0, s.total - s.selfPay),
        color: getDeptById(s.deptId)?.color ?? 'blue',
      }))
      .sort((a, b) => b.总消费 - a.总消费);
  }, [expenses, getStatsByDept, getDeptById]);

  const roomChartData = useMemo(() => {
    return getStatsByRoom()
      .map((s) => ({
        name: getRoomById(s.roomId)?.name ?? s.roomId,
        消费金额: s.total,
        使用小时: Math.round(s.hours * 10) / 10,
      }))
      .sort((a, b) => b.消费金额 - a.消费金额)
      .slice(0, 8);
  }, [expenses, getStatsByRoom, getRoomById]);

  const monthlyTrendData = useMemo(() => {
    const months = getRecentMonths(6);
    return months.map((m) => {
      const start = `${m.label}-01`;
      const end = m.label + '-' + new Date(m.year, m.month, 0).getDate().toString().padStart(2, '0');
      const list = filterExpenses({ startDate: start, endDate: end });
      let quota = 0, self = 0;
      for (const e of list) {
        if (e.payType === 'quota') quota += e.amount;
        else if (e.payType === 'selfpay') self += e.amount;
      }
      return {
        name: m.label.slice(5),
        额度消费: Math.round(quota * 100) / 100,
        自费: Math.round(self * 100) / 100,
        合计: Math.round((quota + self) * 100) / 100,
      };
    });
  }, [expenses, filterExpenses]);

  const pieData = useMemo(() => {
    const data: Array<{ name: string; value: number; color: string }> = [];
    for (const s of deptChartData) {
      const c = s.color;
      const colorCode =
        c === 'blue' ? '#6366f1' :
        c === 'green' ? '#10b981' :
        c === 'amber' ? '#f59e0b' :
        c === 'rose' ? '#f43f5e' : '#8b5cf6';
      data.push({ name: s.name, value: s.总消费, color: colorCode });
    }
    return data;
  }, [deptChartData]);

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const openSelfPay = (e: Expense) => {
    if (e.payType === 'selfpay') {
      if (confirm('确定取消自费，改为使用部门额度吗？若额度不足将根据当前策略处理。')) {
        const result = switchExpensePayType(e.id, 'quota');
        if (!result.ok) alert(result.message);
      }
      return;
    }
    if (e.payType === 'pending_apply') {
      alert('待申请记录无法直接切换，请先审批或在预约中处理。');
      return;
    }
    setSelfpayModal(e);
    setReimburser(getDeptById(e.deptId)?.manager ?? '');
  };

  const submitSelfPay = () => {
    if (!selfpayModal || !reimburser) return;
    const result = switchExpensePayType(selfpayModal.id, 'selfpay', reimburser);
    if (!result.ok) {
      alert(result.message);
      return;
    }
    setSelfpayModal(null);
  };

  const clearFilters = () => {
    setDeptFilter('all');
    setRoomFilter('all');
    setPayTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setKeyword('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">消费明细</h1>
          <p className="text-sm text-slate-500 mt-1">全量预约消费记录查询、自费转换与多维度统计分析</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Download size={16} />} onClick={() => {
            const header = ['日期', '部门', '会议室', '时长', '单价', '金额', '类型', '报销人'];
            const rows = filtered.map((e) => [
              e.expenseDate,
              getDeptById(e.deptId)?.name ?? '',
              getRoomById(e.roomId)?.name ?? '',
              `${e.hours}h`,
              e.unitPrice.toFixed(2),
              e.amount.toFixed(2),
              e.payType === 'quota' ? '额度' : e.payType === 'selfpay' ? '自费' : '待申请',
              e.reimburser ?? '',
            ].join(','));
            const csv = [header.join(','), ...rows].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `消费明细_${formatDate(new Date(), 'yyyyMMdd')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="消费笔数" value={summary.count} variant="primary" icon={<FileText size={20} />} />
        <StatCard title="消费总金额" value={formatCurrency(summary.total)} variant="teal" icon={<Receipt size={20} />} />
        <StatCard title="额度消费" value={formatCurrency(summary.quota)} variant="amber" icon={<Banknote size={20} />} />
        <StatCard title="自费消费" value={formatCurrency(summary.self)} variant="rose" icon={<CreditCard size={20} />} />
        {summary.pending > 0 && (
          <StatCard title="待申请金额" value={formatCurrency(summary.pending)} variant="info" icon={<AlertTriangle size={20} />} />
        )}
        <StatCard title="累计使用时长" value={`${summary.hours} h`} variant="default" icon={<TrendingUp size={20} />} subtitle={`单均 ${formatCurrency(summary.avg)}`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer" onClick={() => setChartOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <PieChartIcon size={18} className="text-primary-700" />
            <h2 className="font-serif font-semibold text-slate-900">统计分析</h2>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {chartOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        {chartOpen && (
          <div className="p-5 space-y-6 animate-slide-down">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <BarIcon size={16} className="text-teal-600" /> 各部门消费构成
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <RechartsBar dataKey="额度" stackId="a" fill="#0d9488" radius={[0, 0, 4, 4]} />
                    <RechartsBar dataKey="自费" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50/50 to-white border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <PieChartIcon size={16} className="text-primary-700" /> 部门消费占比
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-white border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-amber-600" /> 近 6 个月消费趋势
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="额度消费" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="自费" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50/30 to-white border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <BarIcon size={16} className="text-rose-600" /> 会议室消费 TOP 8
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={roomChartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <RechartsBar dataKey="消费金额" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-primary-700" />
              <h2 className="font-serif font-semibold text-slate-900">筛选条件</h2>
              {(deptFilter !== 'all' || roomFilter !== 'all' || payTypeFilter !== 'all' || startDate || endDate || keyword) && (
                <Badge variant="info">已筛选 {filtered.length} 条</Badge>
              )}
            </div>
            <button onClick={clearFilters} className="text-xs text-primary-700 hover:text-primary-900 font-medium">
              清除筛选
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="搜索部门/会议室/报销人..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              options={[{ value: 'all', label: '全部部门' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            />
            <Select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              options={[{ value: 'all', label: '全部会议室' }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]}
            />
            <Select
              value={payTypeFilter}
              onChange={(e) => setPayTypeFilter(e.target.value as typeof payTypeFilter)}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'quota', label: '额度消费' },
                { value: 'selfpay', label: '自费消费' },
                { value: 'pending_apply', label: '待申请' },
              ]}
            />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="起始日期" />
          </div>
          {startDate || endDate ? (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-6 gap-3">
              <div className="lg:col-start-5 lg:col-span-1">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="结束日期" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSort('expenseDate')}
                >
                  <div className="flex items-center gap-1">
                    日期 {sortField === 'expenseDate' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">部门</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">会议室</th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100"
                  onClick={() => toggleSort('hours')}
                >
                  <div className="flex items-center justify-end gap-1">
                    时长 {sortField === 'hours' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">单价</th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    金额 {sortField === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">类型</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">暂无符合条件的消费记录</p>
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const dept = getDeptById(e.deptId);
                const room = getRoomById(e.roomId);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-mono text-slate-800">{e.expenseDate}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{e.id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {dept && (
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', colorMap(dept.color, 100), textColorMap(dept.color))}>
                          {dept.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <p className="font-medium">{room?.name}</p>
                      <p className="text-[11px] text-slate-500">{room?.location}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{e.hours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(e.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">
                      {e.payType === 'quota' ? (
                        <Badge variant="success"><Banknote size={11} className="mr-1" /> 额度</Badge>
                      ) : e.payType === 'pending_apply' ? (
                        <Badge variant="info"><AlertTriangle size={11} className="mr-1" /> 待申请审批</Badge>
                      ) : (
                        <Badge variant="warning"><CreditCard size={11} className="mr-1" /> 自费 · {e.reimburser}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDetailModal(e)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-primary-50 hover:text-primary-700"
                          title="详情"
                        >
                          <FileText size={14} />
                        </button>
                        {e.payType === 'pending_apply' && e.bookingId && (
                          <button
                            onClick={() => {
                              if (confirm('审批通过？通过后将占用部门额度。')) {
                                const r = approvePendingBooking(e.bookingId!);
                                if (!r.ok) alert(r.message);
                              }
                            }}
                            className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50"
                            title="审批通过"
                          >
                            <CheckIcon size={14} />
                          </button>
                        )}
                        {e.payType !== 'pending_apply' && (
                          <button
                            onClick={() => openSelfPay(e)}
                            className={cn(
                              'p-1.5 rounded-md',
                              e.payType === 'selfpay'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600',
                            )}
                            title={e.payType === 'selfpay' ? '取消自费' : '转自费'}
                          >
                            <ArrowLeftRight size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
          <span>共 {filtered.length} 条记录</span>
          <span>合计金额：<span className="font-mono font-bold text-slate-900">{formatCurrency(summary.total)}</span> · 合计时长 <span className="font-mono font-bold text-slate-900">{summary.hours}h</span></span>
        </div>
      </div>

      <Modal
        open={!!selfpayModal}
        title="转换为自费消费"
        size="md"
        onClose={() => setSelfpayModal(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelfpayModal(null)}>取消</Button>
            <Button variant="danger" icon={<ArrowLeftRight size={16} />} onClick={submitSelfPay}>
              确认转换
            </Button>
          </>
        }
      >
        {selfpayModal && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <CreditCard size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">转换说明</p>
                <p className="text-xs mt-1 text-amber-700">
                  此笔消费将不计入部门额度，改为由个人自费。请填写报销人信息，便于后续财务对账。
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">日期 / 会议室</p>
                <p className="font-semibold text-slate-800">{selfpayModal.expenseDate}</p>
                <p className="text-xs text-slate-600">{getRoomById(selfpayModal.roomId)?.name}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-100">
                <p className="text-xs text-slate-400 mb-1">消费金额</p>
                <p className="font-mono font-bold text-rose-700 text-lg">{formatCurrency(selfpayModal.amount)}</p>
                <p className="text-xs text-slate-500">{selfpayModal.hours}h × {formatCurrency(selfpayModal.unitPrice)}</p>
              </div>
            </div>
            <Input
              label="报销人姓名"
              placeholder="请输入报销人姓名"
              value={reimburser}
              onChange={(e) => setReimburser(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!detailModal}
        title="消费详情"
        size="md"
        onClose={() => setDetailModal(null)}
      >
        {detailModal && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-400 text-xs mb-1">消费编号</dt>
                <dd className="font-mono text-slate-800">{detailModal.id}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">消费日期</dt>
                <dd className="font-mono text-slate-800">{detailModal.expenseDate}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">使用部门</dt>
                <dd className="font-semibold text-slate-900">{getDeptById(detailModal.deptId)?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">会议室</dt>
                <dd className="font-semibold text-slate-900">{getRoomById(detailModal.roomId)?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">使用时长</dt>
                <dd className="font-mono text-slate-800">{detailModal.hours} 小时</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">小时费率</dt>
                <dd className="font-mono text-slate-800">{formatCurrency(detailModal.unitPrice)}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">关联预约</dt>
                <dd className="font-mono text-slate-700 text-xs">{detailModal.bookingId}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs mb-1">支付类型</dt>
                <dd>
                  {detailModal.payType === 'quota' ? (
                    <Badge variant="success">额度消费</Badge>
                  ) : detailModal.payType === 'pending_apply' ? (
                    <Badge variant="info">待申请审批</Badge>
                  ) : (
                    <Badge variant="warning">自费 · {detailModal.reimburser}</Badge>
                  )}
                </dd>
              </div>
              <div className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">消费总金额</p>
                  <p className="text-xs text-slate-600 mt-0.5">生成时间 {formatDateTime(new Date())}</p>
                </div>
                <p className="font-mono font-bold text-primary-800 text-2xl">{formatCurrency(detailModal.amount)}</p>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
};
