import React, { useState, useRef, useEffect } from 'react';
import path from 'utils/common/path';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { get, cloneDeep } from 'lodash';
import {
  runCollectionFolder,
  cancelRunnerExecution,
  mountCollection,
  updateRunnerConfiguration,
  updateBrunoConfig
} from 'providers/ReduxStore/slices/collections/actions';
import { brunoConfigUpdateEvent, resetCollectionRunner, updateRunnerTagsDetails } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection, areItemsLoading } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCircleOff, IconCheck, IconX, IconRun, IconExternalLink } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';
import RunnerTags from './RunnerTags/index';
import RunConfigurationPanel from './RunConfigurationPanel';
import SaveScenarioModal from './SaveScenarioModal';
import ScenarioSuitePanel from './ScenarioSuitePanel';
import Button from 'ui/Button/index';
import toast from 'react-hot-toast';
import { uuid } from 'utils/common';
import { buildRunnerScenario, getRunnerScenarios, upsertRunnerScenario } from 'utils/runner/scenarios';
import { buildRunnerSuite, buildSuiteExecutionPlan, getRunnerSuites, upsertRunnerSuite } from 'utils/runner/suites';

const getDisplayName = (fullPath, pathname, name = '') => {
  let relativePath = path.relative(fullPath, pathname);
  const { dir = '' } = path.parse(relativePath);
  return path.join(dir, name);
};

const getTestStatus = (results) => {
  if (!results || !results.length) return 'pass';
  const failed = results.filter((result) => result.status === 'fail');
  return failed.length ? 'fail' : 'pass';
};

const allTestsPassed = (item) => {
  return item.status !== 'error'
    && item.testStatus === 'pass'
    && item.assertionStatus === 'pass'
    && item.preRequestTestStatus === 'pass'
    && item.postResponseTestStatus === 'pass';
};

const anyTestFailed = (item) => {
  return item.status === 'error'
    || item.testStatus === 'fail'
    || item.assertionStatus === 'fail'
    || item.preRequestTestStatus === 'fail'
    || item.postResponseTestStatus === 'fail';
};

// === Centralized filters definition ===
const FILTERS = {
  all: {
    labelKey: 'RUNNER.FILTERS.ALL',
    defaultLabel: 'All',
    predicate: () => true,
    resultFilter: (results) => results
  },
  passed: {
    labelKey: 'RUNNER.FILTERS.PASSED',
    defaultLabel: 'Passed',
    predicate: (item) => allTestsPassed(item),
    resultFilter: (results) => results?.filter((r) => r.status === 'pass')
  },
  failed: {
    labelKey: 'RUNNER.FILTERS.FAILED',
    defaultLabel: 'Failed',
    predicate: (item) => anyTestFailed(item),
    resultFilter: (results) => results?.filter((r) => ['fail', 'error'].includes(r.status))
  },
  skipped: {
    labelKey: 'RUNNER.FILTERS.SKIPPED',
    defaultLabel: 'Skipped',
    predicate: (item) => item.status === 'skipped',
    resultFilter: (results) => results
  }
};

// === Reusable filter button ===
const FilterButton = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`filter-button ${active ? 'active' : ''}`}
  >
    {label}
    <span className="filter-count">{count}</span>
  </button>
);

export default function RunnerResults({ collection }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState(null);
  const [delay, setDelay] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedRequestItems, setSelectedRequestItems] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [activeSuiteId, setActiveSuiteId] = useState('');
  const [selectedSuiteScenarioIds, setSelectedSuiteScenarioIds] = useState([]);
  const [showSaveScenarioModal, setShowSaveScenarioModal] = useState(false);
  const [showSaveSuiteModal, setShowSaveSuiteModal] = useState(false);
  const [localRunnerScenarios, setLocalRunnerScenarios] = useState(() => getRunnerScenarios(collection.brunoConfig));
  const [localRunnerSuites, setLocalRunnerSuites] = useState(() => getRunnerSuites(collection.brunoConfig));
  const isReRunningRef = useRef(false);
  // ref for the runner output body
  const runnerBodyRef = useRef();

  const collectionCopy = cloneDeep(collection);
  const runnerInfo = get(collection, 'runnerResult.info', {});
  const runnerScenarios = localRunnerScenarios;
  const activeScenario = runnerScenarios.find((scenario) => scenario.id === activeScenarioId) || null;
  const runnerSuites = localRunnerSuites;
  const activeSuite = runnerSuites.find((suite) => suite.id === activeSuiteId) || null;

  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  // have tags been added for the collection run
  const areTagsAdded = tags.include.length > 0 || tags.exclude.length > 0;

  const items = cloneDeep(get(collection, 'runnerResult.items', []))
    .map((item) => {
      const info = findItemInCollection(collectionCopy, item.uid);
      if (!info) {
        return null;
      }
      const newItem = {
        ...item,
        name: info.name,
        type: info.type,
        filename: info.filename,
        pathname: info.pathname,
        displayName: getDisplayName(collection.pathname, info.pathname, info.name),
        tags: [...(info.request?.tags || [])].sort()
      };
      if (newItem.status !== 'error' && newItem.status !== 'skipped' && newItem.status !== 'running') {
        newItem.testStatus = getTestStatus(newItem.testResults);
        newItem.assertionStatus = getTestStatus(newItem.assertionResults);
        newItem.preRequestTestStatus = getTestStatus(newItem.preRequestTestResults);
        newItem.postResponseTestStatus = getTestStatus(newItem.postResponseTestResults);
      }
      return newItem;
    })
    .filter(Boolean);

  const activeFilterConfig = FILTERS[activeFilter];
  const filteredItems = items.filter(activeFilterConfig.predicate);

  const filterTestResults = (results) => {
    if (!results || !Array.isArray(results)) return [];
    return activeFilterConfig.resultFilter(results);
  };

  const getCurrentRequestOrder = () => {
    const savedOrder = get(collection, 'runnerConfiguration.requestItemsOrder', []);
    return savedOrder?.length ? savedOrder : selectedRequestItems;
  };

  const buildCurrentScenario = ({ name, id = uuid() }) => {
    return buildRunnerScenario({
      id,
      name,
      selectedRequestItems,
      requestItemsOrder: getCurrentRequestOrder(),
      delay,
      tags
    });
  };

  const applyScenario = (scenario) => {
    setActiveScenarioId(scenario?.id || '');

    if (!scenario) {
      return;
    }

    const scenarioDelay = scenario.delay !== undefined ? scenario.delay : null;
    setDelay(scenarioDelay);
    setSelectedRequestItems(scenario.selectedRequestItems || []);
    dispatch(updateRunnerTagsDetails({
      collectionUid: collection.uid,
      tags: scenario.tags || { include: [], exclude: [] }
    }));
    dispatch(updateRunnerConfiguration(
      collection.uid,
      scenario.selectedRequestItems || [],
      scenario.requestItemsOrder || [],
      scenarioDelay
    ));
  };

  const persistScenarios = async (nextScenarios, successMessage) => {
    const previousBrunoConfig = collection.brunoConfig || {};
    const nextBrunoConfig = {
      ...previousBrunoConfig,
      runnerScenarios: nextScenarios,
      runnerScenarioSuites: runnerSuites
    };

    try {
      setLocalRunnerScenarios(nextScenarios);
      dispatch(brunoConfigUpdateEvent({ collectionUid: collection.uid, brunoConfig: nextBrunoConfig }));
      await dispatch(updateBrunoConfig(nextBrunoConfig, collection.uid));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      setLocalRunnerScenarios(getRunnerScenarios(collection.brunoConfig));
      dispatch(brunoConfigUpdateEvent({ collectionUid: collection.uid, brunoConfig: previousBrunoConfig }));
      toast.error(error?.message || t('RUNNER.TOAST.SAVE_SCENARIO_FAILED', { defaultValue: 'Failed to save scenario' }));
      throw error;
    }
  };

  const persistSuites = async (nextSuites, successMessage) => {
    const previousBrunoConfig = collection.brunoConfig || {};
    const nextBrunoConfig = {
      ...previousBrunoConfig,
      runnerScenarios,
      runnerScenarioSuites: nextSuites
    };

    try {
      setLocalRunnerSuites(nextSuites);
      dispatch(brunoConfigUpdateEvent({ collectionUid: collection.uid, brunoConfig: nextBrunoConfig }));
      await dispatch(updateBrunoConfig(nextBrunoConfig, collection.uid));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      setLocalRunnerSuites(getRunnerSuites(collection.brunoConfig));
      dispatch(brunoConfigUpdateEvent({ collectionUid: collection.uid, brunoConfig: previousBrunoConfig }));
      toast.error(error?.message || t('RUNNER.TOAST.SAVE_SUITE_FAILED', { defaultValue: 'Failed to save suite' }));
      throw error;
    }
  };

  const autoScrollRunnerBody = () => {
    if (runnerBodyRef?.current) {
      const element = runnerBodyRef.current;
      const scrollThreshold = 100; // pixels from bottom to consider "at bottom"
      const isNearBottom
        = element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold;

      // Only auto-scroll if user is already near the bottom
      if (isNearBottom) {
        // mimics the native terminal scroll style
        element.scrollTo(0, 100000);
      }
    }
  };

  useEffect(() => {
    if (!collection.runnerResult) {
      setSelectedItem(null);
    }
    autoScrollRunnerBody();
  }, [collection, setSelectedItem]);

  useEffect(() => {
    // Auto-scroll when items are added or updated during execution
    // Only scrolls if user is already at/near the bottom
    if (filteredItems.length > 0) {
      autoScrollRunnerBody();
    }
  }, [filteredItems]);

  useEffect(() => {
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    if (savedConfiguration) {
      if (savedConfiguration.delay !== undefined && delay === null) {
        setDelay(savedConfiguration.delay);
      }
    }
  }, [collection.runnerConfiguration, delay]);

  useEffect(() => {
    setLocalRunnerScenarios(getRunnerScenarios(collection.brunoConfig));
  }, [collection.brunoConfig]);

  useEffect(() => {
    setLocalRunnerSuites(getRunnerSuites(collection.brunoConfig));
  }, [collection.brunoConfig]);

  useEffect(() => {
    if (activeScenarioId && !activeScenario) {
      setActiveScenarioId('');
    }
  }, [activeScenarioId, activeScenario]);

  useEffect(() => {
    if (activeSuiteId && !activeSuite) {
      setActiveSuiteId('');
      setSelectedSuiteScenarioIds([]);
    }
  }, [activeSuiteId, activeSuite]);

  useEffect(() => {
    if (activeSuite) {
      setSelectedSuiteScenarioIds(activeSuite.scenarioIdsOrder || []);
    }
  }, [activeSuite]);

  useEffect(() => {
    const validScenarioIds = new Set(runnerScenarios.map(({ id }) => id));
    setSelectedSuiteScenarioIds((currentIds) => currentIds.filter((id) => validScenarioIds.has(id)));
  }, [runnerScenarios]);

  useEffect(() => {
    if (isReRunningRef.current
      && (items?.length > 0 || runnerInfo?.status === 'ended' || runnerInfo?.status === 'cancelled')) {
      isReRunningRef.current = false;
    }
  }, [items, runnerInfo?.status]);

  const ensureCollectionIsMounted = () => {
    if (collection.mountStatus === 'mounted') {
      return;
    }
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

  const runCollection = () => {
    const savedOrder = get(collection, 'runnerConfiguration.requestItemsOrder', selectedRequestItems);
    dispatch(updateRunnerConfiguration(collection.uid, selectedRequestItems, savedOrder, delay));
    dispatch(runCollectionFolder(collection.uid, null, true, Number(delay), tags, selectedRequestItems));
  };

  const buildCurrentSuite = ({ name, id = uuid() }) => {
    return buildRunnerSuite({
      id,
      name,
      scenarioIdsOrder: selectedSuiteScenarioIds
    });
  };

  const handleSuiteSelectionChange = (event) => {
    const suiteId = event.target.value;

    if (!suiteId) {
      setActiveSuiteId('');
      return;
    }

    const suite = runnerSuites.find(({ id }) => id === suiteId);
    if (!suite) {
      setActiveSuiteId('');
      return;
    }

    setActiveSuiteId(suite.id);
    setSelectedSuiteScenarioIds(suite.scenarioIdsOrder || []);
  };

  const handleToggleSuiteScenario = (scenarioId) => {
    setSelectedSuiteScenarioIds((currentIds) => {
      if (currentIds.includes(scenarioId)) {
        return currentIds.filter((id) => id !== scenarioId);
      }

      return [...currentIds, scenarioId];
    });
  };

  const handleMoveSuiteScenario = (scenarioId, direction) => {
    setSelectedSuiteScenarioIds((currentIds) => {
      const currentIndex = currentIds.indexOf(scenarioId);
      if (currentIndex === -1) {
        return currentIds;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentIds.length) {
        return currentIds;
      }

      const nextIds = [...currentIds];
      const [movedId] = nextIds.splice(currentIndex, 1);
      nextIds.splice(targetIndex, 0, movedId);
      return nextIds;
    });
  };

  const handleSaveSuite = async (name) => {
    const suite = buildCurrentSuite({ name });
    if (!suite) {
      toast.error(t('RUNNER.TOAST.SELECT_SCENARIO_BEFORE_SAVE_SUITE', {
        defaultValue: 'Select at least one scenario before saving a suite'
      }));
      return;
    }

    try {
      const nextSuites = upsertRunnerSuite(runnerSuites, suite);
      await persistSuites(nextSuites, t('RUNNER.TOAST.SUITE_SAVED', { defaultValue: 'Suite saved' }));
      setActiveSuiteId(suite.id);
      setShowSaveSuiteModal(false);
    } catch (error) {
      setLocalRunnerSuites(getRunnerSuites(collection.brunoConfig));
      dispatch(brunoConfigUpdateEvent({
        collectionUid: collection.uid,
        brunoConfig: collection.brunoConfig || {}
      }));
    }
  };

  const handleUpdateSuite = async () => {
    if (!activeSuite) {
      return;
    }

    const suite = buildCurrentSuite({ id: activeSuite.id, name: activeSuite.name });
    if (!suite) {
      toast.error(t('RUNNER.TOAST.SELECT_SCENARIO_BEFORE_UPDATE_SUITE', {
        defaultValue: 'Select at least one scenario before updating the suite'
      }));
      return;
    }

    try {
      const nextSuites = upsertRunnerSuite(runnerSuites, suite);
      await persistSuites(nextSuites, t('RUNNER.TOAST.SUITE_UPDATED', { defaultValue: 'Suite updated' }));
    } catch (error) {}
  };

  const handleDeleteSuite = async () => {
    if (!activeSuite) {
      return;
    }

    try {
      const nextSuites = runnerSuites.filter(({ id }) => id !== activeSuite.id);
      await persistSuites(nextSuites, t('RUNNER.TOAST.SUITE_DELETED', { defaultValue: 'Suite deleted' }));
      setActiveSuiteId('');
      setSelectedSuiteScenarioIds([]);
    } catch (error) {}
  };

  const runSuite = () => {
    const suite = buildCurrentSuite({
      id: activeSuite?.id || uuid(),
      name: activeSuite?.name || t('RUNNER.SUITE.AD_HOC', { defaultValue: 'Ad hoc suite' })
    });

    if (!suite || suite.scenarioIdsOrder.length === 0) {
      toast.error(t('RUNNER.TOAST.SELECT_SCENARIO_BEFORE_RUN_SUITE', {
        defaultValue: 'Select at least one scenario before running the suite'
      }));
      return;
    }

    const executionPlan = buildSuiteExecutionPlan({
      suite,
      scenarios: runnerScenarios
    });

    if (!executionPlan.length) {
      toast.error(t('RUNNER.TOAST.SUITE_HAS_NO_RUNNABLE_REQUESTS', {
        defaultValue: 'The selected suite does not contain runnable requests'
      }));
      return;
    }

    dispatch(
      runCollectionFolder(
        collection.uid,
        null,
        true,
        null,
        { include: [], exclude: [] },
        null,
        executionPlan,
        {
          runMode: 'suite',
          suiteId: suite.id,
          suiteName: suite.name,
          scenarioIdsOrder: suite.scenarioIdsOrder
        }
      )
    );
  };

  const handleScenarioSelectionChange = (event) => {
    const scenarioId = event.target.value;

    if (!scenarioId) {
      setActiveScenarioId('');
      return;
    }

    const scenario = runnerScenarios.find(({ id }) => id === scenarioId);
    applyScenario(scenario || null);
  };

  const handleSaveScenario = async (name) => {
    const scenario = buildCurrentScenario({ name });

    if (!scenario) {
      toast.error(t('RUNNER.TOAST.BUILD_SCENARIO_FAILED', {
        defaultValue: 'Failed to build scenario from the current runner configuration'
      }));
      return;
    }

    try {
      const nextScenarios = upsertRunnerScenario(runnerScenarios, scenario);
      await persistScenarios(nextScenarios, t('RUNNER.TOAST.SCENARIO_SAVED', { defaultValue: 'Scenario saved' }));
      setActiveScenarioId(scenario.id);
      setShowSaveScenarioModal(false);
    } catch (error) {}
  };

  const handleUpdateScenario = async () => {
    if (!activeScenario) {
      return;
    }

    const scenario = buildCurrentScenario({
      id: activeScenario.id,
      name: activeScenario.name
    });

    if (!scenario) {
      toast.error(t('RUNNER.TOAST.BUILD_SCENARIO_FAILED', {
        defaultValue: 'Failed to build scenario from the current runner configuration'
      }));
      return;
    }

    try {
      const nextScenarios = upsertRunnerScenario(runnerScenarios, scenario);
      await persistScenarios(nextScenarios, t('RUNNER.TOAST.SCENARIO_UPDATED', { defaultValue: 'Scenario updated' }));
    } catch (error) {}
  };

  const handleDeleteScenario = async () => {
    if (!activeScenario) {
      return;
    }

    try {
      const nextScenarios = runnerScenarios.filter(({ id }) => id !== activeScenario.id);
      const nextSuites = runnerSuites
        .map((suite) => ({
          ...suite,
          scenarioIdsOrder: suite.scenarioIdsOrder.filter((scenarioId) => scenarioId !== activeScenario.id)
        }))
        .filter((suite) => suite.scenarioIdsOrder.length > 0);

      const previousBrunoConfig = collection.brunoConfig || {};
      const nextBrunoConfig = {
        ...previousBrunoConfig,
        runnerScenarios: nextScenarios,
        runnerScenarioSuites: nextSuites
      };

      setLocalRunnerScenarios(nextScenarios);
      setLocalRunnerSuites(nextSuites);
      dispatch(brunoConfigUpdateEvent({ collectionUid: collection.uid, brunoConfig: nextBrunoConfig }));
      await dispatch(updateBrunoConfig(nextBrunoConfig, collection.uid));
      toast.success(t('RUNNER.TOAST.SCENARIO_DELETED', { defaultValue: 'Scenario deleted' }));
      setActiveScenarioId('');
      if (activeSuiteId) {
        const remainingSuite = nextSuites.find(({ id }) => id === activeSuiteId);
        if (!remainingSuite) {
          setActiveSuiteId('');
        }
      }
    } catch (error) {}
  };

  const runAgain = () => {
    ensureCollectionIsMounted();
    isReRunningRef.current = true;
    if (runnerInfo.runMode === 'suite') {
      const suiteToRun = runnerSuites.find(({ id }) => id === runnerInfo.suiteId)
        || (activeSuite && activeSuite.id === runnerInfo.suiteId ? activeSuite : null);

      if (!suiteToRun) {
        toast.error(t('RUNNER.TOAST.LAST_SUITE_MISSING', {
          defaultValue: 'The suite used in the last run no longer exists'
        }));
        isReRunningRef.current = false;
        return;
      }

      const executionPlan = buildSuiteExecutionPlan({
        suite: suiteToRun,
        scenarios: runnerScenarios
      });

      if (!executionPlan.length) {
        toast.error(t('RUNNER.TOAST.LAST_SUITE_HAS_NO_RUNNABLE_REQUESTS', {
          defaultValue: 'The suite used in the last run does not contain runnable requests'
        }));
        isReRunningRef.current = false;
        return;
      }

      dispatch(
        runCollectionFolder(
          collection.uid,
          null,
          true,
          null,
          { include: [], exclude: [] },
          null,
          executionPlan,
          {
            runMode: 'suite',
            suiteId: suiteToRun.id,
            suiteName: suiteToRun.name,
            scenarioIdsOrder: suiteToRun.scenarioIdsOrder
          }
        )
      );
      return;
    }

    // Get the saved configuration to determine what to run
    const savedConfiguration = get(collection, 'runnerConfiguration', null);
    const savedSelectedItems = savedConfiguration?.selectedRequestItems || [];
    const savedDelay = savedConfiguration?.delay !== undefined ? savedConfiguration.delay : delay;
    dispatch(
      runCollectionFolder(
        collection.uid,
        runnerInfo.folderUid,
        true,
        Number(savedDelay),
        tags,
        savedSelectedItems
      )
    );
  };

  const resetRunner = () => {
    isReRunningRef.current = false;
    dispatch(
      resetCollectionRunner({
        collectionUid: collection.uid
      })
    );
    setDelay(null);
    if (activeScenario) {
      setTimeout(() => applyScenario(activeScenario), 0);
    }
  };

  const cancelExecution = () => {
    dispatch(cancelRunnerExecution(runnerInfo.cancelTokenUid));
  };

  const totalRequestsInCollection = getTotalRequestCountInCollection(collectionCopy);
  const filterCounts = {
    all: items.length,
    passed: items.filter(allTestsPassed).length,
    failed: items.filter(anyTestFailed).length,
    skipped: items.filter((i) => i.status === 'skipped').length
  };

  let isCollectionLoading = areItemsLoading(collection);
  if ((!items || !items.length) && !isReRunningRef.current) {
    return (
      <StyledWrapper className="pl-4 overflow-hidden h-full">
        {showSaveScenarioModal ? (
          <SaveScenarioModal
            initialName={activeScenario?.name || ''}
            title={t('RUNNER.SAVE_MODAL.SCENARIO_TITLE', { defaultValue: 'Save Runner Scenario' })}
            confirmText={t('RUNNER.ACTIONS.SAVE', { defaultValue: 'Save' })}
            label={t('RUNNER.SAVE_MODAL.SCENARIO_NAME', { defaultValue: 'Scenario name' })}
            onClose={() => setShowSaveScenarioModal(false)}
            onSubmit={handleSaveScenario}
          />
        ) : null}
        {showSaveSuiteModal ? (
          <SaveScenarioModal
            initialName={activeSuite?.name || ''}
            title={t('RUNNER.SAVE_MODAL.SUITE_TITLE', { defaultValue: 'Save Scenario Suite' })}
            confirmText={t('RUNNER.ACTIONS.SAVE', { defaultValue: 'Save' })}
            label={t('RUNNER.SAVE_MODAL.SUITE_NAME', { defaultValue: 'Suite name' })}
            requiredErrorText={t('RUNNER.SAVE_MODAL.SUITE_NAME_REQUIRED', { defaultValue: 'Suite name is required' })}
            onClose={() => setShowSaveSuiteModal(false)}
            onSubmit={handleSaveSuite}
          />
        ) : null}
        <div className="flex overflow-hidden max-h-full h-full">
          <div className="w-1/2 pr-4">
            <div className="font-medium mt-6 title flex items-center">
              <IconRun size={20} strokeWidth={1.5} className="mr-2" />
              {t('SPECIAL_TABS.RUNNER', { defaultValue: 'Runner' })}
            </div>
            <div className="mt-2">
              {t('RUNNER.COLLECTION_SUMMARY_PREFIX', { defaultValue: 'You have' })}
              {' '}
              <span className="font-medium text-xs">{totalRequestsInCollection}</span>
              {' '}
              {t(totalRequestsInCollection === 1 ? 'RUNNER.REQUEST_SINGULAR' : 'RUNNER.REQUEST_PLURAL', {
                defaultValue: totalRequestsInCollection === 1 ? 'request' : 'requests'
              })}
              {' '}
              {t('RUNNER.COLLECTION_SUMMARY_SUFFIX', { defaultValue: 'in this collection.' })}
              {isCollectionLoading && (
                <span className="ml-2 text-muted">
                  ({t('RUNNER.LOADING_SHORT', { defaultValue: 'Loading...' })})
                </span>
              )}
            </div>
            {isCollectionLoading ? (
              <div className="my-1 danger">
                {t('RUNNER.COLLECTION_LOADING', { defaultValue: 'Requests in this collection are still loading.' })}
              </div>
            ) : null}

            <div className="runner-section-title mt-6">{t('RUNNER.SCENARIO.TITLE', { defaultValue: 'Scenario' })}</div>
            <div className="runner-section mt-2">
              <div className="scenario-controls">
                <select
                  className="textbox w-full"
                  value={activeScenarioId}
                  onChange={handleScenarioSelectionChange}
                  data-testid="runner-scenario-select"
                >
                  <option value="">{t('RUNNER.SCENARIO.AD_HOC', { defaultValue: 'Ad hoc configuration' })}</option>
                  {runnerScenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
                <div className="scenario-actions mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowSaveScenarioModal(true)}
                    data-testid="runner-scenario-save-as"
                  >
                    {t('RUNNER.ACTIONS.SAVE_AS', { defaultValue: 'Save As' })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleUpdateScenario}
                    disabled={!activeScenario}
                    data-testid="runner-scenario-update"
                  >
                    {t('RUNNER.ACTIONS.UPDATE', { defaultValue: 'Update' })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDeleteScenario}
                    disabled={!activeScenario}
                    data-testid="runner-scenario-delete"
                  >
                    {t('RUNNER.ACTIONS.DELETE', { defaultValue: 'Delete' })}
                  </Button>
                </div>
                <div className="scenario-hint mt-2">
                  {t('RUNNER.SCENARIO.HINT', {
                    defaultValue: 'Save a reusable scenario with selected requests, request order, delay, and tag filters.'
                  })}
                </div>
              </div>
            </div>

            <div className="runner-section-title mt-6">{t('RUNNER.SUITE.TITLE', { defaultValue: 'Scenario Suite' })}</div>
            <div className="runner-section mt-2">
              <div className="scenario-controls">
                <select
                  className="textbox w-full"
                  value={activeSuiteId}
                  onChange={handleSuiteSelectionChange}
                  data-testid="runner-suite-select"
                >
                  <option value="">{t('RUNNER.SUITE.AD_HOC', { defaultValue: 'Ad hoc suite' })}</option>
                  {runnerSuites.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.name}
                    </option>
                  ))}
                </select>
                <div className="scenario-actions mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowSaveSuiteModal(true)}
                    disabled={!runnerScenarios.length || !selectedSuiteScenarioIds.length}
                    data-testid="runner-suite-save-as"
                  >
                    {t('RUNNER.ACTIONS.SAVE_AS', { defaultValue: 'Save As' })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleUpdateSuite}
                    disabled={!activeSuite || !selectedSuiteScenarioIds.length}
                    data-testid="runner-suite-update"
                  >
                    {t('RUNNER.ACTIONS.UPDATE', { defaultValue: 'Update' })}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDeleteSuite}
                    disabled={!activeSuite}
                    data-testid="runner-suite-delete"
                  >
                    {t('RUNNER.ACTIONS.DELETE', { defaultValue: 'Delete' })}
                  </Button>
                  <Button
                    type="button"
                    onClick={runSuite}
                    disabled={!selectedSuiteScenarioIds.length}
                    data-testid="runner-suite-run"
                  >
                    {t('RUNNER.SUITE.RUN', { defaultValue: 'Run Suite' })}
                  </Button>
                </div>
                <div className="scenario-hint mt-2">
                  {t('RUNNER.SUITE.HINT', {
                    defaultValue: 'Combine multiple saved scenarios and execute them automatically in suite order.'
                  })}
                </div>
                <div className="suite-panel mt-3">
                  <ScenarioSuitePanel
                    scenarios={runnerScenarios}
                    selectedScenarioIds={selectedSuiteScenarioIds}
                    onToggleScenario={handleToggleSuiteScenario}
                    onMoveScenario={handleMoveSuiteScenario}
                  />
                </div>
              </div>
            </div>

            {/* Timings */}
            <div className="runner-section-title mt-6">{t('RUNNER.TIMINGS.TITLE', { defaultValue: 'Timings' })}</div>
            <div className="runner-section mt-2">
              <label>{t('RUNNER.TIMINGS.DELAY_BETWEEN_REQUESTS', { defaultValue: 'Delay between requests (ms)' })}</label>
              <input
                type="number"
                className="block textbox w-full mt-2"
                placeholder={t('RUNNER.TIMINGS.DELAY_PLACEHOLDER', { defaultValue: 'e.g. 5' })}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid="runner-delay-input"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="runner-section-title mt-6">{t('RUNNER.FILTERS.TITLE', { defaultValue: 'Filters' })}</div>
            <div className="runner-section mt-2 mb-6">
              {/* Tags for the collection run */}
              <RunnerTags collectionUid={collection.uid} />
            </div>

            <div className="flex flex-row gap-2">
              <Button
                type="submit"
                data-testid="runner-run-button"
                disabled={selectedRequestItems.length === 0 || isCollectionLoading}
                onClick={runCollection}
              >
                {t('RUNNER.RUN_SELECTED', {
                  defaultValue: 'Run {{count}} Requests',
                  count: selectedRequestItems.length
                })}
              </Button>

              <Button type="button" variant="ghost" onClick={resetRunner}>
                {t('RUNNER.ACTIONS.RESET', { defaultValue: 'Reset' })}
              </Button>
            </div>
          </div>

          <div className="run-config-panel w-1/2 border-l">
            <RunConfigurationPanel
              collection={collection}
              selectedItems={selectedRequestItems}
              setSelectedItems={setSelectedRequestItems}
              tags={tags}
              onResetConfiguration={activeScenario ? () => applyScenario(activeScenario) : null}
            />
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="px-4 pb-4 flex flex-grow flex-col relative overflow-auto">
      {/* Filter Bar and Actions */}
      <div className="flex items-center justify-between mb-4 pt-[14px] gap-4">
        <div className="filter-bar">
          <div className="filter-label">
            <span>{t('RUNNER.FILTERS.FILTER_BY', { defaultValue: 'Filter by:' })}</span>
          </div>
          <div className="filter-buttons">
            {Object.entries(FILTERS).map(([key, { labelKey, defaultLabel }]) => (
              <FilterButton
                key={key}
                label={t(labelKey, { defaultValue: defaultLabel })}
                count={filterCounts[key]}
                active={activeFilter === key}
                onClick={() => setActiveFilter(key)}
              />
            ))}
          </div>
        </div>

        {runnerInfo.status !== 'ended' && runnerInfo.cancelTokenUid ? (
          <div className="flex items-center flex-shrink-0">
            <Button
              type="button"
              onClick={cancelExecution}
              size="sm"
              variant="filled"
              color="danger"
            >
              {t('RUNNER.ACTIONS.CANCEL_EXECUTION', { defaultValue: 'Cancel Execution' })}
            </Button>
          </div>
        ) : runnerInfo.status === 'ended' ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              type="button"
              onClick={runAgain}
              size="sm"
              variant="filled"
              color="secondary"
            >
              {t('RUNNER.ACTIONS.RUN_AGAIN', { defaultValue: 'Run Again' })}
            </Button>
            <Button
              type="button"
              onClick={resetRunner}
              size="sm"
              variant="filled"
              color="secondary"
            >
              {t('RUNNER.ACTIONS.RESET', { defaultValue: 'Reset' })}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-4 h-[calc(100vh_-_10rem)] overflow-hidden">
        <div
          className="flex flex-col w-1/2"
        >
          {runnerInfo.runMode === 'suite' && runnerInfo.suiteName ? (
            <div className="pb-2 text-xs text-muted">
              {t('RUNNER.SUITE.LABEL', { defaultValue: 'Suite:' })} <span className="text-green">{runnerInfo.suiteName}</span>
            </div>
          ) : null}
          {areTagsAdded && (
            <div className="pb-2 text-xs flex flex-row gap-1">
              {t('RUNNER.TAGS.LABEL', { defaultValue: 'Tags:' })}
              <div className="flex flex-row items-center gap-x-2">
                <div className="text-green">
                  {tags.include.join(', ')}
                </div>
                <div className="text-muted">
                  {tags.exclude.join(', ')}
                </div>
              </div>
            </div>
          )}
          {runnerInfo?.statusText
            ? (
                <div className="pb-2 font-medium danger">
                  {runnerInfo?.statusText}
                </div>
              )
            : null}

          {/* Items list */}
          <div className="overflow-y-auto flex-1 " ref={runnerBodyRef}>
            {filteredItems.map((item) => {
              const itemKey = item.executionIndex !== undefined
                ? `${item.uid}-${item.executionIndex}`
                : item.uid;

              return (
                <div key={itemKey}>
                  <div className="item-path mt-2" data-testid="runner-result-item">
                    <div className="flex items-center">
                      <span>
                        {allTestsPassed(item)
                          ? <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                          : null}
                        {item.status === 'skipped'
                          ? <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                          : null}
                        {anyTestFailed(item)
                          ? <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                          : null}
                      </span>
                      <span
                        className={`mr-1 ml-2 ${item.status == 'skipped' ? 'skipped-request' : anyTestFailed(item) ? 'danger' : ''}`}
                      >
                        {item.displayName}
                      </span>
                      {item.status !== 'error' && item.status !== 'skipped' && item.status !== 'completed' ? (
                        <IconRefresh className="animate-spin ml-1" size={18} strokeWidth={1.5} />
                      ) : item.responseReceived?.status ? (
                        <span className="text-xs link cursor-pointer" onClick={() => setSelectedItem(item)}>
                          <span className="mr-1">{item.responseReceived?.status}</span>
                          -&nbsp;
                          <span>{item.responseReceived?.statusText}</span>
                        </span>
                      ) : (
                        <span className="danger text-xs cursor-pointer" onClick={() => setSelectedItem(item)}>
                          ({t('RUNNER.REQUEST_FAILED', { defaultValue: 'request failed' })})
                        </span>
                      )}
                    </div>
                    {areTagsAdded && item?.tags?.length > 0 && (
                      <div className="pl-7 text-xs text-muted">
                        {t('RUNNER.TAGS.LABEL', { defaultValue: 'Tags:' })} {item.tags.filter((t) => tags.include.includes(t)).join(', ')}
                      </div>
                    )}
                    {item.scenarioName ? (
                      <div className="pl-7 text-xs text-muted">
                        {t('RUNNER.SCENARIO.LABEL', { defaultValue: 'Scenario:' })} {item.scenarioName}
                      </div>
                    ) : null}
                    {item.status == 'error' ? <div className="error-message pl-8 pt-2 text-xs">{item.error}</div> : null}

                    <ul className="pl-8">
                      {item.preRequestTestResults
                        ? filterTestResults(item.preRequestTestResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {item.postResponseTestResults
                        ? filterTestResults(item.postResponseTestResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {item.testResults
                        ? filterTestResults(item.testResults).map((result) => (
                            <li key={result.uid}>
                              {result.status === 'pass' ? (
                                <span className="test-success flex items-center">
                                  <IconCheck size={18} strokeWidth={2} className="mr-2" />
                                  {result.description}
                                </span>
                              ) : (
                                <>
                                  <span className="test-failure flex items-center">
                                    <IconX size={18} strokeWidth={2} className="mr-2" />
                                    {result.description}
                                  </span>
                                  <span className="error-message pl-8 text-xs">{result.error}</span>
                                </>
                              )}
                            </li>
                          ))
                        : null}
                      {filterTestResults(item.assertionResults).map((result) => (
                        <li key={result.uid}>
                          {result.status === 'pass' ? (
                            <span className="test-success flex items-center">
                              <IconCheck size={18} strokeWidth={2} className="mr-2" />
                              {result.lhsExpr}: {result.rhsExpr}
                            </span>
                          ) : (
                            <>
                              <span className="test-failure flex items-center">
                                <IconX size={18} strokeWidth={2} className="mr-2" />
                                {result.lhsExpr}: {result.rhsExpr}
                              </span>
                              <span className="error-message pl-8 text-xs">{result.error}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedItem ? (
          <div className="flex flex-1 w-[50%] overflow-y-auto">
            <div className="flex flex-col w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 font-medium">
                <div className="flex items-center">
                  <span className="mr-2">{selectedItem.displayName}</span>
                  <span>
                    {allTestsPassed(selectedItem)
                      ? <IconCircleCheck className="test-success" size={20} strokeWidth={1.5} />
                      : null}
                    {anyTestFailed(selectedItem)
                      ? <IconCircleX className="test-failure" size={20} strokeWidth={1.5} />
                      : null}
                    {selectedItem.status === 'skipped'
                      ? <IconCircleOff className="skipped-request" size={20} strokeWidth={1.5} />
                      : null}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded hover-bg-surface transition-colors cursor-pointer flex items-center justify-center"
                  title={t('TITLEBAR.CLOSE', { defaultValue: 'Close' })}
                  aria-label={t('RUNNER.RESPONSE_PANE.CLOSE_VIEW', { defaultValue: 'Close response view' })}
                >
                  <IconX size={16} strokeWidth={1.5} />
                </button>
              </div>
              <ResponsePane item={selectedItem} collection={collection} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 w-[50%] overflow-y-auto">
            <div className="flex flex-col w-full h-full items-center justify-center text-center">
              <div className="mb-4 text-subtext0">
                <IconExternalLink size={64} strokeWidth={1.5} />
              </div>
              <p className="text-subtext1">
                {t('RUNNER.RESPONSE_PANE.CLICK_STATUS_TO_VIEW', {
                  defaultValue: 'Click on the status code to view the response'
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
}
