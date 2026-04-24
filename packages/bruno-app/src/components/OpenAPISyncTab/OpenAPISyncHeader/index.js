import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectStoredSpecMeta } from 'providers/ReduxStore/slices/openapi-sync';
import {
  IconCopy,
  IconDotsVertical,
  IconUnlink,
  IconSettings,
  IconRefresh,
  IconCircleCheck,
  IconAlertTriangle
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon/index';
import MenuDropdown from 'ui/MenuDropdown';
import Help from 'components/Help';
import { isHttpUrl } from 'utils/url/index';
import { useTranslation } from 'react-i18next';

const OpenAPISyncHeader = ({
  collection, spec, sourceUrl, syncStatus, onViewSpec,
  onOpenSettings, onOpenDisconnect,
  onCheck, isLoading
}) => {
  const sourceIsLocal = !isHttpUrl(sourceUrl);
  const canCheck = !!sourceUrl?.trim();
  const [displayPath, setDisplayPath] = useState(sourceUrl);
  const specMeta = useSelector(selectStoredSpecMeta(collection.uid));
  const { t } = useTranslation();

  useEffect(() => {
    if (sourceIsLocal && sourceUrl) {
      window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname)
        .then((resolved) => setDisplayPath(resolved))
        .catch(() => setDisplayPath(sourceUrl));
    } else {
      setDisplayPath(sourceUrl);
    }
  }, [sourceUrl, sourceIsLocal, collection.pathname]);

  const title = specMeta?.title || spec?.info?.title || t('OPENAPI_SYNC.HEADER.UNKNOWN_API', { defaultValue: 'Unknown API' });

  const copyUrl = async () => {
    if (!sourceUrl) return;

    try {
      if (sourceIsLocal) {
        const absolutePath = await window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname);
        await navigator.clipboard.writeText(absolutePath);
      } else {
        await navigator.clipboard.writeText(sourceUrl);
      }

      toast.success(sourceIsLocal
        ? t('OPENAPI_SYNC.HEADER.PATH_COPIED', { defaultValue: 'Path copied to clipboard' })
        : t('OPENAPI_SYNC.HEADER.URL_COPIED', { defaultValue: 'URL copied to clipboard' }));
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error(t('OPENAPI_SYNC.HEADER.COPY_FAILED', { defaultValue: 'Failed to copy to clipboard' }));
    }
  };

  const revealInFolder = async () => {
    if (!sourceUrl) return;

    try {
      const absolutePath = await window.ipcRenderer.invoke('renderer:resolve-path', sourceUrl, collection.pathname);
      await window.ipcRenderer.invoke('renderer:show-in-folder', absolutePath);
    } catch (err) {
      console.error('Error revealing in folder:', err);
      toast.error(t('OPENAPI_SYNC.HEADER.REVEAL_FAILED', { defaultValue: 'Failed to open in file manager' }));
    }
  };

  const menuItems = [
    {
      id: 'settings',
      label: t('OPENAPI_SYNC.HEADER.EDIT_CONNECTION_SETTINGS', { defaultValue: 'Edit connection settings' }),
      leftSection: IconSettings,
      onClick: onOpenSettings
    },
    {
      id: 'disconnect',
      label: t('OPENAPI_SYNC.DISCONNECT.TITLE', { defaultValue: 'Disconnect Sync' }),
      leftSection: IconUnlink,
      className: 'delete-item',
      onClick: onOpenDisconnect
    }
  ];

  return (
    <div className="spec-info-card">
      <div className="spec-info-header">
        <div className="spec-title-section">
          <div className="spec-title-row">
            <span className="spec-title">{title}</span>
          </div>
        </div>
        <div className="spec-header-actions">
          <Button
            color="secondary"
            size="sm"
            onClick={onCheck}
            disabled={!canCheck}
            loading={isLoading}
            icon={<IconRefresh size={14} />}
          >
            {t('OPENAPI_SYNC.HEADER.CHECK_FOR_UPDATES', { defaultValue: 'Check for updates' })}
          </Button>
          <Button
            color="secondary"
            size="sm"
            onClick={onViewSpec}
          >
            {t('OPENAPI_SYNC.HEADER.VIEW_SPEC', { defaultValue: 'View spec' })}
          </Button>
          <MenuDropdown items={menuItems} placement="bottom-end">
            <ActionIcon label={t('OPENAPI_SYNC.COMMON.MORE_OPTIONS', { defaultValue: 'More options' })}>
              <IconDotsVertical size={16} strokeWidth={2} />
            </ActionIcon>
          </MenuDropdown>
        </div>
      </div>
      <div className="spec-url-row">
        <span className="spec-url-label">
          {sourceIsLocal
            ? t('OPENAPI_SYNC.HEADER.SOURCE_FILE', { defaultValue: 'Source File:' })
            : t('OPENAPI_SYNC.HEADER.SOURCE_URL', { defaultValue: 'Source URL:' })}
        </span>
        {sourceIsLocal ? (
          <button
            className="spec-url-value spec-file-reveal"
            title={t('OPENAPI_SYNC.HEADER.REVEAL_IN_FILE_MANAGER', { defaultValue: 'Reveal in file manager' })}
            type="button"
            onClick={revealInFolder}
          >
            {displayPath}
          </button>
        ) : (
          <a
            className="spec-url-value"
            href={sourceUrl}
            title={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {sourceUrl}
          </a>
        )}
        <button
          className="copy-btn"
          onClick={copyUrl}
          title={sourceIsLocal
            ? t('OPENAPI_SYNC.HEADER.COPY_PATH', { defaultValue: 'Copy path' })
            : t('OPENAPI_SYNC.HEADER.COPY_URL', { defaultValue: 'Copy URL' })}
          type="button"
        >
          <IconCopy size={12} />
        </button>
      </div>
      <div className="linked-collection-row mt-1">
        <span className="spec-url-label">{t('OPENAPI_SYNC.HEADER.LINKED_COLLECTION', { defaultValue: 'Linked Collection:' })}</span>
        <span className="linked-collection-name">{collection.name}</span>
        {syncStatus === 'in-sync' && (
          <Help
            placement="bottom"
            width={240}
            iconComponent={() => <IconCircleCheck size={14} className="sync-status-icon in-sync" />}
          >
            {t('OPENAPI_SYNC.HEADER.IN_SYNC_TOOLTIP', { defaultValue: 'Collection is up to date with the spec' })}
          </Help>
        )}
        {syncStatus === 'not-in-sync' && (
          <Help
            placement="bottom"
            width={260}
            iconComponent={() => <IconAlertTriangle size={14} className="sync-status-icon not-in-sync" />}
          >
            {t('OPENAPI_SYNC.HEADER.NOT_IN_SYNC_TOOLTIP', { defaultValue: 'Collection is not up to date with the spec' })}
          </Help>
        )}
      </div>
    </div>
  );
};

export default OpenAPISyncHeader;
