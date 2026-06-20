import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Department, MeetingRoom, Device } from '@/types';
import {
  seedDepartments,
  seedMeetingRooms,
  seedDevices,
} from '@/data/seed';
import { generateId } from '@/lib/utils';

interface MeetingState {
  departments: Department[];
  rooms: MeetingRoom[];
  devices: Device[];
  addDepartment: (d: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, d: Partial<Department>) => void;
  addRoom: (r: Omit<MeetingRoom, 'id'>) => void;
  updateRoom: (id: string, r: Partial<MeetingRoom>) => void;
  removeRoom: (id: string) => void;
  addDevice: (d: Omit<Device, 'id'>) => void;
  updateDevice: (id: string, d: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  toggleDeviceEnabled: (id: string) => void;
  getRoomById: (id: string) => MeetingRoom | undefined;
  getDeptById: (id: string) => Department | undefined;
  getDevicesByRoomId: (roomId: string) => Device[];
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>()(
  persist(
    (set, get) => ({
      departments: seedDepartments,
      rooms: seedMeetingRooms,
      devices: seedDevices,

      addDepartment: (d) =>
        set((s) => ({
          departments: [...s.departments, { ...d, id: generateId('dept') }],
        })),

      updateDepartment: (id, d) =>
        set((s) => ({
          departments: s.departments.map((x) =>
            x.id === id ? { ...x, ...d } : x,
          ),
        })),

      addRoom: (r) =>
        set((s) => ({
          rooms: [...s.rooms, { ...r, id: generateId('room') }],
        })),

      updateRoom: (id, r) =>
        set((s) => ({
          rooms: s.rooms.map((x) => (x.id === id ? { ...x, ...r } : x)),
        })),

      removeRoom: (id) =>
        set((s) => ({ rooms: s.rooms.filter((x) => x.id !== id) })),

      addDevice: (d) =>
        set((s) => ({
          devices: [...s.devices, { ...d, id: generateId('dev') }],
        })),

      updateDevice: (id, d) =>
        set((s) => ({
          devices: s.devices.map((x) => (x.id === id ? { ...x, ...d } : x)),
        })),

      removeDevice: (id) =>
        set((s) => ({ devices: s.devices.filter((x) => x.id !== id) })),

      toggleDeviceEnabled: (id) =>
        set((s) => ({
          devices: s.devices.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x,
          ),
        })),

      getRoomById: (id) => get().rooms.find((r) => r.id === id),
      getDeptById: (id) => get().departments.find((d) => d.id === id),
      getDevicesByRoomId: (roomId) =>
        get().devices.filter((d) => d.roomId === roomId),

      reset: () =>
        set({
          departments: seedDepartments,
          rooms: seedMeetingRooms,
          devices: seedDevices,
        }),
    }),
    { name: 'mbs-meeting-store' },
  ),
);
