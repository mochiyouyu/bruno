import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectStoredSpecMeta } from 'providers/ReduxStore/slices/openapi-sync';
import { getTotalRequestCountInCollection } from 'utils/collections/';
import moment from 'moment';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import Help from 'components/Help';
import { useTranslation } from 'react-i18next';

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const OverviewSection = ({ collection, storedSpec, collectionDrift, specDrift, remoteDrift, onTabSelect, error, onOpenSettings }) => {
  const openApiSyncConfig = collection?.brunoConfig?.openapi?.[0];
  const reduxError = useSelector((state) => state.openapiSync?.collectionUpdates?.[collection.uid]?.error);
  const specMeta = useSelector(selectStoredSpecMeta(collection.uid));
  const { t } = useTranslation();

  const activeError = error || reduxError;
  const version = specMeta?.version;
  const endpointCount = specMeta?.endpointCount ?? null;
  const lastSyncDate = openApiSyncConfig?.lastSyncDate;
  const groupBy = openApiSyncConfig?.groupBy || 'tags';
  const autoCheckEnabled = openApiSyncConfig?.autoCheck !== false;
  const autoCheckInterval = openApiSyncConfig?.autoCheckInterval || 5;
  const hasDriftData = collectionDrift && !collectionDrift.noStoredSpec;
  const emptyValue = t('OPENAPI_SYNC.COMMON.EMPTY_VALUE', { defaultValue: '-' });

  const summaryCards = [
    {
      key: 'total',
      label: t('OPENAPI_SYNC.OVERVIEW.CARDS.TOTAL', { defaultValue: 'Total in Collection' }),
      color: 'blue',
      tooltip: t('OPENAPI_SYNC.OVERVIEW.CARDS.TOTAL_TOOLTIP', { defaultValue: 'Total endpoints in your collection' })
    },
    {
      key: 'inSync',
      label: t('OPENAPI_SYNC.OVERVIEW.CARDS.IN_SYNC', { defaultValue: 'In Sync with Spec' }),
      color: 'green',
      tooltip: t('OPENAPI_SYNC.OVERVIEW.CARDS.IN_SYNC_TOOLTIP', { defaultValue: 'Endpoints that currently match the latest spec from the source' })
    },
    {
      key: 'changed',
      label: t('OPENAPI_SYNC.OVERVIEW.CARDS.CHANGED', { defaultValue: 'Changed in Collection' }),
      color: 'muted',
      tooltip: t('OPENAPI_SYNC.OVERVIEW.CARDS.CHANGED_TOOLTIP', { defaultValue: 'Endpoints modified, deleted, or added locally since last sync' }),
      tab: 'collection-changes'
    },
    {
      key: 'pending',
      label: t('OPENAPI_SYNC.OVERVIEW.CARDS.PENDING', { defaultValue: 'Spec Updates Pending' }),
      color: 'amber',
      tooltip: t('OPENAPI_SYNC.OVERVIEW.CARDS.PENDING_TOOLTIP', { defaultValue: 'Spec changes available to sync to your collection' }),
      tab: 'spec-updates'
    }
  ];

  const totalInCollection = getTotalRequestCountInCollection(collection);
  const inSyncCount = remoteDrift ? (remoteDrift.inSync?.length || 0) : null;
  const changedInCollection = hasDriftData
    ? (collectionDrift.modified?.length || 0) + (collectionDrift.missing?.length || 0) + (collectionDrift.localOnly?.length || 0)
    : 0;
  const specUpdatesPending = hasDriftData
    ? (specDrift?.added?.length || 0) + (specDrift?.modified?.length || 0) + (specDrift?.removed?.length || 0)
    : (remoteDrift?.modified?.length || 0) + (remoteDrift?.missing?.length || 0);
  const conflictCount = hasDriftData && specDrift?.modified
    ? (() => {
        const localModifiedIds = new Set((collectionDrift.modified || []).map((ep) => ep.id));
        return specDrift.modified.filter((ep) => localModifiedIds.has(ep.id)).length;
      })()
    : 0;

  const summaryValues = {
    total: totalInCollection,
    inSync: inSyncCount,
    changed: changedInCollection,
    pending: activeError ? null : specDrift ? specUpdatesPending : null
  };

  const details = [
    { label: t('OPENAPI_SYNC.OVERVIEW.SPEC_VERSION', { defaultValue: 'Spec Version' }), value: version ? `v${version}` : emptyValue },
    { label: t('OPENAPI_SYNC.OVERVIEW.ENDPOINTS_IN_SPEC', { defaultValue: 'Endpoints in Spec' }), value: endpointCount != null ? endpointCount : emptyValue },
    {
      label: t('OPENAPI_SYNC.OVERVIEW.LAST_SYNCED_AT', { defaultValue: 'Last Synced At' }),
      value: lastSyncDate ? moment(lastSyncDate).fromNow() : emptyValue,
      tooltip: lastSyncDate ? moment(lastSyncDate).format('MMMM D, YYYY [at] h:mm A') : undefined
    },
    { label: t('OPENAPI_SYNC.OVERVIEW.FOLDER_GROUPING', { defaultValue: 'Folder Grouping' }), value: capitalize(groupBy) },
    {
      label: t('OPENAPI_SYNC.OVERVIEW.AUTO_CHECK_FOR_UPDATES', { defaultValue: 'Auto Check for Updates' }),
      value: autoCheckEnabled
        ? t('OPENAPI_SYNC.OVERVIEW.EVERY_X_MIN', { defaultValue: 'Every {{count}} min', count: autoCheckInterval })
        : t('OPENAPI_SYNC.OVERVIEW.DISABLED', { defaultValue: 'Disabled' })
    }
  ];

  const hasCollectionChanges = changedInCollection > 0;
  const hasSpecUpdates = specUpdatesPending > 0;

  const bannerState = useMemo(() => {
    const versionInfo = (specDrift?.storedVersion && specDrift?.newVersion && specDrift.storedVersion !== specDrift.newVersion)
      ? ` (v${specDrift.storedVersion} -> v${specDrift.newVersion})`
      : '';

    if (activeError) {
      return {
        variant: 'danger',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.FAILED_TO_CHECK', { defaultValue: 'Failed to check for spec updates' }),
        subtitle: activeError,
        buttons: ['open-settings']
      };
    }
    if (specDrift?.storedSpecMissing && !lastSyncDate) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.INITIAL_SYNC_REQUIRED', { defaultValue: 'Initial sync required, your collection differs from the spec' }),
        subtitle: t('OPENAPI_SYNC.OVERVIEW.BANNERS.INITIAL_SYNC_REQUIRED_DESC', { defaultValue: 'Review the changes and sync to bring your collection up to date.' }),
        buttons: ['review']
      };
    }
    if (hasSpecUpdates && hasCollectionChanges) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.SPEC_AND_COLLECTION_UPDATES', {
          defaultValue: 'OpenAPI spec has new updates{{versionInfo}} and the collection has changes',
          versionInfo
        }),
        subtitle: t('OPENAPI_SYNC.OVERVIEW.BANNERS.SPEC_AND_COLLECTION_UPDATES_DESC', { defaultValue: 'New or changed requests are available. Some collection changes may be overwritten.' }),
        buttons: ['sync', 'changes']
      };
    }
    if (hasSpecUpdates) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.SPEC_UPDATES', {
          defaultValue: 'OpenAPI spec has new updates{{versionInfo}}',
          versionInfo
        }),
        subtitle: t('OPENAPI_SYNC.OVERVIEW.BANNERS.SPEC_UPDATES_DESC', { defaultValue: 'New or changed requests are available.' }),
        buttons: ['sync']
      };
    }
    if (specDrift?.storedSpecMissing && lastSyncDate) {
      return {
        variant: 'warning',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.LAST_SYNCED_SPEC_NOT_FOUND', { defaultValue: 'Last synced spec not found' }),
        subtitle: t('OPENAPI_SYNC.OVERVIEW.BANNERS.LAST_SYNCED_SPEC_NOT_FOUND_DESC', { defaultValue: 'The last synced spec is missing in the storage. Restore the latest spec from the source to track collection changes.' }),
        buttons: ['spec-details']
      };
    }
    if (!hasDriftData) return null;
    if (hasCollectionChanges) {
      return {
        variant: 'muted',
        title: t('OPENAPI_SYNC.OVERVIEW.BANNERS.COLLECTION_CHANGED', { defaultValue: 'Collection has changes not in the spec' }),
        subtitle: t('OPENAPI_SYNC.OVERVIEW.BANNERS.COLLECTION_CHANGED_DESC', { defaultValue: 'Some requests have been modified or removed and no longer match the spec.' }),
        buttons: ['changes']
      };
    }
    return null;
  }, [activeError, hasCollectionChanges, hasDriftData, hasSpecUpdates, lastSyncDate, specDrift, t]);

  return (
    <div className="overview-section">
      {bannerState && (
        <div className={`overview-status-banner ${bannerState.variant}`}>
          <div className="banner-text">
            <div className="banner-title-row">
              {bannerState.variant === 'success'
                ? <IconCheck size={16} className="status-check-icon" />
                : <div className={`status-dot ${bannerState.variant}`} />}
              <span className="banner-title">{bannerState.title}</span>
            </div>
            {bannerState.subtitle && (
              <p className="banner-subtitle">{bannerState.subtitle}</p>
            )}
          </div>
          {bannerState.buttons.length > 0 && (
            <div className="banner-button-row">
              {bannerState.buttons.includes('changes') && (
                <Button
                  size="sm"
                  variant={bannerState.buttons.includes('sync') ? 'outline' : 'filled'}
                  color={bannerState.buttons.includes('sync') ? 'secondary' : 'primary'}
                  onClick={() => onTabSelect('collection-changes')}
                >
                  {t('OPENAPI_SYNC.OVERVIEW.VIEW_COLLECTION_CHANGES', { defaultValue: 'View Collection Changes' })}
                </Button>
              )}
              {(bannerState.buttons.includes('sync') || bannerState.buttons.includes('review')) && (
                <Button size="sm" onClick={() => onTabSelect('spec-updates')}>
                  {t('OPENAPI_SYNC.OVERVIEW.REVIEW_AND_SYNC', { defaultValue: 'Review and Sync Collection' })}
                </Button>
              )}
              {bannerState.buttons.includes('spec-details') && (
                <Button variant="outline" size="sm" onClick={() => onTabSelect('spec-updates')}>
                  {t('OPENAPI_SYNC.OVERVIEW.GO_TO_SPEC_UPDATES', { defaultValue: 'Go to Spec Updates' })}
                </Button>
              )}
              {bannerState.buttons.includes('open-settings') && (
                <Button variant="outline" size="sm" onClick={onOpenSettings}>
                  {t('OPENAPI_SYNC.OVERVIEW.UPDATE_CONNECTION_SETTINGS', { defaultValue: 'Update connection settings' })}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <h4 className="overview-section-title mt-5">{t('OPENAPI_SYNC.OVERVIEW.ENDPOINT_SUMMARY', { defaultValue: 'Endpoint Summary' })}</h4>
      <div className="sync-summary-cards">
        {summaryCards.map(({ key, label, tooltip, tab, color }) => {
          const count = summaryValues[key];
          const resolvedColor = count > 0 ? color : 'muted';
          const isClickable = tab && count > 0;

          return (
            <div
              className={`summary-card${isClickable ? ' clickable' : ''}`}
              key={key}
              onClick={isClickable ? () => onTabSelect(tab) : undefined}
            >
              <span className="card-info-icon">
                <Help icon="info" size={12} placement="top" width={220}>{tooltip}</Help>
              </span>
              <div className="summary-count-row">
                <span className={`summary-count ${resolvedColor}`}>{count != null ? count : emptyValue}</span>
                {key === 'pending' && conflictCount > 0 && (
                  <span className="conflict-annotation">
                    ({conflictCount} {t(conflictCount === 1 ? 'OPENAPI_SYNC.OVERVIEW.CONFLICT' : 'OPENAPI_SYNC.OVERVIEW.CONFLICTS', {
                      defaultValue: conflictCount === 1 ? 'conflict' : 'conflicts'
                    })})
                  </span>
                )}
              </div>
              <div className="summary-label">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="overview-section-title mt-7">{t('OPENAPI_SYNC.OVERVIEW.LAST_SYNCED_SPEC_DETAILS', { defaultValue: 'Last Synced Spec Details' })}</h4>
      <div className="spec-details-grid">
        {details.map(({ label, value, tooltip }) => (
          <div className="spec-detail-item" key={label}>
            <div className="spec-detail-label">{label}</div>
            <div className="spec-detail-value">
              {value}
              {tooltip && (
                <Help icon="info" size={11} placement="top" width={200}>{tooltip}</Help>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverviewSection;
