import { useMemo } from 'react';
import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowBackUp,
  IconExternalLink,
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2
} from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import Modal from 'components/Modal';
import EndpointChangeSection from '../EndpointChangeSection';
import ExpandableEndpointRow from '../EndpointChangeSection/ExpandableEndpointRow';
import useEndpointActions from '../hooks/useEndpointActions';

const CollectionStatusSection = ({
  collection,
  collectionDrift,
  reloadDrift,
  specDrift,
  storedSpec,
  lastSyncDate,
  onOpenEndpoint,
  isLoading,
  onTabSelect
}) => {
  const { t } = useTranslation();
  const {
    pendingAction, setPendingAction,
    confirmPendingAction,
    handleResetEndpoint,
    handleResetAllModified,
    handleDeleteEndpoint,
    handleDeleteAllLocalOnly,
    handleRevertAllChanges,
    handleAddMissingEndpoint,
    handleAddAllMissing
  } = useEndpointActions(collection, collectionDrift, reloadDrift);

  const spec = storedSpec || specDrift?.newSpec;
  const hasStoredSpec = collectionDrift && !collectionDrift.noStoredSpec;
  const hasDrift = hasStoredSpec && (collectionDrift.modified?.length > 0
    || collectionDrift.missing?.length > 0
    || collectionDrift.localOnly?.length > 0);

  const renderDriftRow = (endpoint, idx, actions) => (
    <ExpandableEndpointRow
      key={endpoint.id}
      endpoint={endpoint}
      collectionPath={collection.pathname}
      newSpec={spec}
      showDecisions={false}
      diffLeftLabel={t('OPENAPI_SYNC.COLLECTION_STATUS.DIFF.LAST_SYNCED_SPEC', { defaultValue: 'Last Synced Spec' })}
      diffRightLabel={t('OPENAPI_SYNC.COLLECTION_STATUS.DIFF.CURRENT_IN_COLLECTION', { defaultValue: 'Current (in collection)' })}
      swapDiffSides
      collectionUid={collection.uid}
      actions={actions}
    />
  );

  const modifiedCount = collectionDrift?.modified?.length || 0;
  const missingCount = collectionDrift?.missing?.length || 0;
  const localOnlyCount = collectionDrift?.localOnly?.length || 0;

  const bannerState = useMemo(() => {
    if (hasDrift) {
      return {
        variant: 'muted',
        message: t('OPENAPI_SYNC.COLLECTION_STATUS.BANNER.CHANGED_SINCE_LAST_SYNC', {
          defaultValue: 'Collection has changes since last sync'
        }),
        badges: { modifiedCount, missingCount, localOnlyCount },
        actions: ['revert-all']
      };
    }
    return null;
  }, [hasDrift, localOnlyCount, missingCount, modifiedCount, t]);

  return (
    <div className="collection-status-section">
      {bannerState && (
        <div className={`spec-update-banner ${bannerState.variant}`}>
          <div className="banner-left">
            {bannerState.variant === 'success'
              ? <IconCheck size={16} className="status-check-icon" />
              : <div className={`status-dot ${bannerState.variant}`} />}
            <span className="banner-title">
              {bannerState.message}
            </span>
            {bannerState.badges && (
              <span className="banner-details">
                {bannerState.badges.modifiedCount > 0 && (
                  <StatusBadge status="warning" radius="full">
                    {t('OPENAPI_SYNC.COLLECTION_STATUS.BADGES.MODIFIED', {
                      defaultValue: '{{count}} modified',
                      count: bannerState.badges.modifiedCount
                    })}
                  </StatusBadge>
                )}
                {bannerState.badges.missingCount > 0 && (
                  <StatusBadge status="danger" radius="full">
                    {t('OPENAPI_SYNC.COLLECTION_STATUS.BADGES.DELETED', {
                      defaultValue: '{{count}} deleted',
                      count: bannerState.badges.missingCount
                    })}
                  </StatusBadge>
                )}
                {bannerState.badges.localOnlyCount > 0 && (
                  <StatusBadge status="muted" radius="full">
                    {t('OPENAPI_SYNC.COLLECTION_STATUS.BADGES.ADDED', {
                      defaultValue: '{{count}} added',
                      count: bannerState.badges.localOnlyCount
                    })}
                  </StatusBadge>
                )}
              </span>
            )}
          </div>
          {bannerState.actions.includes('revert-all') && (
            <div className="banner-actions">
              <Button size="sm" variant="ghost" color="danger" onClick={handleRevertAllChanges}>
                {t('OPENAPI_SYNC.COLLECTION_STATUS.BANNER.REVERT_ALL_TO_SPEC', { defaultValue: 'Revert All to Spec' })}
              </Button>
            </div>
          )}
        </div>
      )}

      {hasDrift && (
        <div className="sync-info-notice mt-4">
          <IconInfoCircle size={14} className="sync-info-icon" />
          <span>
            <span className="whats-updated-title">
              {t('OPENAPI_SYNC.COLLECTION_STATUS.WHATS_TRACKED_LABEL', { defaultValue: "What's tracked:" })}
            </span>{' '}
            {t('OPENAPI_SYNC.COLLECTION_STATUS.WHATS_TRACKED_DESC', {
              defaultValue: 'Changes to parameters, headers, body and auth compared to the synced spec. Your variables, scripts, tests, assertions, settings etc. are not tracked here.'
            })}
          </span>
        </div>
      )}

      {hasDrift ? (
        <div className="mt-5">
          <EndpointChangeSection
            title={t('OPENAPI_SYNC.COLLECTION_STATUS.SECTIONS.MODIFIED', { defaultValue: 'Modified in Collection' })}
            type="modified"
            endpoints={collectionDrift.modified || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-modified"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onOpenEndpoint(endpoint.id)}
                    title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.OPEN_IN_TAB', { defaultValue: 'Open in tab' })}
                    icon={<IconExternalLink size={14} />}
                  >
                    {t('OPENAPI_SYNC.COMMON.OPEN', { defaultValue: 'Open' })}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleResetEndpoint(endpoint)}
                    title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.RESET_TO_SPEC', { defaultValue: 'Reset to spec' })}
                    icon={<IconArrowBackUp size={14} />}
                  >
                    {t('OPENAPI_SYNC.COMMON.RESET', { defaultValue: 'Reset' })}
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleResetAllModified}
                title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.RESET_ALL_MODIFIED_TITLE', {
                  defaultValue: 'Reset all modified endpoints to match the spec'
                })}
                icon={<IconArrowBackUp size={14} />}
              >
                {t('OPENAPI_SYNC.COMMON.RESET_ALL', { defaultValue: 'Reset All' })}
              </Button>
            )}
          />

          <EndpointChangeSection
            title={t('OPENAPI_SYNC.COLLECTION_STATUS.SECTIONS.DELETED', { defaultValue: 'Deleted from Collection' })}
            type="missing"
            endpoints={collectionDrift.missing || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-missing"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleAddMissingEndpoint(endpoint)}
                  title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.RESTORE_TO_COLLECTION', { defaultValue: 'Restore to collection' })}
                  icon={<IconPlus size={14} />}
                >
                  {t('OPENAPI_SYNC.COMMON.RESTORE', { defaultValue: 'Restore' })}
                </Button>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                onClick={handleAddAllMissing}
                title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.RESTORE_ALL_DELETED_TITLE', {
                  defaultValue: 'Add all deleted endpoints back to collection'
                })}
                icon={<IconPlus size={14} />}
              >
                {t('OPENAPI_SYNC.COMMON.RESTORE_ALL', { defaultValue: 'Restore All' })}
              </Button>
            )}
          />

          <EndpointChangeSection
            title={t('OPENAPI_SYNC.COLLECTION_STATUS.SECTIONS.ADDED', { defaultValue: 'Added to Collection' })}
            type="local-only"
            endpoints={collectionDrift.localOnly || []}
            expandableLayout
            collectionUid={collection.uid}
            sectionKey="drift-local-only"
            renderItem={(endpoint, idx) =>
              renderDriftRow(endpoint, idx, (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onOpenEndpoint(endpoint.id)}
                    title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.OPEN_IN_TAB', { defaultValue: 'Open in tab' })}
                    icon={<IconExternalLink size={14} />}
                  >
                    {t('OPENAPI_SYNC.COMMON.OPEN', { defaultValue: 'Open' })}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="danger"
                    onClick={() => handleDeleteEndpoint(endpoint)}
                    title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.DELETE_ENDPOINT', { defaultValue: 'Delete endpoint' })}
                    icon={<IconTrash size={14} />}
                  >
                    {t('OPENAPI_SYNC.COMMON.DELETE', { defaultValue: 'Delete' })}
                  </Button>
                </>
              ))}
            actions={(
              <Button
                size="xs"
                variant="outline"
                color="danger"
                onClick={handleDeleteAllLocalOnly}
                title={t('OPENAPI_SYNC.COLLECTION_STATUS.BUTTONS.DELETE_ALL_LOCAL_TITLE', {
                  defaultValue: 'Delete all locally added endpoints'
                })}
                icon={<IconTrash size={14} />}
              >
                {t('OPENAPI_SYNC.COMMON.DELETE_ALL', { defaultValue: 'Delete All' })}
              </Button>
            )}
          />
        </div>
      ) : isLoading ? (
        <div className="sync-review-empty-state mt-5">
          <IconLoader2 size={40} className="empty-state-icon animate-spin" />
          <h4>{t('OPENAPI_SYNC.COLLECTION_STATUS.CHECKING_UPDATES', { defaultValue: 'Checking for updates' })}</h4>
          <p>{t('OPENAPI_SYNC.COLLECTION_STATUS.CHECKING_UPDATES_DESC', {
            defaultValue: 'Comparing your collection with the last synced spec...'
          })}</p>
        </div>
      ) : !hasStoredSpec ? (
        <div className="sync-review-empty-state mt-5">
          <IconAlertTriangle size={40} className="empty-state-icon" />
          <h4>{lastSyncDate
            ? t('OPENAPI_SYNC.COLLECTION_STATUS.CANNOT_TRACK', { defaultValue: 'Cannot track collection changes' })
            : t('OPENAPI_SYNC.COLLECTION_STATUS.WAITING_FOR_INITIAL_SYNC', { defaultValue: 'Waiting for initial sync' })}
          </h4>
          <p>{lastSyncDate
            ? t('OPENAPI_SYNC.COLLECTION_STATUS.CANNOT_TRACK_DESC', {
              defaultValue: "The last synced spec is missing. Go to the 'Spec Updates' tab to restore it, or sync the collection if updates are available to track future changes."
            })
            : t('OPENAPI_SYNC.COLLECTION_STATUS.WAITING_FOR_INITIAL_SYNC_DESC', {
              defaultValue: 'Once you sync your collection with the spec, local changes will appear here.'
            })}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onTabSelect('spec-updates')}>
            {t('OPENAPI_SYNC.OVERVIEW.GO_TO_SPEC_UPDATES', { defaultValue: 'Go to Spec Updates' })}
          </Button>
        </div>
      ) : (
        <div className="sync-review-empty-state mt-5">
          <IconCheck size={40} className="empty-state-icon" />
          <h4>{t('OPENAPI_SYNC.COLLECTION_STATUS.NO_CHANGES', { defaultValue: 'No changes in collection' })}</h4>
          <p>{t('OPENAPI_SYNC.COLLECTION_STATUS.NO_CHANGES_DESC', {
            defaultValue: 'The collection endpoints match the last synced spec. Nothing to review.'
          })}</p>
        </div>
      )}
      {pendingAction && (
        <Modal size="sm" title={pendingAction.title} hideFooter={true} handleCancel={() => setPendingAction(null)}>
          <div className="action-confirm-modal">
            <p className="confirm-message">{pendingAction.message}</p>
            <div className="confirm-actions">
              <Button variant="ghost" onClick={() => setPendingAction(null)}>
                {t('OPENAPI_SYNC.COMMON.CANCEL', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                color={pendingAction.type.includes('delete') ? 'danger' : 'primary'}
                onClick={confirmPendingAction}
              >
                {t('OPENAPI_SYNC.COMMON.CONFIRM', { defaultValue: 'Confirm' })}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CollectionStatusSection;
