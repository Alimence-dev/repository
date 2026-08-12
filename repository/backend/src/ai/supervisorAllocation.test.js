const { parseTags, scoreSupervisorMatch, rankSupervisors } = require('./supervisorAllocation');

describe('parseTags', () => {
  it('splits, trims, and lowercases a comma-separated tag string', () => {
    expect(parseTags(' Machine Learning, Databases ,Web Development')).toEqual([
      'machine learning',
      'databases',
      'web development',
    ]);
  });

  it('returns an empty array for null/empty input', () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags('')).toEqual([]);
  });
});

describe('scoreSupervisorMatch', () => {
  const topic = 'A mobile app that uses machine learning to detect crop diseases';

  it('scores zero when the supervisor has no expertise tags', () => {
    const supervisor = { expertise_tags: null, active_project_count: 0 };
    expect(scoreSupervisorMatch(topic, supervisor)).toEqual({ score: 0, matchedTags: [] });
  });

  it('scores zero when none of the supervisor tags appear in the topic', () => {
    const supervisor = { expertise_tags: 'networking, security', active_project_count: 0 };
    const { score, matchedTags } = scoreSupervisorMatch(topic, supervisor);
    expect(score).toBe(0);
    expect(matchedTags).toEqual([]);
  });

  it('rewards higher tag overlap with the topic text', () => {
    const supervisor = { expertise_tags: 'machine learning, databases', active_project_count: 0 };
    const { score, matchedTags } = scoreSupervisorMatch(topic, supervisor);
    expect(matchedTags).toEqual(['machine learning']);
    // overlapRatio = 1/2 = 0.5, workloadPenalty = 1/(1+0) = 1
    expect(score).toBe(0.5);
  });

  it('penalizes supervisors with a heavier current workload', () => {
    const lightLoad = { expertise_tags: 'machine learning, databases', active_project_count: 0 };
    const heavyLoad = { expertise_tags: 'machine learning, databases', active_project_count: 3 };

    const lightScore = scoreSupervisorMatch(topic, lightLoad).score;
    const heavyScore = scoreSupervisorMatch(topic, heavyLoad).score;

    expect(lightScore).toBeGreaterThan(heavyScore);
    // overlapRatio = 0.5, workloadPenalty = 1/(1+3) = 0.25 => 0.125
    expect(heavyScore).toBe(0.125);
  });
});

describe('rankSupervisors', () => {
  const topic = 'A mobile app that uses machine learning to detect crop diseases';

  it('ranks a strong low-workload match above a strong high-workload match above a non-match', () => {
    const supervisors = [
      { user_id: 1, full_name: 'Heavy Load', expertise_tags: 'machine learning, databases', active_project_count: 3 },
      { user_id: 2, full_name: 'Light Load', expertise_tags: 'machine learning, databases', active_project_count: 0 },
      { user_id: 3, full_name: 'No Match', expertise_tags: 'networking, security', active_project_count: 0 },
    ];

    const ranked = rankSupervisors(topic, supervisors);

    expect(ranked.map((r) => r.full_name)).toEqual(['Light Load', 'Heavy Load', 'No Match']);
    expect(ranked[0].match_score).toBeGreaterThan(ranked[1].match_score);
    expect(ranked[2].match_score).toBe(0);
  });
});
