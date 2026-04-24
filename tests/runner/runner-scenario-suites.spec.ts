import path from 'path';
import fs from 'fs/promises';
import { test, expect } from '../../playwright';
import type { Page } from '@playwright/test';
import {
  buildRunnerCompatLocators,
  deleteRunnerScenario,
  deleteRunnerSuite,
  expectRunnerConfigSelection,
  expectRunnerSuiteScenarioSelectionCount,
  expectToastMessage,
  moveRunnerSuiteScenario,
  openRunnerTab,
  saveRunnerScenario,
  saveRunnerSuite,
  selectRunnerRequests,
  selectRunnerScenario,
  selectRunnerSuite,
  selectRunnerSuiteScenarios,
  setSandboxMode,
  toggleRunnerSuiteScenario,
  updateRunnerScenario,
  updateRunnerSuite,
  waitForRunnerRequestsInitialized
} from '../utils/page';

const COLLECTION_NAME = 'bruno-testbench';
const RUNNER_COLLECTION_CONFIG_PATH = path.join(process.cwd(), 'packages', 'bruno-tests', 'collection', 'bruno.json');
const RUNNER_INIT_USER_DATA_PATH = path.join(__dirname, 'init-user-data', 'preferences.json');

const createRunnerEntityNames = () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    scenarioA: `Runner Scenario A ${suffix}`,
    scenarioB: `Runner Scenario B ${suffix}`,
    suite: `Runner Scenario Suite ${suffix}`,
    suiteCopy: `Runner Scenario Suite Copy ${suffix}`
  };
};

const waitForNextBrunoConfigUpdate = async (page: Page) => {
  await page.evaluate(() => {
    window.__codexRunnerBrunoConfigUpdatePromise = new Promise((resolve) => {
      const removeListener = window.ipcRenderer.on('main:bruno-config-update', (payload) => {
        removeListener?.();
        resolve(payload);
      });
    });
  });
};

const patchRunnerCollectionConfig = async (mutator: (config: any) => any) => {
  const raw = await fs.readFile(RUNNER_COLLECTION_CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  const nextConfig = mutator(config);
  await fs.writeFile(RUNNER_COLLECTION_CONFIG_PATH, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
};

const waitForPatchedBrunoConfig = async (page: Page, mutator: (config: any) => any) => {
  await waitForNextBrunoConfigUpdate(page);
  await patchRunnerCollectionConfig(mutator);
  await page.evaluate(() => window.__codexRunnerBrunoConfigUpdatePromise);
};

const createRunnerInitUserData = async (
  createTmpDir: (tag?: string) => Promise<string>,
  preferencesMutator: (preferences: any) => any = (preferences) => preferences
) => {
  const initUserDataPath = await createTmpDir('runner-init-user-data');
  const rawPreferences = await fs.readFile(RUNNER_INIT_USER_DATA_PATH, 'utf8');
  const preferences = JSON.parse(rawPreferences);
  const nextPreferences = preferencesMutator(preferences);

  await fs.writeFile(path.join(initUserDataPath, 'preferences.json'), `${JSON.stringify(nextPreferences, null, 2)}\n`, 'utf8');

  return initUserDataPath;
};

test.describe('Runner Scenario Suites', () => {
  test.describe.configure({ timeout: 3 * 60 * 1000 });

  test('should save scenarios, compose a suite, reorder it, and run it again', async ({ pageWithUserData: page }) => {
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Save two reusable runner scenarios', async () => {
      await selectRunnerRequests(page, ['echo json', 'echo headers']);
      await saveRunnerScenario(page, names.scenarioA);

      await selectRunnerRequests(page, ['echo headers', 'echo plaintext']);
      await saveRunnerScenario(page, names.scenarioB);

      await expect(locators.scenarioSelect()).toContainText(names.scenarioA);
      await expect(locators.scenarioSelect()).toContainText(names.scenarioB);
    });

    await test.step('Compose and save a scenario suite', async () => {
      await selectRunnerSuiteScenarios(page, [names.scenarioA, names.scenarioB]);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await moveRunnerSuiteScenario(page, names.scenarioB, 'up');
      await saveRunnerSuite(page, names.suite);

      await expect(locators.suiteSelect()).toContainText(names.suite);
    });

    await test.step('Run the saved suite and verify grouped results', async () => {
      await selectRunnerSuite(page, names.suite);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.suiteResultLabel()).toContainText(`Suite: ${names.suite}`);
      await expect(locators.resultItems()).toHaveCount(4);
      await expect(locators.resultItem('echo headers')).toHaveCount(2);
      await expect(locators.resultItems().nth(0)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(1)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(2)).toContainText(`Scenario: ${names.scenarioA}`);
      await expect(locators.resultItems().nth(3)).toContainText(`Scenario: ${names.scenarioA}`);
    });

    await test.step('Run the suite again from the results view', async () => {
      await locators.runAgainButton().click();
      await expect(locators.runAgainButton()).toBeHidden({ timeout: 10000 });
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.suiteResultLabel()).toContainText(`Suite: ${names.suite}`);
      await expect(locators.resultItems()).toHaveCount(4);
      await expect(locators.resultItem('echo headers')).toHaveCount(2);
    });
  });

  test('should render the runner scenario suite workflow in Chinese when the language preference is zh-CN', async ({ createTmpDir, restartApp }) => {
    const initUserDataPath = await createRunnerInitUserData(createTmpDir, (preferences) => ({
      ...preferences,
      preferences: {
        ...(preferences.preferences || {}),
        general: {
          ...(preferences.preferences?.general || {}),
          language: 'zh-CN'
        }
      }
    }));
    const app = await restartApp({ initUserDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Verify runner configuration labels are displayed in Chinese', async () => {
      await expect(page.locator('.runner-section-title').filter({ hasText: /^场景$/ })).toBeVisible();
      await expect(page.locator('.runner-section-title').filter({ hasText: /^场景套件$/ })).toBeVisible();
      await expect(page.locator('.runner-section-title').filter({ hasText: /^时间设置$/ })).toBeVisible();
      await expect(page.locator('.runner-section-title').filter({ hasText: /^过滤条件$/ })).toBeVisible();
      await expect(locators.selectAllButton()).toContainText('取消全选');
      await expect(locators.suiteRunButton()).toContainText('运行套件');
      await expect(locators.runCollectionButton()).toContainText('运行');
    });

    await test.step('Save a scenario and suite and verify Chinese modal and toast copy', async () => {
      await selectRunnerRequests(page, ['echo json', 'echo headers']);

      await locators.scenarioSaveAsButton().click();
      await expect(page.locator('.bruno-modal-header-title').filter({ hasText: '保存运行器场景' })).toBeVisible();
      await locators.saveModalNameInput().fill(names.scenarioA);
      await locators.saveModalConfirmButton().click();
      await expectToastMessage(page, /场景已保存/);

      await selectRunnerSuiteScenarios(page, [names.scenarioA]);
      await locators.suiteSaveAsButton().click();
      await expect(page.locator('.bruno-modal-header-title').filter({ hasText: '保存场景套件' })).toBeVisible();
      await locators.saveModalNameInput().fill(names.suite);
      await locators.saveModalConfirmButton().click();
      await expectToastMessage(page, /套件已保存/);
    });

    await test.step('Run the suite and verify Chinese labels in the results view', async () => {
      await selectRunnerSuite(page, names.suite);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.runAgainButton()).toContainText('再次运行');
      await expect(locators.resetButton()).toContainText('重置');
      await expect(locators.suiteResultLabel()).toContainText(`套件： ${names.suite}`);
      await expect(locators.resultItems()).toHaveCount(2);
      await expect(locators.resultItems().nth(0)).toContainText(`场景： ${names.scenarioA}`);
      await expect(locators.resultItems().nth(1)).toContainText(`场景： ${names.scenarioA}`);
    });
  });

  test('should trim scenario and suite names in the save modal and block blank submissions', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Validate scenario save modal blocks blank names and trims saved names', async () => {
      await selectRunnerRequests(page, ['echo json']);

      await locators.scenarioSaveAsButton().click();
      await expect(locators.saveModal()).toBeVisible();

      await locators.saveModalNameInput().fill('   ');
      await expect(locators.saveModalConfirmButton()).toBeDisabled();

      await locators.saveModalNameInput().fill(`  ${names.scenarioA}  `);
      await expect(locators.saveModalConfirmButton()).toBeEnabled();
      await locators.saveModalConfirmButton().click();

      await expect(locators.saveModal()).toBeHidden({ timeout: 10000 });
      await expectToastMessage(page, /Scenario saved/);
      await expect(locators.scenarioSelect()).toHaveValue(/.+/);

      const selectedScenarioLabel = await locators.scenarioSelect().evaluate((element: HTMLSelectElement) =>
        element.selectedOptions[0]?.textContent?.trim() || ''
      );

      expect(selectedScenarioLabel).toBe(names.scenarioA);
    });

    await test.step('Validate suite save modal blocks blank names and trims saved names', async () => {
      await selectRunnerSuiteScenarios(page, [names.scenarioA]);

      await locators.suiteSaveAsButton().click();
      await expect(locators.saveModal()).toBeVisible();

      await locators.saveModalNameInput().fill('   ');
      await expect(locators.saveModalConfirmButton()).toBeDisabled();

      await locators.saveModalNameInput().fill(`  ${names.suite}  `);
      await expect(locators.saveModalConfirmButton()).toBeEnabled();
      await locators.saveModalConfirmButton().click();

      await expect(locators.saveModal()).toBeHidden({ timeout: 10000 });
      await expectToastMessage(page, /Suite saved/);
      await expect(locators.suiteSelect()).toHaveValue(/.+/);

      const selectedSuiteLabel = await locators.suiteSelect().evaluate((element: HTMLSelectElement) =>
        element.selectedOptions[0]?.textContent?.trim() || ''
      );

      expect(selectedSuiteLabel).toBe(names.suite);
    });
  });

  test('should update and delete scenarios and suites through their full lifecycle', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Save reusable scenarios and an initial suite', async () => {
      await selectRunnerRequests(page, ['echo json', 'echo headers']);
      await saveRunnerScenario(page, names.scenarioA);

      await selectRunnerRequests(page, ['echo headers', 'echo plaintext']);
      await saveRunnerScenario(page, names.scenarioB);

      await selectRunnerSuiteScenarios(page, [names.scenarioA, names.scenarioB]);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await moveRunnerSuiteScenario(page, names.scenarioB, 'up');
      await saveRunnerSuite(page, names.suite);

      await expect(locators.scenarioSelect()).toContainText(names.scenarioA);
      await expect(locators.scenarioSelect()).toContainText(names.scenarioB);
      await expect(locators.suiteSelect()).toContainText(names.suite);
    });

    await test.step('Update scenario A and verify the saved configuration reloads correctly', async () => {
      await selectRunnerScenario(page, names.scenarioA);
      await expectRunnerConfigSelection(page, 2);

      await selectRunnerRequests(page, ['echo json']);
      await updateRunnerScenario(page);

      await selectRunnerScenario(page, names.scenarioB);
      await expectRunnerConfigSelection(page, 2);

      await selectRunnerScenario(page, names.scenarioA);
      await expectRunnerConfigSelection(page, 1);
    });

    await test.step('Run the original suite and verify it uses the updated scenario definition', async () => {
      await selectRunnerSuite(page, names.suite);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.suiteResultLabel()).toContainText(`Suite: ${names.suite}`);
      await expect(locators.resultItems()).toHaveCount(3);
      await expect(locators.resultItems().nth(0)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(1)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(2)).toContainText(`Scenario: ${names.scenarioA}`);
    });

    await test.step('Update the suite order and confirm the execution order changes', async () => {
      await locators.resetButton().click();
      await expect(locators.configPanel()).toBeVisible({ timeout: 10000 });

      await selectRunnerSuite(page, names.suite);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await moveRunnerSuiteScenario(page, names.scenarioA, 'up');
      await updateRunnerSuite(page);

      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.resultItems()).toHaveCount(3);
      await expect(locators.resultItems().nth(0)).toContainText(`Scenario: ${names.scenarioA}`);
      await expect(locators.resultItems().nth(1)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(2)).toContainText(`Scenario: ${names.scenarioB}`);
    });

    await test.step('Delete a suite directly and verify selection resets to ad hoc', async () => {
      await locators.resetButton().click();
      await expect(locators.configPanel()).toBeVisible({ timeout: 10000 });

      await selectRunnerSuite(page, names.suite);
      await saveRunnerSuite(page, names.suiteCopy);
      await expect(locators.suiteSelect()).toContainText(names.suiteCopy);

      await deleteRunnerSuite(page);
      await expect(locators.suiteSelect()).not.toContainText(names.suiteCopy);
    });

    await test.step('Delete scenario B and verify the suite keeps only scenario A', async () => {
      await selectRunnerSuite(page, names.suite);
      await selectRunnerScenario(page, names.scenarioB);
      await deleteRunnerScenario(page);

      await expect(locators.scenarioSelect()).not.toContainText(names.scenarioB);
      await expect(locators.suiteScenarioItem(names.scenarioB)).toHaveCount(0);
      await expect(locators.suiteSelect()).toContainText(names.suite);

      await selectRunnerSuite(page, names.suite);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.resultItems()).toHaveCount(1);
      await expect(locators.resultItems().nth(0)).toContainText(`Scenario: ${names.scenarioA}`);
    });

    await test.step('Delete the last scenario and verify the linked suite is removed automatically', async () => {
      await locators.resetButton().click();
      await expect(locators.configPanel()).toBeVisible({ timeout: 10000 });

      await selectRunnerScenario(page, names.scenarioA);
      await deleteRunnerScenario(page);

      await expect(locators.scenarioSelect()).not.toContainText(names.scenarioA);
      await expect(locators.suiteScenarioItem(names.scenarioA)).toHaveCount(0);
      await expect(locators.suiteSelect()).not.toContainText(names.suite);
      await expect(locators.suiteRunButton()).toBeDisabled();
    });
  });

  test('should allow saving empty scenarios but refuse to run suites without runnable requests', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Save an empty scenario with no selected requests', async () => {
      await selectRunnerRequests(page, []);
      await saveRunnerScenario(page, names.scenarioA);

      await expect(locators.scenarioSelect()).toContainText(names.scenarioA);
      await expectRunnerConfigSelection(page, 0);
    });

    await test.step('Select the empty scenario into an ad hoc suite and verify running is rejected', async () => {
      await selectRunnerSuiteScenarios(page, [names.scenarioA]);
      await expectRunnerSuiteScenarioSelectionCount(page, 1);
      await expect(locators.suiteRunButton()).toBeEnabled();

      await locators.suiteRunButton().click();
      await expectToastMessage(page, /The selected suite does not contain runnable requests/);

      await expect(locators.configPanel()).toBeVisible();
      await expect(locators.runAgainButton()).toHaveCount(0);
    });
  });

  test('should run an ad hoc suite with duplicate requests across scenarios and disable suite actions when cleared', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and Prod environment', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);
    });

    await test.step('Save two reusable scenarios that share the same request', async () => {
      await selectRunnerRequests(page, ['echo json']);
      await saveRunnerScenario(page, names.scenarioA);

      await selectRunnerRequests(page, ['echo json', 'echo plaintext']);
      await saveRunnerScenario(page, names.scenarioB);

      await expect(locators.scenarioSelect()).toContainText(names.scenarioA);
      await expect(locators.scenarioSelect()).toContainText(names.scenarioB);
      await expect(locators.suiteSelect()).toHaveValue('');
      await expect(locators.suiteSaveAsButton()).toBeDisabled();
      await expect(locators.suiteUpdateButton()).toBeDisabled();
      await expect(locators.suiteDeleteButton()).toBeDisabled();
      await expect(locators.suiteRunButton()).toBeDisabled();
    });

    await test.step('Compose an ad hoc suite without saving it and verify action states', async () => {
      await selectRunnerSuiteScenarios(page, [names.scenarioA, names.scenarioB]);
      await expectRunnerSuiteScenarioSelectionCount(page, 2);
      await moveRunnerSuiteScenario(page, names.scenarioB, 'up');

      await expect(locators.suiteSelect()).toHaveValue('');
      await expect(locators.suiteSaveAsButton()).toBeEnabled();
      await expect(locators.suiteUpdateButton()).toBeDisabled();
      await expect(locators.suiteDeleteButton()).toBeDisabled();
      await expect(locators.suiteRunButton()).toBeEnabled();
    });

    await test.step('Run the ad hoc suite and verify duplicated requests are executed per scenario', async () => {
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });

      await expect(locators.suiteResultLabel()).toContainText(/(Ad hoc suite|临时套件)/);
      await expect(locators.resultItems()).toHaveCount(3);
      await expect(locators.resultItem('echo json')).toHaveCount(2);
      await expect(locators.resultItems().nth(0)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(1)).toContainText(`Scenario: ${names.scenarioB}`);
      await expect(locators.resultItems().nth(2)).toContainText(`Scenario: ${names.scenarioA}`);
    });

    await test.step('Clear the ad hoc suite and verify suite actions return to the disabled state', async () => {
      await locators.resetButton().click();
      await expect(locators.configPanel()).toBeVisible({ timeout: 10000 });

      await toggleRunnerSuiteScenario(page, names.scenarioB);
      await toggleRunnerSuiteScenario(page, names.scenarioA);
      await expectRunnerSuiteScenarioSelectionCount(page, 0);

      await expect(locators.suiteSelect()).toHaveValue('');
      await expect(locators.suiteSaveAsButton()).toBeDisabled();
      await expect(locators.suiteUpdateButton()).toBeDisabled();
      await expect(locators.suiteDeleteButton()).toBeDisabled();
      await expect(locators.suiteRunButton()).toBeDisabled();
    });
  });

  test('should show an error when rerunning after the last suite has been deleted', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and save a runnable suite', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);

      await selectRunnerRequests(page, ['echo json']);
      await saveRunnerScenario(page, names.scenarioA);

      await selectRunnerSuiteScenarios(page, [names.scenarioA]);
      await expectRunnerSuiteScenarioSelectionCount(page, 1);
      await saveRunnerSuite(page, names.suite);
    });

    await test.step('Run the suite once so Run Again targets the saved suite', async () => {
      await selectRunnerSuite(page, names.suite);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });
      await expect(locators.suiteResultLabel()).toContainText(`Suite: ${names.suite}`);
      await expect(locators.resultItems()).toHaveCount(1);
    });

    await test.step('Delete the suite and verify Run Again reports the missing suite', async () => {
      await waitForPatchedBrunoConfig(page, (config) => ({
        ...config,
        runnerScenarioSuites: (config.runnerScenarioSuites || []).filter((suite) => suite.name !== names.suite)
      }));

      await locators.runAgainButton().click();
      await expectToastMessage(page, /(The suite used in the last run no longer exists|上一次运行使用的套件已不存在)/);
      await expect(locators.runAgainButton()).toBeVisible();
      await expect(locators.resultItems()).toHaveCount(1);
    });
  });

  test('should show an error when rerunning after the last suite loses all runnable requests', async ({ restartApp }) => {
    const app = await restartApp();
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    const locators = buildRunnerCompatLocators(page);
    const names = createRunnerEntityNames();

    await test.step('Prepare runner with developer sandbox and save a runnable suite', async () => {
      await setSandboxMode(page, COLLECTION_NAME, 'developer');
      await page.getByTestId('environment-selector-trigger').click();
      await page.locator('.dropdown-item').getByText('Prod', { exact: true }).click();
      await openRunnerTab(page, COLLECTION_NAME);
      await waitForRunnerRequestsInitialized(page);

      await selectRunnerRequests(page, ['echo json']);
      await saveRunnerScenario(page, names.scenarioA);

      await selectRunnerSuiteScenarios(page, [names.scenarioA]);
      await expectRunnerSuiteScenarioSelectionCount(page, 1);
      await saveRunnerSuite(page, names.suite);
    });

    await test.step('Run the suite once so Run Again targets the saved suite', async () => {
      await selectRunnerSuite(page, names.suite);
      await locators.suiteRunButton().click();
      await expect(locators.runAgainButton()).toBeVisible({ timeout: 2 * 60 * 1000 });
      await expect(locators.resultItems()).toHaveCount(1);
    });

    await test.step('Update the only scenario to contain no requests', async () => {
      await waitForPatchedBrunoConfig(page, (config) => ({
        ...config,
        runnerScenarios: (config.runnerScenarios || []).map((scenario) => {
          if (scenario.name !== names.scenarioA) {
            return scenario;
          }

          return {
            ...scenario,
            selectedRequestItems: [],
            requestItemsOrder: []
          };
        })
      }));
    });

    await test.step('Verify Run Again reports the suite no longer has runnable requests', async () => {
      await locators.runAgainButton().click();
      await expectToastMessage(page, /(The suite used in the last run does not contain runnable requests|上一次运行使用的套件已不包含可运行的请求)/);
      await expect(locators.runAgainButton()).toBeVisible();
      await expect(locators.resultItems()).toHaveCount(1);
    });
  });
});
