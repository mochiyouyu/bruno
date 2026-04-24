import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconCheck,
  IconX,
  IconArrowRight,
  IconArrowsDiff,
  IconInfoCircle,
  IconLoader2
} from '@tabler/icons';
import Button from 'ui/Button';
import StatusBadge from 'ui/StatusBadge';
import EndpointChangeSection from '../EndpointChangeSection';
import ExpandableEndpointRow from '../EndpointChangeSection/ExpandableEndpointRow';
import ConfirmSyncModal from '../ConfirmSyncModal';
import SpecDiffModal from '../SpecDiffModal';
import Help from 'components/Help';
import { setReviewDecision, setReviewDecisions, selectTabUiState } from 'providers/ReduxStore/slices/openapi-sync';
import { useTranslation } from 'react-i18next';

const categorizeEndpoints = (remoteDrift, specDrift, collectionDrift) => {
  const specAddedIds = new Set((specDrift?.added || []).map((ep) => ep.id));
  const specAddedEndpoints = (remoteDrift.missing || []).filter((ep) => specAddedIds.has(ep.id));

  const specRemovedIds = new Set((specDrift?.removed || []).map((ep) => ep.id));
  const specRemovedEndpoints = (remoteDrift.localOnly || []).filter((ep) => specRemovedIds.has(ep.id));

  const specModifiedIds = new Set((specDrift?.modified || []).map((ep) => ep.id));
  const localModifiedIds = new Set((collectionDrift?.modified || []).map((ep) => ep.id));
  const noMergeBase = collectionDrift?.noStoredSpec;

  const specUpdatedEndpoints = [];
  const localUpdatedEndpoints = [];

  (remoteDrift.modified || []).forEach((ep) => {
    const specChanged = !noMergeBase && specModifiedIds.has(ep.id);
    const localChanged = !noMergeBase && localModifiedIds.has(ep.id);

    if (!specChanged && localChanged) {
      localUpdatedEndpoints.push({
        ...ep,
        source: 'collection-drift',
        localAction: 'modified'
      });
    } else {
      specUpdatedEndpoints.push({
        ...ep,
        source: 'spec-modified',
        specAction: 'modified',
        ...(specChanged && localChanged && { conflict: true, localAction: 'modified' })
      });
    }
  });

  return { specAddedEndpoints, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints };
};

const SyncReviewPage = ({
  specDrift,
  remoteDrift,
  collectionDrift,
  collectionPath,
  collectionUid,
  newSpec,
  isSyncing,
  isLoading,
  onApplySync
}) => {
  const dispatch = useDispatch();
  const tabUiState = useSelector(selectTabUiState(collectionUid));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSpecDiffModal, setShowSpecDiffModal] = useState(false);
  const { t } = useTranslation();

  const { specAddedEndpoints, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints } = useMemo(() => {
    if (!remoteDrift) {
      return { specAddedEndpoints: [], specUpdatedEndpoints: [], localUpdatedEndpoints: [], specRemovedEndpoints: [] };
    }
    return categorizeEndpoints(remoteDrift, specDrift, collectionDrift);
  }, [specDrift, remoteDrift, collectionDrift]);

  const conflictCount = specUpdatedEndpoints.filter((ep) => ep.conflict).length;
  const savedDecisions = tabUiState.reviewDecisions || {};

  const decisions = useMemo(() => {
    const merged = { ...savedDecisions };
    specUpdatedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = ep.conflict ? null : 'accept-incoming';
    });
    localUpdatedEndpoints.forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = 'keep-mine';
    });
    [...specAddedEndpoints, ...specRemovedEndpoints].forEach((ep) => {
      if (!(ep.id in merged)) merged[ep.id] = 'accept-incoming';
    });
    return merged;
  }, [savedDecisions, specUpdatedEndpoints, localUpdatedEndpoints, specRemovedEndpoints, specAddedEndpoints]);

  useEffect(() => {
    const hasNewDefaults = Object.keys(decisions).some((id) => !(id in savedDecisions));
    if (hasNewDefaults) {
      dispatch(setReviewDecisions({ collectionUid, decisions }));
    }
  }, [decisions, savedDecisions, collectionUid, dispatch]);

  const handleDecisionChange = (endpointId, decision) => {
    dispatch(setReviewDecision({ collectionUid, endpointId, decision }));
  };

  const decidableEndpoints = useMemo(() => {
    return [...specUpdatedEndpoints, ...specAddedEndpoints, ...specRemovedEndpoints];
  }, [specUpdatedEndpoints, specAddedEndpoints, specRemovedEndpoints]);

  const setBulkDecision = (decision) => {
    const newDecisions = {};
    decidableEndpoints.forEach((ep) => {
      newDecisions[ep.id] = decision;
    });
    dispatch(setReviewDecisions({ collectionUid, decisions: newDecisions }));
  };

  const allAccepted = decidableEndpoints.length > 0
    && decidableEndpoints.every((ep) => decisions[ep.id] === 'accept-incoming');
  const allSkipped = decidableEndpoints.length > 0
    && decidableEndpoints.every((ep) => decisions[ep.id] === 'keep-mine');

  const unresolvedConflicts = specUpdatedEndpoints.filter((ep) => ep.conflict && !decisions[ep.id]).length;

  const confirmGroups = useMemo(() => {
    const groups = [];
    const addGroup = (label, type, endpoints) => {
      if (endpoints.length > 0) groups.push({ label, type, endpoints });
    };

    const isAccepted = (ep) => decisions[ep.id] === 'accept-incoming';
    const isSkipped = (ep) => decisions[ep.id] === 'keep-mine';

    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.NEW_ENDPOINTS_TO_ADD', { defaultValue: 'New endpoints to add' }), 'add', specAddedEndpoints.filter(isAccepted));
    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.ENDPOINTS_TO_UPDATE', { defaultValue: 'Endpoints to update' }), 'update', specUpdatedEndpoints.filter(isAccepted));
    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.ENDPOINTS_TO_DELETE', { defaultValue: 'Endpoints to delete' }), 'remove', specRemovedEndpoints.filter(isAccepted));

    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.KEEPING_LOCAL_VERSION', { defaultValue: 'Keeping local version' }), 'keep', specUpdatedEndpoints.filter((ep) => ep.conflict && isSkipped(ep)));
    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.RETAINING_REMOVED_ENDPOINTS', { defaultValue: 'Retaining removed endpoints' }), 'keep', specRemovedEndpoints.filter(isSkipped));
    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.SKIPPED_NEW_ENDPOINTS', { defaultValue: 'Skipped new endpoints' }), 'keep', specAddedEndpoints.filter(isSkipped));
    addGroup(t('OPENAPI_SYNC.REVIEW.CONFIRM.KEEPING_CURRENT_VERSION', { defaultValue: 'Keeping current version (skipped updates)' }), 'keep', specUpdatedEndpoints.filter((ep) => !ep.conflict && isSkipped(ep)));

    return groups;
  }, [decisions, specAddedEndpoints, specRemovedEndpoints, specUpdatedEndpoints, t]);

  const handleConfirmApply = () => {
    setShowConfirmation(false);

    const filteredAddedEndpoints = specAddedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming');
    const filteredSpecChanges = specUpdatedEndpoints.filter((ep) => !ep.conflict && decisions[ep.id] === 'accept-incoming');
    const localOnlyIds = specRemovedEndpoints
      .filter((ep) => decisions[ep.id] === 'accept-incoming')
      .map((ep) => ep.id);

    onApplySync({
      endpointDecisions: decisions,
      localOnlyIds,
      newToCollection: filteredAddedEndpoints,
      specUpdates: filteredSpecChanges,
      resolvedConflicts: specUpdatedEndpoints.filter((ep) => ep.conflict && decisions[ep.id] === 'accept-incoming'),
      localChangesToReset: localUpdatedEndpoints.filter((ep) => decisions[ep.id] === 'accept-incoming')
    });
  };

  const totalChanges = specAddedEndpoints.length + specUpdatedEndpoints.length + localUpdatedEndpoints.length + specRemovedEndpoints.length;
  const hasRemoteUpdates = specAddedEndpoints.length + specUpdatedEndpoints.length + specRemovedEndpoints.length > 0;

  const buttonLabel = unresolvedConflicts > 0
    ? t('OPENAPI_SYNC.REVIEW.BUTTON.RESOLVE_CONFLICTS', {
        defaultValue: 'Resolve {{count}} conflict{{suffix}}',
        count: unresolvedConflicts,
        suffix: unresolvedConflicts !== 1 ? 's and sync' : ' and sync'
      })
    : !hasRemoteUpdates && specDrift?.storedSpecMissing
        ? t('OPENAPI_SYNC.SPEC_STATUS.RESTORE_SPEC_FILE', { defaultValue: 'Restore Spec File' })
        : t('OPENAPI_SYNC.REVIEW.BUTTON.SYNC_COLLECTION', { defaultValue: 'Sync Collection' });

  return (
    <div className="sync-review-page sync-mode">
      {hasRemoteUpdates && (
        <div className="sync-review-header">
          <div className="title-row">
            <div className="title-left">
              <h3 className="review-title">{t('OPENAPI_SYNC.REVIEW.TITLE', { defaultValue: 'Review Changes' })}</h3>
              {totalChanges > 0 && (
                <p className="review-subtitle">
                  {t('OPENAPI_SYNC.REVIEW.SUBTITLE', { defaultValue: 'Choose to keep the current version or accept the updated one.' })}
                </p>
              )}
            </div>
            {(specDrift?.unifiedDiff || decidableEndpoints.length > 0) && (
              <div className="bulk-actions">
                {specDrift?.unifiedDiff && (
                  <button className="bulk-btn" onClick={() => setShowSpecDiffModal(true)}>
                    <IconArrowsDiff size={12} /> {t('OPENAPI_SYNC.REVIEW.VIEW_SPEC_DIFF', { defaultValue: 'View Spec Diff' })}
                  </button>
                )}
                {decidableEndpoints.length > 0 && (
                  <>
                    <button
                      className={`bulk-btn ${allSkipped ? 'active' : ''}`}
                      onClick={() => setBulkDecision('keep-mine')}
                    >
                      <IconX size={12} /> {t('OPENAPI_SYNC.REVIEW.SKIP_ALL', { defaultValue: 'Skip All' })}
                    </button>
                    <button
                      className={`bulk-btn ${allAccepted ? 'active' : ''}`}
                      onClick={() => setBulkDecision('accept-incoming')}
                    >
                      <IconCheck size={12} /> {t('OPENAPI_SYNC.REVIEW.ACCEPT_ALL', { defaultValue: 'Accept All' })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sync-review-body">
        {!hasRemoteUpdates ? (
          <div className="sync-review-empty-state">
            {isLoading ? (
              <>
                <IconLoader2 size={40} className="empty-state-icon animate-spin" />
                <h4>{t('OPENAPI_SYNC.REVIEW.CHECKING_UPDATES', { defaultValue: 'Checking for updates' })}</h4>
                <p>{t('OPENAPI_SYNC.REVIEW.CHECKING_UPDATES_DESC', { defaultValue: 'Comparing your last synced spec with the latest spec...' })}</p>
              </>
            ) : (
              <>
                <IconCheck size={40} className="empty-state-icon" />
                <h4>{t('OPENAPI_SYNC.SPEC_STATUS.NO_UPDATES', { defaultValue: 'No updates from the spec' })}</h4>
                <p>{t('OPENAPI_SYNC.REVIEW.NO_UPDATES_DESC', { defaultValue: 'The spec endpoints have not been updated since the last sync.' })}</p>
              </>
            )}
          </div>
        ) : (
          <div className="endpoints-review-sections">
            {decidableEndpoints.length > 0 && (
              <div className="review-group">
                <EndpointChangeSection
                  title={t('OPENAPI_SYNC.REVIEW.SECTIONS.UPDATED_IN_SPEC', { defaultValue: 'Updated in Spec' })}
                  type="spec-modified"
                  endpoints={specUpdatedEndpoints}
                  defaultExpanded={true}
                  expandableLayout
                  subtitle={t('OPENAPI_SYNC.REVIEW.SECTIONS.UPDATED_IN_SPEC_DESC', { defaultValue: 'The spec has updates for these endpoints' })}
                  headerExtra={conflictCount > 0 ? (
                    <StatusBadge
                      status="danger"
                      rightSection={(
                        <Help icon="info" size={11} placement="top" width={250}>
                          {t('OPENAPI_SYNC.REVIEW.CONFLICT_HELP', {
                            defaultValue: 'This section has {{count}} endpoint{{plural}} modified in both the spec and your collection. Expand to review and resolve.',
                            count: conflictCount,
                            plural: conflictCount === 1 ? '' : 's'
                          })}
                        </Help>
                      )}
                    >
                      {conflictCount} {t(conflictCount === 1 ? 'OPENAPI_SYNC.REVIEW.CONFLICT' : 'OPENAPI_SYNC.REVIEW.CONFLICTS', {
                        defaultValue: conflictCount === 1 ? 'Conflict' : 'Conflicts'
                      })}
                    </StatusBadge>
                  ) : null}
                  collectionUid={collectionUid}
                  sectionKey="review-spec-modified"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{
                        keep: t('OPENAPI_SYNC.REVIEW.DECISIONS.KEEP_CURRENT', { defaultValue: 'Keep Current' }),
                        accept: t('OPENAPI_SYNC.REVIEW.DECISIONS.UPDATE', { defaultValue: 'Update' })
                      }}
                      collectionUid={collectionUid}
                    />
                  )}
                />

                <EndpointChangeSection
                  title={t('OPENAPI_SYNC.REVIEW.SECTIONS.NEW_IN_SPEC', { defaultValue: 'New in Spec' })}
                  type="added"
                  endpoints={specAddedEndpoints}
                  defaultExpanded={true}
                  expandableLayout
                  subtitle={t('OPENAPI_SYNC.REVIEW.SECTIONS.NEW_IN_SPEC_DESC', { defaultValue: 'New endpoints from the spec' })}
                  collectionUid={collectionUid}
                  sectionKey="review-added"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{
                        keep: t('OPENAPI_SYNC.REVIEW.DECISIONS.SKIP', { defaultValue: 'Skip' }),
                        accept: t('OPENAPI_SYNC.REVIEW.DECISIONS.ADD', { defaultValue: 'Add' })
                      }}
                      collectionUid={collectionUid}
                    />
                  )}
                />

                <EndpointChangeSection
                  title={t('OPENAPI_SYNC.REVIEW.SECTIONS.REMOVED_FROM_SPEC', { defaultValue: 'Removed from Spec' })}
                  type="removed"
                  endpoints={specRemovedEndpoints}
                  defaultExpanded={true}
                  expandableLayout
                  subtitle={t('OPENAPI_SYNC.REVIEW.SECTIONS.REMOVED_FROM_SPEC_DESC', { defaultValue: 'These endpoints are in your collection but not in the spec' })}
                  collectionUid={collectionUid}
                  sectionKey="review-removed"
                  renderItem={(endpoint, idx) => (
                    <ExpandableEndpointRow
                      key={endpoint.id || idx}
                      endpoint={endpoint}
                      decision={decisions?.[endpoint.id]}
                      onDecisionChange={(decision) => handleDecisionChange(endpoint.id, decision)}
                      collectionPath={collectionPath}
                      newSpec={newSpec}
                      showDecisions={true}
                      decisionLabels={{
                        keep: t('OPENAPI_SYNC.REVIEW.DECISIONS.KEEP', { defaultValue: 'Keep' }),
                        accept: t('OPENAPI_SYNC.REVIEW.DECISIONS.DELETE', { defaultValue: 'Delete' })
                      }}
                      collectionUid={collectionUid}
                    />
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {hasRemoteUpdates && (
        <div className="sync-info-notice mt-4">
          <IconInfoCircle size={14} className="sync-info-icon" />
          <span>
            <span className="whats-updated-title">{t('OPENAPI_SYNC.REVIEW.WHAT_GETS_UPDATED', { defaultValue: 'What gets updated:' })}</span>{' '}
            {t('OPENAPI_SYNC.REVIEW.WHAT_GETS_UPDATED_DESC', { defaultValue: 'Parameters, headers, body and auth will be updated. Tests, scripts, and assertions are always preserved.' })}
          </span>
        </div>
      )}

      {hasRemoteUpdates && (
        <div className="sync-review-bottom-bar mt-4">
          <div className="bar-stats">
            {totalChanges === 0 && (
              <span className="stats-prefix">
                {specDrift?.storedSpecMissing
                  ? t('OPENAPI_SYNC.REVIEW.SYNC_WILL_UPDATE_SPEC_FILE', { defaultValue: 'Sync will update the spec file' })
                  : t('OPENAPI_SYNC.REVIEW.NO_ENDPOINT_CHANGES', { defaultValue: 'No endpoint changes to apply' })}
              </span>
            )}
          </div>
          <div className="bar-actions">
            <Button
              onClick={totalChanges === 0 ? handleConfirmApply : () => setShowConfirmation(true)}
              disabled={unresolvedConflicts > 0 || isSyncing}
              loading={isSyncing}
            >
              {buttonLabel}
              {unresolvedConflicts === 0 && <IconArrowRight size={14} style={{ marginLeft: 4 }} />}
            </Button>
          </div>
        </div>
      )}

      {showConfirmation && (
        <ConfirmSyncModal
          groups={confirmGroups}
          onCancel={() => setShowConfirmation(false)}
          onSync={handleConfirmApply}
          isSyncing={isSyncing}
        />
      )}

      {showSpecDiffModal && (
        <SpecDiffModal
          specDrift={specDrift}
          onClose={() => setShowSpecDiffModal(false)}
        />
      )}
    </div>
  );
};

export default SyncReviewPage;
