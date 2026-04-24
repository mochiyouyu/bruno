import uniq from 'lodash/uniq';

const normalizeTagList = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return uniq(
    tags
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean)
  ).sort();
};

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

export const normalizeRunnerScenario = (scenario) => {
  if (!scenario || typeof scenario !== 'object') {
    return null;
  }

  const id = typeof scenario.id === 'string' ? scenario.id.trim() : '';
  const name = typeof scenario.name === 'string' ? scenario.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  const selectedRequestItems = uniq(
    (Array.isArray(scenario.selectedRequestItems) ? scenario.selectedRequestItems : [])
      .filter((uid) => typeof uid === 'string' && uid.trim())
  );
  const requestItemsOrder = uniq(
    (Array.isArray(scenario.requestItemsOrder) ? scenario.requestItemsOrder : [])
      .filter((uid) => typeof uid === 'string' && uid.trim())
  );
  const normalizedDelay = normalizeDelay(scenario.delay);

  return {
    id,
    name,
    selectedRequestItems,
    requestItemsOrder,
    ...(normalizedDelay !== undefined ? { delay: normalizedDelay } : {}),
    tags: {
      include: normalizeTagList(scenario.tags?.include),
      exclude: normalizeTagList(scenario.tags?.exclude)
    }
  };
};

export const getRunnerScenarios = (brunoConfig) => {
  const scenarios = Array.isArray(brunoConfig?.runnerScenarios) ? brunoConfig.runnerScenarios : [];

  return scenarios
    .map(normalizeRunnerScenario)
    .filter(Boolean);
};

export const buildRunnerScenario = ({
  id,
  name,
  selectedRequestItems = [],
  requestItemsOrder = [],
  delay,
  tags
}) =>
  normalizeRunnerScenario({
    id,
    name,
    selectedRequestItems,
    requestItemsOrder,
    ...(delay !== undefined ? { delay } : {}),
    tags
  });

export const upsertRunnerScenario = (scenarios, scenario) => {
  const normalizedScenario = normalizeRunnerScenario(scenario);
  if (!normalizedScenario) {
    return getRunnerScenarios({ runnerScenarios: scenarios });
  }

  const normalizedScenarios = getRunnerScenarios({ runnerScenarios: scenarios });
  const existingIndex = normalizedScenarios.findIndex(({ id }) => id === normalizedScenario.id);

  if (existingIndex === -1) {
    return [...normalizedScenarios, normalizedScenario];
  }

  const nextScenarios = [...normalizedScenarios];
  nextScenarios.splice(existingIndex, 1, normalizedScenario);
  return nextScenarios;
};
