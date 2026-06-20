import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Booking } from '@/types';
import { seedBookings } from '@/data/seed';
import { generateId } from '@/lib/utils';
import { isTimeOverlap } from '@/utils/dateUtils';

interface CreateBookingInput {
  roomId: string;
  deptId: string;
  ruleId?: string;
  title: string;
  startAt: string;
  endAt: string;
  source?: 'manual' | 'recurring';
  isSelfPay?: boolean;
}

interface BookingState {
  bookings: Booking[];
  addBooking: (b: CreateBookingInput) => Booking;
  addBookingsBatch: (list: CreateBookingInput[]) => Booking[];
  updateBooking: (id: string, b: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  removeBooking: (id: string) => void;
  moveBooking: (
    id: string,
    newStartAt: string,
    newEndAt: string,
    newRoomId?: string,
  ) => { ok: boolean; conflict?: Booking };
  checkConflict: (
    roomId: string,
    startAt: string,
    endAt: string,
    excludeId?: string,
  ) => Booking | undefined;
  getBookingsByRoomAndDate: (roomId: string, dateStr: string) => Booking[];
  getBookingsInRange: (startDate: string, endDate: string) => Booking[];
  getBookingsByRuleId: (ruleId: string) => Booking[];
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      bookings: seedBookings,

      addBooking: (b) => {
        const nb: Booking = {
          id: generateId('bk'),
          status: 'confirmed',
          source: b.source ?? 'manual',
          isSelfPay: b.isSelfPay ?? false,
          ...b,
        };
        set((s) => ({ bookings: [...s.bookings, nb] }));
        return nb;
      },

      addBookingsBatch: (list) => {
        const created = list.map((b) => ({
          id: generateId('bk'),
          status: 'confirmed' as const,
          source: b.source ?? 'recurring',
          isSelfPay: b.isSelfPay ?? false,
          ...b,
        }));
        set((s) => ({ bookings: [...s.bookings, ...created] }));
        return created;
      },

      updateBooking: (id, b) =>
        set((s) => ({
          bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...b } : x)),
        })),

      cancelBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === id ? { ...x, status: 'cancelled' } : x,
          ),
        })),

      removeBooking: (id) =>
        set((s) => ({ bookings: s.bookings.filter((x) => x.id !== id) })),

      moveBooking: (id, newStartAt, newEndAt, newRoomId) => {
        const target = get().bookings.find((b) => b.id === id);
        if (!target) return { ok: false };
        const conflict = get().checkConflict(
          newRoomId ?? target.roomId,
          newStartAt,
          newEndAt,
          id,
        );
        if (conflict) return { ok: false, conflict };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === id
              ? {
                  ...x,
                  startAt: newStartAt,
                  endAt: newEndAt,
                  roomId: newRoomId ?? x.roomId,
                  source: 'manual',
                }
              : x,
          ),
        }));
        return { ok: true };
      },

      checkConflict: (roomId, startAt, endAt, excludeId) => {
        return get().bookings.find((b) => {
          if (b.status === 'cancelled') return false;
          if (excludeId && b.id === excludeId) return false;
          if (b.roomId !== roomId) return false;
          return isTimeOverlap(b.startAt, b.endAt, startAt, endAt);
        });
      },

      getBookingsByRoomAndDate: (roomId, dateStr) =>
        get().bookings.filter(
          (b) =>
            b.roomId === roomId &&
            b.status !== 'cancelled' &&
            b.startAt.slice(0, 10) === dateStr,
        ),

      getBookingsInRange: (startDate, endDate) =>
        get().bookings.filter(
          (b) =>
            b.status !== 'cancelled' &&
            b.startAt.slice(0, 10) >= startDate &&
            b.startAt.slice(0, 10) <= endDate,
        ),

      getBookingsByRuleId: (ruleId) =>
        get().bookings.filter((b) => b.ruleId === ruleId),

      reset: () => set({ bookings: seedBookings }),
    }),
    { name: 'mbs-booking-store' },
  ),
);
