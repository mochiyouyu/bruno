import React from 'react';
import GradientCloseButton from './GradientCloseButton';
import { IconVariable, IconSettings, IconRun, IconFolder, IconDatabase, IconWorld, IconHome, IconFileCode } from '@tabler/icons';
import OpenAPISyncIcon from 'components/Icons/OpenAPISync';
import StatusBadge from 'ui/StatusBadge/index';
import { useTranslation } from 'react-i18next';

const SpecialTab = ({ handleCloseClick, type, tabName, handleDoubleClick, hasDraft }) => {
  const { t } = useTranslation();
  const getTabInfo = (type, tabName) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <>
            <IconSettings size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.COLLECTION', { defaultValue: 'Collection' })}</span>
          </>
        );
      }
      case 'collection-overview': {
        return (
          <>
            <IconSettings size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.OVERVIEW', { defaultValue: 'Overview' })}</span>
          </>
        );
      }
      case 'folder-settings': {
        return (
          <>
            <IconFolder size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{tabName || t('SPECIAL_TABS.FOLDER', { defaultValue: 'Folder' })}</span>
          </>
        );
      }
      case 'variables': {
        return (
          <>
            <IconVariable size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.VARIABLES', { defaultValue: 'Variables' })}</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <IconRun size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.RUNNER', { defaultValue: 'Runner' })}</span>
          </>
        );
      }
      case 'environment-settings': {
        return (
          <>
            <IconDatabase size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.ENVIRONMENTS', { defaultValue: 'Environments' })}</span>
          </>
        );
      }
      case 'global-environment-settings': {
        return (
          <>
            <IconWorld size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.GLOBAL_ENVIRONMENTS', { defaultValue: 'Global Environments' })}</span>
          </>
        );
      }
      case 'preferences': {
        return (
          <>
            <IconSettings size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.PREFERENCES', { defaultValue: 'Preferences' })}</span>
          </>
        );
      }
      case 'workspaceOverview': {
        return (
          <>
            <IconHome size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.OVERVIEW', { defaultValue: 'Overview' })}</span>
          </>
        );
      }
      case 'workspaceEnvironments': {
        return (
          <>
            <IconWorld size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.ENVIRONMENTS', { defaultValue: 'Environments' })}</span>
          </>
        );
      }
      case 'openapi-sync': {
        return (
          <>
            <OpenAPISyncIcon size={14} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name mr-1">OpenAPI</span>
            <StatusBadge status="info" size="xs">{t('SPECIAL_TABS.BETA', { defaultValue: 'Beta' })}</StatusBadge>
          </>
        );
      }
      case 'openapi-spec': {
        return (
          <>
            <IconFileCode size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
            <span className="ml-1 tab-name">{t('SPECIAL_TABS.API_SPEC', { defaultValue: 'API Spec' })}</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div
        className="flex items-center tab-label"
        onDoubleClick={handleDoubleClick}
      >
        {getTabInfo(type, tabName)}
      </div>
      {handleCloseClick && <GradientCloseButton hasChanges={hasDraft} onClick={(e) => handleCloseClick(e)} />}
    </>
  );
};

export default SpecialTab;
