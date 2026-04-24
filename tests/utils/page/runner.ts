import { Locator, Page, expect, test } from '../../../playwright';
import { buildSandboxLocators } from './locators';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const byExactText = (page: Page, selector: string, value: string) =>
  page.locator(selector).filter({ hasText: new RegExp(`^${escapeRegExp(value)}$`) });

const RUN_TEXT = /^(Run|\u8fd0\u884c)$/;
const RECURSIVE_RUN_TEXT = /^(Recursive Run|\u9012\u5f52\u8fd0\u884c)$/;
const RESET_TEXT = /^(Reset|\u91cd\u7f6e)$/;
const RUN_AGAIN_TEXT = /^(Run Again|\u518d\u6b21\u8fd0\u884c)$/;
const SAVE_TEXT = /^(Save|\u4fdd\u5b58)$/;
const ALL_TEXT = /^(All|\u5168\u90e8)$/;
const PASSED_TEXT = /^(Passed|\u901a\u8fc7)$/;
const FAILED_TEXT = /^(Failed|\u5931\u8d25)$/;
const SKIPPED_TEXT = /^(Skipped|\u5df2\u8df3\u8fc7)$/;
const SELECT_ALL_TEXT = /(Select All|\u5168\u9009)/;
const SUITE_LABEL_TEXT = /^(Suite:|\u5957\u4ef6[:\uff1a])/;
const COUNTER_TEXT = /(\d+)\s+of\s+(\d+)\s+selected|(?:\u5df2\u9009\u62e9)\s*(\d+)\s*\/\s*(\d+)/;
const SCENARIO_UPDATED_TEXT = /(Scenario updated|\u573a\u666f\u5df2\u66f4\u65b0)/;
const SCENARIO_DELETED_TEXT = /(Scenario deleted|\u573a\u666f\u5df2\u5220\u9664)/;
const SCENARIO_SAVED_TEXT = /(Scenario saved|\u573a\u666f\u5df2\u4fdd\u5b58)/;
const SUITE_UPDATED_TEXT = /(Suite updated|\u5957\u4ef6\u5df2\u66f4\u65b0)/;
const SUITE_DELETED_TEXT = /(Suite deleted|\u5957\u4ef6\u5df2\u5220\u9664)/;
const SUITE_SAVED_TEXT = /(Suite saved|\u5957\u4ef6\u5df2\u4fdd\u5b58)/;

const parseRunnerConfigCounter = (text: string) => {
  const normalizedText = text.trim();
  const match = normalizedText.match(/(\d+)\s+of\s+(\d+)\s+selected/) || normalizedText.match(/已选择\s*(\d+)\s*\/\s*(\d+)/);
  expect(match).toBeTruthy();

  return {
    selected: parseInt(match![1]),
    total: parseInt(match![2])
  };
};

const waitForToast = async (page: Page, matcher: RegExp) => {
  await expect(page.getByText(matcher).last()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(150);
};

export const expectToastMessage = async (page: Page, matcher: RegExp) => {
  await expect(page.getByText(matcher).last()).toBeVisible({ timeout: 10000 });
};

/**
 * Builds locators for the runner results view
 * @param page - The Playwright page object
 * @returns Object with locators for runner elements
 */
export const buildRunnerLocators = (page: Page) => ({
  allButton: () => page.locator('button').filter({ hasText: /^(All|全部)/ }),
  passedButton: () => page.locator('button').filter({ hasText: /^(Passed|通过)/ }),
  failedButton: () => page.locator('button').filter({ hasText: /^(Failed|失败)/ }),
  skippedButton: () => page.locator('button').filter({ hasText: /^(Skipped|已跳过)/ }),
  resetButton: () => page.getByRole('button', { name: /^(Reset|重置)$/ }),
  runCollectionButton: () => page.getByTestId('runner-run-button'),
  runAgainButton: () => page.getByRole('button', { name: /^(Run Again|再次运行)$/ }),
  configPanel: () => page.getByTestId('runner-config-panel'),
  configCounter: () => page.getByTestId('runner-config-counter'),
  selectAllButton: () => page.getByTestId('runner-select-all'),
  configResetButton: () => page.getByTestId('runner-config-reset'),
  requestItems: () => page.getByTestId('runner-request-item'),
  requestItem: (name: string) =>
    page.getByTestId('runner-request-item').filter({
      has: byExactText(page, '.request-name > span', name)
    }).first(),
  delayInput: () => page.getByTestId('runner-delay-input'),
  scenarioSelect: () => page.getByTestId('runner-scenario-select'),
  scenarioSaveAsButton: () => page.getByTestId('runner-scenario-save-as'),
  scenarioUpdateButton: () => page.getByTestId('runner-scenario-update'),
  scenarioDeleteButton: () => page.getByTestId('runner-scenario-delete'),
  suiteSelect: () => page.getByTestId('runner-suite-select'),
  suiteSaveAsButton: () => page.getByTestId('runner-suite-save-as'),
  suiteUpdateButton: () => page.getByTestId('runner-suite-update'),
  suiteDeleteButton: () => page.getByTestId('runner-suite-delete'),
  suiteRunButton: () => page.getByTestId('runner-suite-run'),
  suiteScenarioItems: () => page.getByTestId('runner-suite-scenario-item'),
  selectedSuiteScenarioItems: () => page.locator('[data-testid="runner-suite-scenario-item"].is-selected'),
  suiteScenarioItem: (name: string) =>
    page.getByTestId('runner-suite-scenario-item').filter({
      has: byExactText(page, '.suite-panel-name', name)
    }).first(),
  suiteScenarioMoveUpButton: (name: string) =>
    page.getByTestId('runner-suite-scenario-item').filter({
      has: byExactText(page, '.suite-panel-name', name)
    }).first().getByTestId('runner-suite-move-up'),
  suiteScenarioMoveDownButton: (name: string) =>
    page.getByTestId('runner-suite-scenario-item').filter({
      has: byExactText(page, '.suite-panel-name', name)
    }).first().getByTestId('runner-suite-move-down'),
  saveModal: () => page.getByTestId('save-scenario-modal'),
  saveModalNameInput: () => page.locator('#scenario-name'),
  saveModalConfirmButton: () => page.getByTestId('save-scenario-modal').getByRole('button', { name: /^Save$/ }),
  resultItems: () => page.getByTestId('runner-result-item'),
  resultItem: (text: string) => page.getByTestId('runner-result-item').filter({ hasText: text }),
  suiteResultLabel: () => page.locator('div').filter({ hasText: /^(Suite:|套件：)/ }).first()
});

const parseRunnerConfigCounterCompat = (text: string) => {
  const normalizedText = text.trim();
  const match = normalizedText.match(COUNTER_TEXT);
  expect(match).toBeTruthy();

  return {
    selected: parseInt(match![1] || match![3]),
    total: parseInt(match![2] || match![4])
  };
};

export const buildRunnerCompatLocators = (page: Page) => ({
  ...buildRunnerLocators(page),
  allButton: () => page.locator('button').filter({ hasText: ALL_TEXT }),
  passedButton: () => page.locator('button').filter({ hasText: PASSED_TEXT }),
  failedButton: () => page.locator('button').filter({ hasText: FAILED_TEXT }),
  skippedButton: () => page.locator('button').filter({ hasText: SKIPPED_TEXT }),
  resetButton: () => page.getByRole('button', { name: RESET_TEXT }),
  runAgainButton: () => page.getByRole('button', { name: RUN_AGAIN_TEXT }),
  saveModalConfirmButton: () => page.getByTestId('save-scenario-modal').getByRole('button', { name: SAVE_TEXT }),
  suiteResultLabel: () => page.locator('div').filter({ hasText: SUITE_LABEL_TEXT }).first()
});

export const waitForRunnerRequestsInitialized = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  await expect(async () => {
    const text = await locators.configCounter().innerText();
    const { total } = parseRunnerConfigCounterCompat(text);
    expect(total).toBeGreaterThan(0);
    expect(await locators.requestItems().count()).toBeGreaterThan(0);
  }).toPass({ timeout: 30000 });
};

export const expectRunnerConfigSelection = async (page: Page, selectedCount: number) => {
  const locators = buildRunnerCompatLocators(page);

  await expect(async () => {
    const text = await locators.configCounter().innerText();
    const { selected } = parseRunnerConfigCounterCompat(text);
    expect(selected).toBe(selectedCount);
  }).toPass({ timeout: 10000 });
};

export const expectRunnerRequestSelection = async (
  page: Page,
  options: {
    selected: string[];
    unselected?: string[];
    selectedCount?: number;
  }
) => {
  await test.step(`Validate runner request selection: ${options.selected.join(', ')}`, async () => {
    if (options.selectedCount !== undefined) {
      await expectRunnerConfigSelection(page, options.selectedCount);
    }

    const selectedNames = await page.locator('[data-testid="runner-request-item"]').evaluateAll((items) => items
      .filter((item) =>
        item.classList.contains('is-selected')
        || Boolean(item.querySelector('.checkbox-icon'))
      )
      .map((item) => item.querySelector('.request-name > span')?.textContent?.trim())
      .filter(Boolean)
    );

    for (const requestName of options.selected) {
      expect(selectedNames).toContain(requestName);
    }

    for (const requestName of options.unselected || []) {
      expect(selectedNames).not.toContain(requestName);
    }
  });
};

export const selectRunnerRequests = async (page: Page, requestNames: string[]) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Select runner requests: ${requestNames.join(', ')}`, async () => {
    await waitForRunnerRequestsInitialized(page);
    const currentSelection = parseRunnerConfigCounterCompat(await locators.configCounter().innerText());
    if (currentSelection.selected !== 0) {
      await locators.selectAllButton().click();

      const selectionAfterFirstClick = parseRunnerConfigCounterCompat(await locators.configCounter().innerText());
      if (selectionAfterFirstClick.selected !== 0) {
        await locators.selectAllButton().click();
      }
    }

    await expectRunnerConfigSelection(page, 0);
    await expect(locators.selectAllButton()).toContainText(SELECT_ALL_TEXT, { timeout: 10000 });

    for (const requestName of requestNames) {
      const item = locators.requestItem(requestName);
      await expect(item).toBeVisible();
      await item.locator('.checkbox-container').click();
    }

    await expectRunnerConfigSelection(page, requestNames.length);
  });
};

export const selectRunnerScenario = async (page: Page, name: string) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Select runner scenario "${name}"`, async () => {
    await locators.scenarioSelect().selectOption({ label: name });
    await expect(locators.scenarioSelect()).toHaveValue(/.+/);
    await expect(locators.scenarioUpdateButton()).toBeEnabled();
    await expect(locators.scenarioDeleteButton()).toBeEnabled();
  });
};

export const updateRunnerScenario = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step('Update active runner scenario', async () => {
    await expect(locators.scenarioUpdateButton()).toBeEnabled();
    await locators.scenarioUpdateButton().click();
    await waitForToast(page, SCENARIO_UPDATED_TEXT);
  });
};

export const deleteRunnerScenario = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step('Delete active runner scenario', async () => {
    await expect(locators.scenarioDeleteButton()).toBeEnabled();
    await locators.scenarioDeleteButton().click();
    await waitForToast(page, SCENARIO_DELETED_TEXT);
    await expect(locators.scenarioSelect()).toHaveValue('');
    await expect(locators.scenarioUpdateButton()).toBeDisabled();
    await expect(locators.scenarioDeleteButton()).toBeDisabled();
  });
};

const saveRunnerEntity = async (page: Page, name: string, trigger: () => Locator) => {
  const locators = buildRunnerCompatLocators(page);

  await trigger().click();
  await expect(locators.saveModal()).toBeVisible();
  await locators.saveModalNameInput().fill(name);
  await locators.saveModalConfirmButton().click();
  await expect(locators.saveModal()).toBeHidden({ timeout: 10000 });
};

export const saveRunnerScenario = async (page: Page, name: string) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Save runner scenario "${name}"`, async () => {
    await saveRunnerEntity(page, name, () => locators.scenarioSaveAsButton());
    await waitForToast(page, SCENARIO_SAVED_TEXT);
    await expect(locators.scenarioSelect()).toContainText(name);
  });
};

export const saveRunnerSuite = async (page: Page, name: string) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Save runner suite "${name}"`, async () => {
    await saveRunnerEntity(page, name, () => locators.suiteSaveAsButton());
    await waitForToast(page, SUITE_SAVED_TEXT);
    await expect(locators.suiteSelect()).toContainText(name);
  });
};

export const selectRunnerSuiteScenarios = async (page: Page, scenarioNames: string[]) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Select suite scenarios: ${scenarioNames.join(', ')}`, async () => {
    for (const scenarioName of scenarioNames) {
      const item = locators.suiteScenarioItem(scenarioName);
      await expect(item).toBeVisible();
      await item.locator('.suite-panel-checkbox').click();
    }

    await expect(locators.suiteSaveAsButton()).toBeEnabled();
    await expect(locators.suiteRunButton()).toBeEnabled();
  });
};

export const toggleRunnerSuiteScenario = async (page: Page, scenarioName: string) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Toggle suite scenario "${scenarioName}"`, async () => {
    const item = locators.suiteScenarioItem(scenarioName);
    await expect(item).toBeVisible();
    await item.locator('.suite-panel-checkbox').click();
  });
};

export const moveRunnerSuiteScenario = async (page: Page, scenarioName: string, direction: 'up' | 'down') => {
  const locators = buildRunnerCompatLocators(page);
  const button = direction === 'up'
    ? locators.suiteScenarioMoveUpButton(scenarioName)
    : locators.suiteScenarioMoveDownButton(scenarioName);

  await test.step(`Move suite scenario "${scenarioName}" ${direction}`, async () => {
    await expect(button).toBeEnabled();
    await button.click();
    await expect(button).toBeDisabled({ timeout: 10000 });
  });
};

export const expectRunnerSuiteScenarioSelectionCount = async (page: Page, count: number) => {
  const locators = buildRunnerCompatLocators(page);

  await expect(locators.selectedSuiteScenarioItems()).toHaveCount(count);
};

export const selectRunnerSuite = async (page: Page, name: string) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step(`Select runner suite "${name}"`, async () => {
    await locators.suiteSelect().selectOption({ label: name });
    await expect(locators.suiteSelect()).toHaveValue(/.+/);
    await expect(locators.suiteUpdateButton()).toBeEnabled();
    await expect(locators.suiteDeleteButton()).toBeEnabled();
  });
};

export const updateRunnerSuite = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step('Update active runner suite', async () => {
    await expect(locators.suiteUpdateButton()).toBeEnabled();
    await locators.suiteUpdateButton().click();
    await waitForToast(page, SUITE_UPDATED_TEXT);
  });
};

export const deleteRunnerSuite = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  await test.step('Delete active runner suite', async () => {
    await expect(locators.suiteDeleteButton()).toBeEnabled();
    await locators.suiteDeleteButton().click();
    await waitForToast(page, SUITE_DELETED_TEXT);
    await expect(locators.suiteSelect()).toHaveValue('');
    await expect(locators.suiteUpdateButton()).toBeDisabled();
    await expect(locators.suiteDeleteButton()).toBeDisabled();
  });
};

/**
 * Reads test result counts from the filter buttons in the runner results view
 * @param page - The Playwright page object
 * @returns An object with totalRequests, passed, failed, and skipped counts
 */
export const getRunnerResultCounts = async (page: Page) => {
  const locators = buildRunnerCompatLocators(page);

  const totalRequests = parseInt(await locators.allButton().locator('span').innerText());
  const passed = parseInt(await locators.passedButton().locator('span').innerText());
  const failed = parseInt(await locators.failedButton().locator('span').innerText());
  const skipped = parseInt(await locators.skippedButton().locator('span').innerText());

  return { totalRequests, passed, failed, skipped };
};

/**
 * Opens the runner tab for a collection without starting a run
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to open the runner for
 * @returns void
 */
export const openRunnerTab = async (page: Page, collectionName: string) => {
  await test.step(`Open runner tab for "${collectionName}"`, async () => {
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: collectionName });
    await collectionContainer.waitFor({ state: 'visible' });

    const actionsContainer = collectionContainer.locator('.collection-actions');
    await collectionContainer.hover();
    await actionsContainer.waitFor({ state: 'visible' });

    const icon = actionsContainer.locator('.icon');
    await icon.waitFor({ state: 'visible', timeout: 5000 });
    await icon.click();

    const runMenuItem = page.locator('.dropdown-item').filter({ hasText: RUN_TEXT }).first();
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // Wait for the config panel to load
    const locators = buildRunnerCompatLocators(page);
    await locators.configPanel().waitFor({ state: 'visible', timeout: 10000 });
  });
};

/**
 * Runs a collection by clicking the Run menu item and handling the runner tab
 * Includes logic to reset existing results if present
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection to run
 * @returns void
 */
export const runCollection = async (page: Page, collectionName: string) => {
  await test.step(`Run collection "${collectionName}"`, async () => {
    // Ensure collection is visible and loaded (scope to sidebar)
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: collectionName });
    await collectionContainer.waitFor({ state: 'visible' });

    // Open collection actions menu - hover first to reveal the hidden actions button
    const actionsContainer = collectionContainer.locator('.collection-actions');
    await collectionContainer.hover();
    await actionsContainer.waitFor({ state: 'visible' });

    const icon = actionsContainer.locator('.icon');
    await icon.waitFor({ state: 'visible', timeout: 5000 });
    await icon.click();

    // Click Run menu item
    const runMenuItem = page.locator('.dropdown-item').filter({ hasText: RUN_TEXT }).first();
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // Handle runner tab - reset if needed, then run
    const locators = buildRunnerCompatLocators(page);

    // Check if Reset button is visible (means there are existing results)
    const resetVisible = await locators.resetButton().isVisible({ timeout: 1000 }).catch(() => false);
    if (resetVisible) {
      await locators.resetButton().click();
      // Wait for the Run Collection button to become visible after reset
      await locators.runCollectionButton().waitFor({ state: 'visible', timeout: 5000 });
    }

    // Now wait for and click Run Collection button
    await locators.runCollectionButton().waitFor({ state: 'visible', timeout: 10000 });
    await locators.runCollectionButton().click();

    // Wait for the run to complete
    await locators.runAgainButton().waitFor({ timeout: 2 * 60 * 1000 });
  });
};

/**
 * Runs a specific folder within a collection by navigating to it in the sidebar,
 * opening its context menu, and clicking "Run" followed by "Recursive Run".
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection containing the folder
 * @param folderPath - Array of folder names forming the path (e.g. ['scripting', 'api', 'bru', 'cookies'])
 */
export const runFolder = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Run folder "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    // Scope to the specific collection by its DOM id (collection-<name-kebab>)
    const collectionId = `collection-${collectionName.replace(/\s+/g, '-').toLowerCase()}`;
    const collectionContainer = page.locator(`#${collectionId}`);
    await collectionContainer.waitFor({ state: 'visible', timeout: 5000 });

    // Walk down the folder path, scoping each step to the previous folder's container.
    // Each CollectionItem renders as a StyledWrapper div containing:
    //   - div.collection-item-name (the row with chevron, name, menu)
    //   - div (children container when expanded)
    // We scope to the parent wrapper so the next folder lookup is unambiguous.
    let scope = collectionContainer;
    for (const folderName of folderPath) {
      const row = scope.locator('.collection-item-name').filter({ hasText: folderName }).first();
      await row.waitFor({ state: 'visible', timeout: 5000 });

      // Click the chevron to expand (skip if already expanded)
      const chevron = row.getByTestId('folder-chevron');
      const isExpanded = await chevron.evaluate((el: HTMLElement) => el.classList.contains('rotate-90'));
      if (!isExpanded) {
        await chevron.click();
      }

      // Scope to this folder's wrapper (parent of the row) for the next iteration
      scope = row.locator('..');
    }

    // The target folder row is the last one we found — hover to reveal menu
    const targetRow = scope.locator('.collection-item-name').filter({ hasText: folderPath[folderPath.length - 1] }).first();
    await targetRow.hover();

    // Click the menu icon
    const menuIcon = targetRow.locator('.menu-icon');
    await menuIcon.waitFor({ state: 'visible', timeout: 5000 });
    await menuIcon.click();

    // Click "Run" in the dropdown
    const runMenuItem = page.locator('.dropdown-item').filter({ hasText: RUN_TEXT }).first();
    await runMenuItem.waitFor({ state: 'visible' });
    await runMenuItem.click();

    // In the RunCollectionItem modal, click "Recursive Run"
    const recursiveRunButton = page.getByRole('button', { name: RECURSIVE_RUN_TEXT });
    await recursiveRunButton.waitFor({ state: 'visible', timeout: 5000 });
    await recursiveRunButton.click();

    // Wait for the run to complete
    const runnerLocators = buildRunnerCompatLocators(page);
    await runnerLocators.runAgainButton().waitFor({ timeout: 2 * 60 * 1000 });
  });
};

/**
 * Sets up the JavaScript sandbox mode for a collection
 * @param page - The Playwright page object
 * @param collectionName - The name of the collection (can be title or text)
 * @param mode - 'developer' or 'safe' mode
 * @returns void
 */
export const setSandboxMode = async (page: Page, collectionName: string, mode: 'developer' | 'safe') => {
  await test.step(`Set sandbox mode to "${mode}" for "${collectionName}"`, async () => {
    const sandboxLocators = buildSandboxLocators(page);

    // Click on the collection name in the sidebar
    const sidebarCollection = page.getByTestId('collections').locator('#sidebar-collection-name').filter({ hasText: collectionName }).first();
    await sidebarCollection.waitFor({ state: 'visible' });
    await sidebarCollection.click();

    // Check if there's already a mode selected - if so, we need to click the badge to open settings tab
    const sandboxBadgeVisible = await sandboxLocators.sandboxModeSelector().isVisible().catch(() => false);
    // If a badge exists, click it to open the security settings tab
    if (sandboxBadgeVisible) {
      await sandboxLocators.sandboxModeSelector().click();

      // Wait for the security settings tab to be active
      await sandboxLocators.jsSandboxHeading().waitFor({ state: 'visible', timeout: 10000 });
    }
    // If no badge exists, the modal should have appeared automatically (first time selection)

    // Wait for security settings form to be visible - wait for either radio button
    await Promise.race([
      sandboxLocators.safeModeRadio().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      sandboxLocators.developerModeRadio().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);

    if (mode === 'developer') {
      await sandboxLocators.developerModeRadio().waitFor({ state: 'visible', timeout: 5000 });
      await sandboxLocators.developerModeRadio().click();
    } else {
      await sandboxLocators.safeModeRadio().waitFor({ state: 'visible', timeout: 5000 });
      await sandboxLocators.safeModeRadio().click();
    }

    await page.keyboard.press('Escape');
  });
};

/**
 * Validates runner results against expected counts
 * @param page - The Playwright page object
 * @param expected - Expected counts
 * @returns void
 */
export const validateRunnerResults = async (page: Page,
  expected: {
    totalRequests?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
  }) => {
  const { totalRequests, passed, failed, skipped } = await getRunnerResultCounts(page);

  if (expected.totalRequests !== undefined) {
    await expect(totalRequests).toBe(expected.totalRequests);
  }
  if (expected.passed !== undefined) {
    await expect(passed).toBe(expected.passed);
  }
  if (expected.failed !== undefined) {
    await expect(failed).toBe(expected.failed);
  }
  if (expected.skipped !== undefined) {
    await expect(skipped).toBe(expected.skipped);
  }

  // Validate that passed + failed + skipped = totalRequests
  await expect(passed).toBe(totalRequests - skipped - failed);
};
