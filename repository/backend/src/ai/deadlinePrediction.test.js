const { computeRiskBand, predictCompletionDate } = require('./deadlinePrediction');

describe('computeRiskBand', () => {
  it('returns low when nothing is late or overdue', () => {
    const milestones = [
      { status: 'approved', due_date: '2020-01-01' },
      { status: 'submitted', due_date: '2099-01-01' },
    ];
    expect(computeRiskBand(milestones)).toBe('low');
  });

  it('returns medium when exactly one milestone is late or overdue', () => {
    const milestones = [
      { status: 'late', due_date: '2020-01-01' },
      { status: 'submitted', due_date: '2099-01-01' },
    ];
    expect(computeRiskBand(milestones)).toBe('medium');
  });

  it('treats a pending milestone past its due date as overdue', () => {
    const milestones = [{ status: 'pending', due_date: '2000-01-01' }];
    expect(computeRiskBand(milestones)).toBe('medium');
  });

  it('does not count an approved milestone as overdue even if its due date has passed', () => {
    const milestones = [{ status: 'approved', due_date: '2000-01-01' }];
    expect(computeRiskBand(milestones)).toBe('low');
  });

  it('returns high when two or more milestones are late or overdue', () => {
    const milestones = [
      { status: 'late', due_date: '2020-01-01' },
      { status: 'pending', due_date: '2000-01-01' },
      { status: 'submitted', due_date: '2099-01-01' },
    ];
    expect(computeRiskBand(milestones)).toBe('high');
  });
});

describe('predictCompletionDate', () => {
  it('adds pendingCount * avgDaysPerStage days to the reference date', () => {
    const result = predictCompletionDate(3, 10, new Date('2026-01-01T00:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('rounds fractional day totals to the nearest whole day', () => {
    const result = predictCompletionDate(1, 10.6, new Date('2026-01-01T00:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-12');
  });

  it('returns the reference date unchanged when there are no pending milestones', () => {
    const result = predictCompletionDate(0, 21, new Date('2026-01-01T00:00:00Z'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-01');
  });
});
