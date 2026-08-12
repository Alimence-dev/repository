const { hasRoomConflict, hasPanelConflict, findAvailableSlot } = require('./defenseScheduling');

const existingDefenses = [
  { room: 'Room A', scheduled_date: '2026-08-01T09:00:00', panel_members: [1, 2] },
  { room: 'Room B', scheduled_date: '2026-08-01T10:30:00', panel_members: [3, 4] },
];

describe('hasRoomConflict', () => {
  it('flags a conflict when the same room overlaps in time', () => {
    const candidate = { room: 'Room A', scheduled_date: '2026-08-01T09:30:00' };
    expect(hasRoomConflict(candidate, existingDefenses)).toBe(true);
  });

  it('does not flag a conflict for a different room at the same time', () => {
    const candidate = { room: 'Room C', scheduled_date: '2026-08-01T09:00:00' };
    expect(hasRoomConflict(candidate, existingDefenses)).toBe(false);
  });

  it('does not flag a conflict for the same room at a non-overlapping time', () => {
    const candidate = { room: 'Room A', scheduled_date: '2026-08-01T11:00:00' };
    expect(hasRoomConflict(candidate, existingDefenses)).toBe(false);
  });
});

describe('hasPanelConflict', () => {
  it('flags a conflict when a panel member is already booked at an overlapping time', () => {
    const candidate = { room: 'Room C', scheduled_date: '2026-08-01T09:15:00' };
    expect(hasPanelConflict(candidate, existingDefenses, [2, 5])).toBe(true);
  });

  it('does not flag a conflict when panel members are free', () => {
    const candidate = { room: 'Room C', scheduled_date: '2026-08-01T09:15:00' };
    expect(hasPanelConflict(candidate, existingDefenses, [5, 6])).toBe(false);
  });
});

describe('findAvailableSlot', () => {
  it('skips conflicting candidates and returns the first free one', () => {
    const candidates = [
      { room: 'Room A', scheduled_date: '2026-08-01T09:00:00' }, // room conflict
      { room: 'Room C', scheduled_date: '2026-08-01T09:15:00' }, // panel conflict with member 2
      { room: 'Room C', scheduled_date: '2026-08-01T13:00:00' }, // free
    ];

    const result = findAvailableSlot(candidates, existingDefenses, [2, 7]);
    expect(result).toEqual({ room: 'Room C', scheduled_date: '2026-08-01T13:00:00' });
  });

  it('returns null when every candidate conflicts', () => {
    const candidates = [
      { room: 'Room A', scheduled_date: '2026-08-01T09:00:00' },
      { room: 'Room B', scheduled_date: '2026-08-01T10:30:00' },
    ];

    const result = findAvailableSlot(candidates, existingDefenses, [1, 3]);
    expect(result).toBeNull();
  });
});
