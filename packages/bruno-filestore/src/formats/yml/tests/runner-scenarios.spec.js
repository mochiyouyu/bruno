const { parseYmlCollection, stringifyYmlCollection } = require('../index');

describe('yml runner scenarios', () => {
  it('round-trips runner scenarios through opencollection extensions', () => {
    const collectionRoot = {
      meta: null,
      request: null,
      docs: null
    };
    const brunoConfig = {
      name: 'Scenario Collection',
      runnerScenarios: [
        {
          id: 'smoke',
          name: 'Smoke',
          selectedRequestItems: ['req-1', 'req-2'],
          requestItemsOrder: ['req-2', 'req-1'],
          delay: 100,
          tags: {
            include: ['smoke'],
            exclude: ['skip']
          }
        }
      ],
      runnerScenarioSuites: [
        {
          id: 'suite-1',
          name: 'Nightly',
          scenarioIdsOrder: ['smoke']
        }
      ]
    };

    const yml = stringifyYmlCollection(collectionRoot, brunoConfig);
    const parsed = parseYmlCollection(yml);

    expect(parsed.brunoConfig.runnerScenarios).toEqual([
      {
        id: 'smoke',
        name: 'Smoke',
        selectedRequestItems: ['req-1', 'req-2'],
        requestItemsOrder: ['req-2', 'req-1'],
        delay: 100,
        tags: {
          include: ['smoke'],
          exclude: ['skip']
        }
      }
    ]);
    expect(parsed.brunoConfig.runnerScenarioSuites).toEqual([
      {
        id: 'suite-1',
        name: 'Nightly',
        scenarioIdsOrder: ['smoke']
      }
    ]);
  });

  it('sanitizes runner scenario delay values when parsing opencollection extensions', () => {
    const yml = `
opencollection: 1.0.0
info:
  name: Delay Collection
extensions:
  bruno:
    runner:
      scenarios:
        - id: smoke
          name: Smoke
          selectedRequestItems:
            - req-1
          requestItemsOrder:
            - req-1
          delay: "250"
        - id: invalid
          name: Invalid Delay
          selectedRequestItems:
            - req-2
          requestItemsOrder:
            - req-2
          delay: nope
`;

    const parsed = parseYmlCollection(yml);

    expect(parsed.brunoConfig.runnerScenarios).toEqual([
      {
        id: 'smoke',
        name: 'Smoke',
        selectedRequestItems: ['req-1'],
        requestItemsOrder: ['req-1'],
        delay: 250,
        tags: {
          include: [],
          exclude: []
        }
      },
      {
        id: 'invalid',
        name: 'Invalid Delay',
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
