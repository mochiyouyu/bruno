import React from 'react';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import Button from 'ui/Button';

const ScenarioSuitePanel = ({
  scenarios,
  selectedScenarioIds,
  onToggleScenario,
  onMoveScenario
}) => {
  const { t } = useTranslation();
  if (!scenarios?.length) {
    return (
      <div className="suite-panel-empty">
        {t('RUNNER.SUITE.EMPTY', {
          defaultValue: 'Save at least one scenario first, then you can combine multiple scenarios into an automated suite.'
        })}
      </div>
    );
  }

  return (
    <div className="suite-panel-list">
      {scenarios.map((scenario) => {
        const selectedIndex = selectedScenarioIds.indexOf(scenario.id);
        const isSelected = selectedIndex !== -1;

        return (
          <div
            key={scenario.id}
            className={`suite-panel-item ${isSelected ? 'is-selected' : ''}`}
            data-testid="runner-suite-scenario-item"
          >
            <div className="suite-panel-checkbox" onClick={() => onToggleScenario(scenario.id)}>
              <div className="checkbox">{isSelected ? <IconCheck size={12} strokeWidth={2.5} /> : null}</div>
            </div>

            <div className="suite-panel-content" onClick={() => onToggleScenario(scenario.id)}>
              <div className="suite-panel-name">{scenario.name}</div>
              <div className="suite-panel-meta">
                {t('RUNNER.REQUEST_COUNT', {
                  defaultValue: '{{count}} requests',
                  count: (scenario.selectedRequestItems || []).length
                })}
              </div>
            </div>

            <div className="suite-panel-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={!isSelected || selectedIndex === 0}
                onClick={() => onMoveScenario(scenario.id, 'up')}
                data-testid="runner-suite-move-up"
              >
                <IconChevronUp size={14} strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!isSelected || selectedIndex === selectedScenarioIds.length - 1}
                onClick={() => onMoveScenario(scenario.id, 'down')}
                data-testid="runner-suite-move-down"
              >
                <IconChevronDown size={14} strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScenarioSuitePanel;
