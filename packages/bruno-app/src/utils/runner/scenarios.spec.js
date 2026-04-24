import {
  buildRunnerScenario,
  getRunnerScenarios,
  normalizeRunnerScenario,
  upsertRunnerScenario
} from './scenarios';

describe('runner scenarios utils', () => {
  it('normalizes a scenario payload', () => {
    expect(
      normalizeRunnerScenario({
        id: 'scenario-1',
        name: ' Smoke ',
        selectedRequestItems: ['req-2', 'req-1', 'req-1'],
        requestItemsOrder: ['req-2', '', 'req-1', 'req-2'],
        delay: '50',
        tags: {
          include: ['beta', 'smoke', 'beta'],
          exclude: ['skip', '']
        }
      })
    ).toEqual({
      id: 'scenario-1',
      name: 'Smoke',
      selectedRequestItems: ['req-2', 'req-1'],
      requestItemsOrder: ['req-2', 'req-1'],
      delay: 50,
      tags: {
        include: ['beta', 'smoke'],
        exclude: ['skip']
      }
    });
  });

  it('drops invalid delay values when normalizing scenarios', () => {
    expect(
      normalizeRunnerScenario({
        id: 'scenario-2',
        name: 'Invalid Delay',
        selectedRequestItems: ['req-1'],
        requestItemsOrder: ['req-1'],
        delay: 'oops'
      })
    ).toEqual({
      id: 'scenario-2',
      name: 'Invalid Delay',
      selectedRequestItems: ['req-1'],
      requestItemsOrder: ['req-1'],
      tags: {
        include: [],
        exclude: []
      }
    });
  });

  it('filters invalid scenarios from bruno config', () => {
    expect(
      getRunnerScenarios({
        runnerScenarios: [
          { id: 'ok', name: 'Valid', selectedRequestItems: ['req-1'] },
          { id: '', name: 'Missing id' },
          null
        ]
      })
    ).toEqual([
      {
        id: 'ok',
        name: 'Valid',
        selectedRequestItems: ['req-1'],
        requestItemsOrder: [],
        tags: {
          include: [],
          exclude: []
        }
      }
    ]);
  });

  it('upserts scenarios by id', () => {
    const scenario = buildRunnerScenario({
      id: 'smoke',
      name: 'Smoke',
      selectedRequestItems: ['req-1'],
      requestItemsOrder: ['req-1']
    });

    const updated = upsertRunnerScenario([scenario], {
      id: 'smoke',
      name: 'Smoke Updated',
      selectedRequestItems: ['req-2'],
      requestItemsOrder: ['req-2']
    });

    expect(updated).toEqual([
      {
        id: 'smoke',
        name: 'Smoke Updated',
        selectedRequestItems: ['req-2'],
        requestItemsOrder: ['req-2'],
        tags: {
          include: [],
          exclude: []
        }
      }
    ]);
  });
});
