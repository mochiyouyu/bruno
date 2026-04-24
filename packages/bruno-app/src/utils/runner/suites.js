import uniq from 'lodash/uniq';

const normalizeDelay = (delay) => {
  if (delay === undefined || delay === null || delay === '') {
    return undefined;
  }

  const numericDelay = typeof delay === 'number' ? delay : Number(delay);
  if (!Number.isFinite(numericDelay) || numericDelay < 0) {
    return undefined;
  }

  return numericDelay;
};

export const normalizeRunnerSuite = (suite) => {
  if (!suite || typeof suite !== 'object') {
    return null;
  }

  const id = typeof suite.id === 'string' ? suite.id.trim() : '';
  const name = typeof suite.name === 'string' ? suite.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    scenarioIdsOrder: uniq(
      (Array.isArray(suite.scenarioIdsOrder) ? suite.scenarioIdsOrder : [])
        .filter((scenarioId) => typeof scenarioId === 'string' && scenarioId.trim())
    )
  };
};

export const getRunnerSuites = (brunoConfig) => {
  const suites = Array.isArray(brunoConfig?.runnerScenarioSuites) ? brunoConfig.runnerScenarioSuites : [];

  return suites
    .map(normalizeRunnerSuite)
    .filter(Boolean);
};

export const buildRunnerSuite = ({ id, name, scenarioIdsOrder = [] }) =>
  normalizeRunnerSuite({
    id,
    name,
    scenarioIdsOrder
  });

export const upsertRunnerSuite = (suites, suite) => {
  const normalizedSuite = normalizeRunnerSuite(suite);
  if (!normalizedSuite) {
    return getRunnerSuites({ runnerScenarioSuites: suites });
  }

  const normalizedSuites = getRunnerSuites({ runnerScenarioSuites: suites });
  const existingIndex = normalizedSuites.findIndex(({ id }) => id === normalizedSuite.id);

  if (existingIndex === -1) {
    return [...normalizedSuites, normalizedSuite];
  }

  const nextSuites = [...normalizedSuites];
  nextSuites.splice(existingIndex, 1, normalizedSuite);
  return nextSuites;
};

const getScenarioRequestOrder = (scenario) => {
  const selectedSet = new Set(Array.isArray(scenario?.selectedRequestItems) ? scenario.selectedRequestItems : []);
  const orderedSelected = (Array.isArray(scenario?.requestItemsOrder) ? scenario.requestItemsOrder : [])
    .filter((uid) => selectedSet.has(uid));

  const leftovers = Array.from(selectedSet).filter((uid) => !orderedSelected.includes(uid));
  return [...orderedSelected, ...leftovers];
};

export const buildSuiteExecutionPlan = ({ suite, scenarios = [] }) => {
  const normalizedSuite = normalizeRunnerSuite(suite);
  if (!normalizedSuite) {
    return [];
  }

  const scenarioMap = new Map(
    scenarios
      .filter(Boolean)
      .map((scenario) => [scenario.id, scenario])
  );

  return normalizedSuite.scenarioIdsOrder.flatMap((scenarioId, scenarioIndex) => {
    const scenario = scenarioMap.get(scenarioId);
    if (!scenario) {
      return [];
    }

    const delay = normalizeDelay(scenario.delay);

    return getScenarioRequestOrder(scenario).map((uid, requestIndex) => ({
        uid,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        scenarioIndex,
        requestIndex,
        ...(delay !== undefined ? { delay } : {})
    }));
  });
};
