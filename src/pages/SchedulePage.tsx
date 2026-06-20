import React, { useMemo, useState } from 'react';
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Settings2,
  Monitor,
  MapPin,
  Users,
  DollarSign,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Power,
  Edit3,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { useMeetingStore } from '@/stores/meetingStore';
import { useBookingStore } from '@/stores/bookingStore';
import { Booking, MeetingRoom, Device, DeviceType } from '@/types';
import { cn, formatCurrency, generateId } from '@/lib/utils';
import { WEEKDAY_LABELS, formatCNDate, formatTime } from '@/utils/dateUtils';
import { colorMap, textColorMap, borderColorMap } from '@/lib/utils';
import {
  createBookingWithWorkflow,
  updateBookingWithWorkflow,
  cancelBookingWithWorkflow,
  moveBookingWithWorkflow,
  approvePendingBooking,
} from '@/utils/bookingWorkflow';

const HOUR_START = 8;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const CELL_HEIGHT = 44;

interface RoomFormData {
  name: string;
  location: string;
  capacity: string;
  hourlyRate: string;
  status: 'active' | 'maintenance';
  features: string;
}

const defaultRoomForm: RoomFormData = {
  name: '',
  location: '',
  capacity: '10',
  hourlyRate: '50',
  status: 'active',
  features: '',
};

const deviceTypeLabels: Record<DeviceType, string> = {
  projector: '投影仪',
  tv: '显示屏/电视',
  whiteboard: '电子白板',
  camera: '摄像/视频会议',
};

export const SchedulePage: React.FC = () => {
  const { rooms, departments, devices, addRoom, updateRoom, removeRoom, addDevice, updateDevice, removeDevice, toggleDeviceEnabled, getDeptById, getDevicesByRoomId } = useMeetingStore();
  const { bookings, addBooking, updateBooking, cancelBooking, moveBooking, checkConflict } = useBookingStore();

  const [weekBase, setWeekBase] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekBase, i)), [weekBase]);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(defaultRoomForm);
  const [deviceModalRoomId, setDeviceModalRoomId] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', type: 'projector' as DeviceType });
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({
    title: '',
    roomId: '',
    deptId: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    isSelfPay: false,
  });
  const [conflictMsg, setConflictMsg] = useState('');
  const [dragging, setDragging] = useState<{ bookingId: string; offsetY: number } | null>(null);

  const goPrevWeek = () => setWeekBase((d) => addWeeks(d, -1));
  const goNextWeek = () => setWeekBase((d) => addWeeks(d, 1));
  const goToday = () => setWeekBase(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm(defaultRoomForm);
    setRoomModalOpen(true);
  };

  const openEditRoom = (r: MeetingRoom) => {
    setEditingRoom(r);
    setRoomForm({
      name: r.name,
      location: r.location,
      capacity: String(r.capacity),
      hourlyRate: String(r.hourlyRate),
      status: r.status,
      features: r.features.join('、'),
    });
    setRoomModalOpen(true);
  };

  const submitRoomForm = () => {
    const features = roomForm.features
      .split(/[、,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const data = {
      name: roomForm.name,
      location: roomForm.location,
      capacity: Math.max(1, parseInt(roomForm.capacity) || 1),
      hourlyRate: Math.max(0, parseFloat(roomForm.hourlyRate) || 0),
      status: roomForm.status,
      features,
    };
    if (editingRoom) updateRoom(editingRoom.id, data);
    else addRoom(data);
    setRoomModalOpen(false);
  };

  const handleDeleteRoom = (r: MeetingRoom) => {
    if (confirm(`确定删除会议室「${r.name}」吗？`)) removeRoom(r.id);
  };

  const submitDeviceForm = () => {
    if (!deviceModalRoomId || !deviceForm.name) return;
    addDevice({
      roomId: deviceModalRoomId,
      name: deviceForm.name,
      type: deviceForm.type,
      enabled: true,
    });
    setDeviceForm({ name: '', type: 'projector' });
  };

  const openAddBooking = (roomId?: string, date?: Date, hour = 9) => {
    setEditingBooking(null);
    setConflictMsg('');
    setBookingForm({
      title: '',
      roomId: roomId || rooms[0]?.id || '',
      deptId: departments[0]?.id || '',
      date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`,
      isSelfPay: false,
    });
    setBookingModalOpen(true);
  };

  const openEditBooking = (b: Booking) => {
    setEditingBooking(b);
    setConflictMsg('');
    setBookingForm({
      title: b.title,
      roomId: b.roomId,
      deptId: b.deptId,
      date: b.startAt.slice(0, 10),
      startTime: formatTime(b.startAt),
      endTime: formatTime(b.endAt),
      isSelfPay: b.isSelfPay,
    });
    setBookingModalOpen(true);
  };

  const submitBookingForm = () => {
    const { title, roomId, deptId, date, startTime, endTime, isSelfPay } = bookingForm;
    if (!title || !roomId || !deptId) return;
    const startAt = `${date}T${startTime}:00`;
    const endAt = `${date}T${endTime}:00`;
    if (new Date(startAt) >= new Date(endAt)) {
      setConflictMsg('结束时间必须晚于开始时间');
      return;
    }
    const conflict = checkConflict(roomId, startAt, endAt, editingBooking?.id);
    if (conflict) {
      setConflictMsg(
        `时间冲突：与「${conflict.title}」(${formatTime(conflict.startAt)}-${formatTime(conflict.endAt)}) 重叠`,
      );
      return;
    }
    let result;
    if (editingBooking) {
      result = updateBookingWithWorkflow(editingBooking.id, {
        title,
        roomId,
        deptId,
        startAt,
        endAt,
        isSelfPay,
      });
    } else {
      result = createBookingWithWorkflow({
        title,
        roomId,
        deptId,
        startAt,
        endAt,
        source: 'manual',
        forceSelfPay: isSelfPay,
      });
    }
    if (!result.ok) {
      setConflictMsg(result.message);
      return;
    }
    setBookingModalOpen(false);
  };

  const getBookingsByRoomAndDate = (roomId: string, date: Date): Booking[] => {
    const ds = format(date, 'yyyy-MM-dd');
    return bookings.filter(
      (b) => b.roomId === roomId && b.status !== 'cancelled' && b.startAt.slice(0, 10) === ds,
    );
  };

  const bookingStyle = (b: Booking) => {
    const sd = parseISO(b.startAt);
    const ed = parseISO(b.endAt);
    const startMin = sd.getHours() * 60 + sd.getMinutes() - HOUR_START * 60;
    const durMin = (ed.getTime() - sd.getTime()) / 60000;
    const top = (startMin / 60) * CELL_HEIGHT;
    const height = Math.max((durMin / 60) * CELL_HEIGHT, 24);
    return { top: `${top}px`, height: `${height}px` };
  };

  const handleDragStart = (e: React.MouseEvent, bookingId: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDragging({ bookingId, offsetY: e.clientY - rect.top });
    e.preventDefault();
  };

  const handleCellMouseUp = (e: React.MouseEvent, roomId: string, date: Date, hour: number) => {
    if (!dragging) return;
    const cell = e.currentTarget as HTMLElement;
    const rect = cell.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const frac = Math.max(0, Math.min(1, relY / rect.height));
    const startHour = hour + Math.round(frac * 2) / 2;
    const booking = bookings.find((b) => b.id === dragging.bookingId);
    if (!booking) {
      setDragging(null);
      return;
    }
    const durationMs = parseISO(booking.endAt).getTime() - parseISO(booking.startAt).getTime();
    const durationH = durationMs / 3600000;
    const startH = Math.floor(startHour);
    const startM = startHour % 1 === 0 ? 0 : 30;
    const startStr = `${format(date, 'yyyy-MM-dd')}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`;
    const endDate = new Date(parseISO(startStr).getTime() + durationMs);
    const endStr = endDate.toISOString();
    const res = moveBookingWithWorkflow(dragging.bookingId, startStr, endStr, roomId);
    if (!res.ok) {
      alert(`移动失败：${res.message}`);
    }
    setDragging(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">会议室排期</h1>
          <p className="text-sm text-slate-500 mt-1">查看与管理所有会议室的预约情况，支持拖拽调整时间</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Settings2 size={16} />} onClick={openAddRoom}>
            新建会议室
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => openAddBooking()}>
            新建预约
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary-700" /> 会议室列表
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/40 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                        {r.status === 'maintenance' && <Badge variant="warning">维护中</Badge>}
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5"><MapPin size={12} /> {r.location}</div>
                        <div className="flex items-center gap-1.5"><Users size={12} /> {r.capacity}人</div>
                        <div className="flex items-center gap-1.5"><DollarSign size={12} /> {formatCurrency(r.hourlyRate)}/小时</div>
                      </div>
                      {r.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.features.slice(0, 3).map((f) => (
                            <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditRoom(r)} title="编辑" className="p-1 rounded hover:bg-white text-slate-500 hover:text-primary-700">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeviceModalRoomId(r.id)}
                        title="设备管理"
                        className="p-1 rounded hover:bg-white text-slate-500 hover:text-teal-600"
                      >
                        <Monitor size={14} />
                      </button>
                      <button onClick={() => handleDeleteRoom(r)} title="删除" className="p-1 rounded hover:bg-white text-slate-500 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrevWeek}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-700 text-white hover:bg-primary-600 transition-colors"
              >
                今天
              </button>
              <button
                onClick={goNextWeek}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <div className="ml-2">
                <p className="font-serif text-base font-semibold text-slate-900">
                  {formatCNDate(weekDates[0])} - {formatCNDate(weekDates[6])}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              共 {rooms.length} 个会议室 · {bookings.filter(b => b.startAt.slice(0, 10) >= format(weekDates[0], 'yyyy-MM-dd') && b.startAt.slice(0, 10) <= format(weekDates[6], 'yyyy-MM-dd') && b.status !== 'cancelled').length} 个预约
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <div className="min-w-[900px]">
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                <div className="grid" style={{ gridTemplateColumns: `140px repeat(7, minmax(0,1fr))` }}>
                  <div className="p-3 border-r border-slate-100 text-xs text-slate-400 font-medium">时间 / 会议室</div>
                  {weekDates.map((d, i) => {
                    const isToday = isSameDay(d, new Date());
                    return (
                      <div
                        key={i}
                        className={cn(
                          'p-3 text-center border-r border-slate-100 last:border-r-0',
                          isToday && 'bg-primary-50/50',
                        )}
                      >
                        <p className="text-[11px] text-slate-500">{WEEKDAY_LABELS[d.getDay()]}</p>
                        <p className={cn('text-sm font-semibold mt-0.5', isToday ? 'text-primary-800' : 'text-slate-800')}>
                          {d.getMonth() + 1}月{d.getDate()}日
                          {isToday && <span className="ml-1 text-[10px] bg-primary-700 text-white px-1.5 py-0.5 rounded-full">今天</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="grid border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30 transition-colors"
                  style={{ gridTemplateColumns: `140px repeat(7, minmax(0,1fr))` }}
                >
                  <div className="p-3 border-r border-slate-100 bg-slate-50/50 sticky left-0 z-[1]">
                    <p className="text-xs font-semibold text-slate-800 truncate">{room.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{room.location} · {room.capacity}人</p>
                  </div>
                  {weekDates.map((date, di) => (
                    <div
                      key={di}
                      className="relative border-r border-slate-100 last:border-r-0"
                      style={{ height: HOURS.length * CELL_HEIGHT }}
                      onMouseUp={() => setDragging(null)}
                    >
                      {HOURS.map((h, hi) => (
                        <div
                          key={hi}
                          className={cn(
                            'absolute left-0 right-0 border-t border-dashed border-slate-100 cursor-pointer hover:bg-primary-50/30 transition-colors',
                          )}
                          style={{ top: hi * CELL_HEIGHT, height: CELL_HEIGHT }}
                          onMouseUp={(e) => handleCellMouseUp(e, room.id, date, h)}
                          onDoubleClick={() => openAddBooking(room.id, date, h)}
                        >
                          {hi === 0 && (
                            <span className="absolute left-1 top-0.5 text-[10px] text-slate-400 font-mono">
                              {String(h).padStart(2, '0')}:00
                            </span>
                          )}
                        </div>
                      ))}
                      {getBookingsByRoomAndDate(room.id, date).map((b) => {
                        const dept = getDeptById(b.deptId);
                        const style = bookingStyle(b);
                        return (
                          <div
                            key={b.id}
                            className={cn(
                              'absolute left-1 right-1 rounded-lg border px-2 py-1 cursor-move shadow-sm hover:shadow-md transition-all overflow-hidden z-[2]',
                              b.status === 'pending_apply'
                                ? 'bg-violet-50 border-violet-300 border-dashed border-2'
                                : b.isSelfPay ? 'bg-amber-50 border-amber-300' : dept ? cn(colorMap(dept.color, 50), borderColorMap(dept.color)) : 'bg-slate-50 border-slate-200',
                              dragging?.bookingId === b.id && 'ring-2 ring-primary-500',
                            )}
                            style={style}
                            onMouseDown={(e) => handleDragStart(e, b.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              openEditBooking(b);
                            }}
                            title={`${b.title} - ${formatTime(b.startAt)} ~ ${formatTime(b.endAt)}${b.isSelfPay ? ' (自费)' : ''}`}
                          >
                            <div className="flex items-start gap-1 min-h-0">
                              <GripVertical size={12} className={cn('mt-0.5 shrink-0', dept ? textColorMap(dept.color) : 'text-slate-400')} />
                              <div className="min-w-0 flex-1">
                                <p className={cn('text-[11px] font-semibold truncate', b.status === 'pending_apply' ? 'text-violet-700' : dept ? textColorMap(dept.color) : 'text-slate-700')}>
                                  {b.title}
                                  {b.isSelfPay && <span className="ml-1 text-amber-600">自费</span>}
                                  {b.status === 'pending_apply' && <span className="ml-1 text-violet-600">待申请</span>}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {formatTime(b.startAt)}-{formatTime(b.endAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex flex-wrap items-center gap-4">
            <span>提示：双击空白时段可快速新建预约，拖拽预约块可移动时间或会议室</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />自费预约</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-50 border-2 border-dashed border-violet-300" />待申请</span>
          </div>
        </section>
      </div>

      <Modal
        open={roomModalOpen}
        title={editingRoom ? '编辑会议室' : '新建会议室'}
        onClose={() => setRoomModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoomModalOpen(false)}>取消</Button>
            <Button onClick={submitRoomForm}>保存</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="会议室名称"
            placeholder="如：星辰会议室"
            value={roomForm.name}
            onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
            className="col-span-2"
          />
          <Input
            label="位置"
            placeholder="如：A座 3F-301"
            value={roomForm.location}
            onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
          />
          <Select
            label="状态"
            value={roomForm.status}
            onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as 'active' | 'maintenance' })}
            options={[
              { value: 'active', label: '正常使用' },
              { value: 'maintenance', label: '维护中' },
            ]}
          />
          <Input
            type="number"
            min={1}
            label="容纳人数"
            value={roomForm.capacity}
            onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            step={0.5}
            label="每小时费率（元）"
            value={roomForm.hourlyRate}
            onChange={(e) => setRoomForm({ ...roomForm, hourlyRate: e.target.value })}
          />
          <Input
            label="配套设施（用顿号或逗号分隔）"
            placeholder="如：投影仪、白板、视频会议"
            value={roomForm.features}
            onChange={(e) => setRoomForm({ ...roomForm, features: e.target.value })}
            className="col-span-2"
          />
        </div>
      </Modal>

      <Modal
        open={!!deviceModalRoomId}
        title={`设备绑定 - ${rooms.find((r) => r.id === deviceModalRoomId)?.name}`}
        size="lg"
        onClose={() => {
          setDeviceModalRoomId(null);
          setDeviceForm({ name: '', type: 'projector' });
        }}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-[1fr,160px,auto] gap-3 items-end">
            <Input
              label="设备名称"
              placeholder="如：EPSON CB-X50 投影仪"
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
            />
            <Select
              label="设备类型"
              value={deviceForm.type}
              onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value as DeviceType })}
              options={Object.entries(deviceTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Button onClick={submitDeviceForm} icon={<Plus size={16} />}>添加</Button>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">设备名称</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">类型</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">状态</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 w-32">操作</th>
                </tr>
              </thead>
              <tbody>
                {deviceModalRoomId && getDevicesByRoomId(deviceModalRoomId).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                      暂无绑定设备
                    </td>
                  </tr>
                )}
                {deviceModalRoomId && getDevicesByRoomId(deviceModalRoomId).map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{d.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{deviceTypeLabels[d.type]}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={d.enabled ? 'success' : 'neutral'}>
                        {d.enabled ? '启用' : '停用'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggleDeviceEnabled(d.id)}
                          title={d.enabled ? '停用' : '启用'}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => removeDevice(d.id)}
                          title="移除"
                          className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={bookingModalOpen}
        title={editingBooking ? '编辑预约' : '新建预约'}
        onClose={() => setBookingModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBookingModalOpen(false)}>取消</Button>
            {editingBooking && (
              <>
                {editingBooking.status === 'pending_apply' && (
                  <Button
                    variant="secondary"
                    icon={<Check size={16} />}
                    onClick={() => {
                      const r = approvePendingBooking(editingBooking.id);
                      if (r.ok) {
                        alert(r.message);
                        setBookingModalOpen(false);
                      } else {
                        setConflictMsg(r.message);
                      }
                    }}
                  >
                    审批通过
                  </Button>
                )}
                <Button
                  variant="danger"
                  icon={<Trash2 size={16} />}
                  onClick={() => {
                    if (confirm('确定取消此预约吗？对应额度将退回。')) {
                      const r = cancelBookingWithWorkflow(editingBooking.id);
                      if (!r.ok) alert(r.message);
                      setBookingModalOpen(false);
                    }
                  }}
                >
                  取消预约
                </Button>
              </>
            )}
            <Button onClick={submitBookingForm}>{editingBooking ? '保存修改' : '确认预约'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="会议主题"
            placeholder="请输入会议主题"
            value={bookingForm.title}
            onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
            className="col-span-2"
          />
          <Select
            label="会议室"
            value={bookingForm.roomId}
            onChange={(e) => setBookingForm({ ...bookingForm, roomId: e.target.value })}
            options={rooms.map((r) => ({ value: r.id, label: `${r.name} (${r.location}, ${formatCurrency(r.hourlyRate)}/h)` }))}
          />
          <Select
            label="使用部门"
            value={bookingForm.deptId}
            onChange={(e) => setBookingForm({ ...bookingForm, deptId: e.target.value })}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Input
            type="date"
            label="日期"
            value={bookingForm.date}
            onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              label="开始时间"
              value={bookingForm.startTime}
              onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
            />
            <Input
              type="time"
              label="结束时间"
              value={bookingForm.endTime}
              onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bookingForm.isSelfPay}
              onChange={(e) => setBookingForm({ ...bookingForm, isSelfPay: e.target.checked })}
              className="w-4 h-4 rounded text-primary-700 focus:ring-primary-500"
            />
            <span className="font-medium">标记为自费（不计入部门额度）</span>
            {bookingForm.isSelfPay && (
              <Badge variant="warning" className="ml-2"><AlertTriangle size={11} className="mr-1" />将产生自费消费</Badge>
            )}
          </label>
          {conflictMsg && (
            <div className="col-span-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {conflictMsg}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
