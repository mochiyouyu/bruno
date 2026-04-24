import {
  buildRunnerSuite,
  buildSuiteExecutionPlan,
  getRunnerSuites,
  normalizeRunnerSuite,
  upsertRunnerSuite
} from './suites';

describe('runner suites utils', () => {
  it('normalizes a suite payload', () => {
    expect(
      normalizeRunnerSuite({
        id: 'suite-1',
        name: ' Regression ',
        scenarioIdsOrder: ['smoke', 'regression', 'smoke', '']
      })
    ).toEqual({
      id: 'suite-1',
      name: 'Regression',
      scenarioIdsOrder: ['smoke', 'regression']
    });
  });

  it('filters invalid suites from bruno config', () => {
    expect(
      getRunnerSuites({
        runnerScenarioSuites: [
          { id: 'suite-a', name: 'A', scenarioIdsOrder: ['s1'] },
          { id: '', name: 'Missing id' }
        ]
      })
    ).toEqual([
      {
        id: 'suite-a',
        name: 'A',
        scenarioIdsOrder: ['s1']
      }
    ]);
  });

  it('upserts suites by id', () => {
    const suite = buildRunnerSuite({
      id: 'suite-a',
      name: 'Suite A',
      scenarioIdsOrder: ['s1']
    });

    expect(
      upsertRunnerSuite([suite], {
        id: 'suite-a',
        name: 'Suite A Updated',
        scenarioIdsOrder: ['s2', 's1']
      })
    ).toEqual([
      {
        id: 'suite-a',
        name: 'Suite A Updated',
        scenarioIdsOrder: ['s2', 's1']
      }
    ]);
  });

  it('builds an execution plan from ordered scenarios', () => {
    const suite = {
      id: 'suite-1',
      name: 'Suite',
      scenarioIdsOrder: ['s1', 's2']
    };
    const scenarios = [
      {
        id: 's1',
        name: 'Smoke',
        selectedRequestItems: ['req-1', 'req-2'],
        requestItemsOrder: ['req-2', 'req-1'],
        delay: 10
      },
      {
        id: 's2',
        name: 'Regression',
        selectedRequestItems: ['req-3'],
        requestItemsOrder: [],
        delay: 20
      }
    ];

    expect(buildSuiteExecutionPlan({ suite, scenarios })).toEqual([
      {
        uid: 'req-2',
        scenarioId: 's1',
        scenarioName: 'Smoke',
        scenarioIndex: 0,
        requestIndex: 0,
        delay: 10
      },
      {
        uid: 'req-1',
        scenarioId: 's1',
        scenarioName: 'Smoke',
        scenarioIndex: 0,
        requestIndex: 1,
        delay: 10
      },
      {
        uid: 'req-3',
        scenarioId: 's2',
        scenarioName: 'Regression',
        scenarioIndex: 1,
        requestIndex: 0,
        delay: 20
      }
    ]);
  });

  it('normalizes scenario delay values in the execution plan', () => {
    const suite = {
      id: 'suite-delay',
      name: 'Delay Suite',
      scenarioIdsOrder: ['s1', 's2']
    };
    const scenarios = [
      {
        id: 's1',
        name: 'String Delay',
        selectedRequestItems: ['req-1'],
        requestItemsOrder: ['req-1'],
        delay: '15'
      },
      {
        id: 's2',
        name: 'Invalid Delay',
        selectedRequestItems: ['req-2'],
        requestItemsOrder: ['req-2'],
        delay: 'oops'
      }
    ];

    expect(buildSuiteExecutionPlan({ suite, scenarios })).toEqual([
      {
        uid: 'req-1',
        scenarioId: 's1',
        scenarioName: 'String Delay',
        scenarioIndex: 0,
        requestIndex: 0,
        delay: 15
      },
      {
        uid: 'req-2',
        scenarioId: 's2',
        scenarioName: 'Invalid Delay',
        scenarioIndex: 1,
        requestIndex: 0
      }
    ]);
  });

  it('keeps duplicate requests when multiple scenarios reference the same request', () => {
    const suite = {
      id: 'suite-dup',
      name: 'Duplicate Requests',
      scenarioIdsOrder: ['s1', 's2']
    };
    const scenarios = [
      {
        id: 's1',
        name: 'First',
        selectedRequestItems: ['req-1'],
        requestItemsOrder: ['req-1']
      },
      {
        id: 's2',
        name: 'Second',
        selectedRequestItems: ['req-1', 'req-2'],
        requestItemsOrder: ['req-1', 'req-2']
      }
    ];

    expect(buildSuiteExecutionPlan({ suite, scenarios })).toEqual([
      {
        uid: 'req-1',
        scenarioId: 's1',
        scenarioName: 'First',
        scenarioIndex: 0,
        requestIndex: 0
      },
      {
        uid: 'req-1',
        scenarioId: 's2',
        scenarioName: 'Second',
        scenarioIndex: 1,
        requestIndex: 0
      },
      {
        uid: 'req-2',
        scenarioId: 's2',
        scenarioName: 'Second',
        scenarioIndex: 1,
        requestIndex: 1
      }
    ]);
  });

  it('skips missing scenarios and appends selected requests missing from the saved order', () => {
    const suite = {
      id: 'suite-missing',
      name: 'Missing Scenario References',
      scenarioIdsOrder: ['missing-scenario', 's1']
    };
    const scenarios = [
      {
        id: 's1',
        name: 'Partial Order',
        selectedRequestItems: ['req-2', 'req-1'],
        requestItemsOrder: ['req-2']
      }
    ];

    expect(buildSuiteExecutionPlan({ suite, scenarios })).toEqual([
      {
        uid: 'req-2',
        scenarioId: 's1',
        scenarioName: 'Partial Order',
        scenarioIndex: 1,
        requestIndex: 0
      },
      {
        uid: 'req-1',
        scenarioId: 's1',
        scenarioName: 'Partial Order',
        scenarioIndex: 1,
        requestIndex: 1
      }
    ]);
  });
});
