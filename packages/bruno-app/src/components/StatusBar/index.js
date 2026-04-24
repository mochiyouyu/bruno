import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import find from 'lodash/find';
import { IconSettings, IconCookie, IconTool, IconSearch, IconPalette, IconBrandGithub } from '@tabler/icons';
import Mousetrap from 'mousetrap';
import { getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import ToolHint from 'components/ToolHint';
import Cookies from 'components/Cookies';
import Notifications from 'components/Notifications';
import Portal from 'components/Portal';
import ThemeDropdown from './ThemeDropdown';
import { openConsole } from 'providers/ReduxStore/slices/logs';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { useApp } from 'providers/App';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const StatusBar = () => {
  const dispatch = useDispatch();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const showManageWorkspacePage = useSelector((state) => state.app.showManageWorkspacePage);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const logs = useSelector((state) => state.logs.logs);
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const { version } = useApp();
  const { t } = useTranslation();

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  const errorCount = logs.filter((log) => log.type === 'error').length;

  const handleConsoleClick = () => {
    dispatch(openConsole());
  };

  const handlePreferencesClick = () => {
    const collectionUid = activeTab?.collectionUid || activeWorkspace?.scratchCollectionUid;

    dispatch(
      addTab({
        type: 'preferences',
        uid: collectionUid ? `${collectionUid}-preferences` : 'preferences',
        collectionUid: collectionUid
      })
    );
  };

  const openGlobalSearch = () => {
    const bindings = getKeyBindingsForActionAllOS('globalSearch') || [];
    bindings.forEach((binding) => {
      Mousetrap.trigger(binding);
    });
  };

  return (
    <StyledWrapper>
      {cookiesOpen && (
        <Portal>
          <Cookies
            onClose={() => {
              setCookiesOpen(false);
              document.querySelector('[data-trigger="cookies"]').focus();
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="cookies-title"
            aria-describedby="cookies-description"
          />
        </Portal>
      )}

      <div className="status-bar">
        <div className="status-bar-section">
          <div className="status-bar-group">
            <ToolHint text={t('STATUS_BAR.PREFERENCES', { defaultValue: 'Preferences' })} toolhintId="Preferences" place="top-start" offset={10}>
              <button
                className="status-bar-button preferences-button"
                data-trigger="preferences"
                onClick={handlePreferencesClick}
                tabIndex={0}
                aria-label={t('STATUS_BAR.OPEN_PREFERENCES', { defaultValue: 'Open Preferences' })}
              >
                <IconSettings size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>

            <ThemeDropdown>
              <button
                className="status-bar-button"
                data-trigger="theme"
                tabIndex={0}
                aria-label={t('STATUS_BAR.CHANGE_THEME', { defaultValue: 'Change Theme' })}
              >
                <IconPalette size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ThemeDropdown>

            <ToolHint text={t('STATUS_BAR.NOTIFICATIONS', { defaultValue: 'Notifications' })} toolhintId="Notifications" place="top" offset={10}>
              <div className="status-bar-button">
                <Notifications />
              </div>
            </ToolHint>

            <ToolHint text={t('STATUS_BAR.GITHUB_REPOSITORY', { defaultValue: 'GitHub Repository' })} toolhintId="GitHub" place="top" offset={10}>
              <button
                className="status-bar-button"
                onClick={() => {
                  window?.ipcRenderer?.openExternal('https://github.com/usebruno/bruno');
                }}
                tabIndex={0}
                aria-label={t('STATUS_BAR.OPEN_GITHUB_REPOSITORY', { defaultValue: 'Open GitHub Repository' })}
              >
                <IconBrandGithub size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </ToolHint>
          </div>
        </div>

        <div className="status-bar-section">
          <div className="flex items-center gap-3">
            <button
              className="status-bar-button"
              data-trigger="search"
              onClick={openGlobalSearch}
              tabIndex={0}
              aria-label={t('STATUS_BAR.GLOBAL_SEARCH', { defaultValue: 'Global Search' })}
            >
              <div className="console-button-content">
                <IconSearch size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">{t('STATUS_BAR.SEARCH', { defaultValue: 'Search' })}</span>
              </div>
            </button>

            <button
              className="status-bar-button"
              data-trigger="cookies"
              onClick={() => setCookiesOpen(true)}
              tabIndex={0}
              aria-label={t('STATUS_BAR.OPEN_COOKIES', { defaultValue: 'Open Cookies' })}
            >
              <div className="console-button-content">
                <IconCookie size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">{t('STATUS_BAR.COOKIES', { defaultValue: 'Cookies' })}</span>
              </div>
            </button>

            <button
              className={`status-bar-button ${errorCount > 0 ? 'has-errors' : ''}`}
              data-trigger="dev-tools"
              onClick={handleConsoleClick}
              tabIndex={0}
              aria-label={t('STATUS_BAR.OPEN_DEVTOOLS', {
                defaultValue: 'Open Dev Tools{{suffix}}',
                suffix: errorCount > 0 ? ` (${errorCount} errors)` : ''
              })}
            >
              <div className="console-button-content">
                <IconTool size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="console-label">{t('STATUS_BAR.DEVTOOLS', { defaultValue: 'Dev Tools' })}</span>
                {errorCount > 0 && (
                  <span className="error-count-inline">{errorCount}</span>
                )}
              </div>
            </button>

            <div className="status-bar-divider"></div>

            <div className="status-bar-version">
              v{version}
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default StatusBar;
