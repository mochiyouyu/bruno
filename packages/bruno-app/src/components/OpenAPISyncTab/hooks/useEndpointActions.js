import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const useEndpointActions = (collection, collectionDrift, reloadDrift) => {
  const [pendingAction, setPendingAction] = useState(null);
  const { t } = useTranslation();

  // Action execution helper — runs IPC call(s), shows toast, reloads drift
  const executeEndpointAction = async (ipcCalls, successMsg, errorMsg) => {
    try {
      const { ipcRenderer } = window;
      if (Array.isArray(ipcCalls[0])) {
        await Promise.all(ipcCalls.map(([channel, params]) => ipcRenderer.invoke(channel, params)));
      } else {
        const [channel, params] = ipcCalls;
        await ipcRenderer.invoke(channel, params);
      }
      toast.success(successMsg);
      await reloadDrift();
    } catch (err) {
      console.error(`Error: ${errorMsg}`, err);
      toast.error(errorMsg);
    }
  };

  // Confirmation handlers — show modal before executing
  const handleResetEndpoint = (endpoint) => {
    setPendingAction({
      type: 'reset-endpoint',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESET_ENDPOINT_TITLE', { defaultValue: 'Reset Endpoint' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESET_ENDPOINT_MESSAGE', {
        defaultValue: 'Are you sure you want to reset "{{endpoint}}" to match the spec? Your local changes will be lost.',
        endpoint: `${endpoint.method} ${endpoint.path}`
      }),
      endpoint
    });
  };

  const handleResetAllModified = () => {
    if (!collectionDrift?.modified?.length) return;
    setPendingAction({
      type: 'reset-all-modified',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESET_ALL_MODIFIED_TITLE', { defaultValue: 'Reset All Modified' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESET_ALL_MODIFIED_MESSAGE', {
        defaultValue: 'Are you sure you want to reset {{count}} modified endpoint(s) to match the spec? Your local changes will be lost.',
        count: collectionDrift.modified.length
      })
    });
  };

  const handleDeleteEndpoint = (endpoint) => {
    setPendingAction({
      type: 'delete-endpoint',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.DELETE_ENDPOINT_TITLE', { defaultValue: 'Delete Endpoint' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.DELETE_ENDPOINT_MESSAGE', {
        defaultValue: 'Are you sure you want to delete "{{endpoint}}"? This action cannot be undone.',
        endpoint: `${endpoint.method} ${endpoint.path}`
      }),
      endpoint
    });
  };

  const handleDeleteAllLocalOnly = () => {
    if (!collectionDrift?.localOnly?.length) return;
    setPendingAction({
      type: 'delete-all-local',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.DELETE_ALL_LOCAL_TITLE', { defaultValue: 'Delete All Local Endpoints' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.DELETE_ALL_LOCAL_MESSAGE', {
        defaultValue: 'Are you sure you want to delete {{count}} local-only endpoint(s)? This action cannot be undone.',
        count: collectionDrift.localOnly.length
      })
    });
  };

  const handleRevertAllChanges = () => {
    const modifiedCount = collectionDrift?.modified?.length || 0;
    const missingCount = collectionDrift?.missing?.length || 0;
    const localOnlyCount = collectionDrift?.localOnly?.length || 0;

    setPendingAction({
      type: 'revert-all',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.REVERT_ALL_TITLE', { defaultValue: 'Revert All Changes' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.REVERT_ALL_MESSAGE', {
        defaultValue: 'Are you sure you want to revert all changes? This will reset {{modifiedCount}} modified, restore {{missingCount}} missing, and delete {{localOnlyCount}} local-only endpoint(s).',
        modifiedCount,
        missingCount,
        localOnlyCount
      })
    });
  };

  const handleAddMissingEndpoint = (endpoint) => {
    setPendingAction({
      type: 'restore-endpoint',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESTORE_ENDPOINT_TITLE', { defaultValue: 'Restore Endpoint' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESTORE_ENDPOINT_MESSAGE', {
        defaultValue: 'Are you sure you want to restore "{{endpoint}}" to your collection?',
        endpoint: `${endpoint.method} ${endpoint.path}`
      }),
      endpoint
    });
  };

  const handleAddAllMissing = () => {
    if (!collectionDrift?.missing?.length) return;
    setPendingAction({
      type: 'restore-all-missing',
      title: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESTORE_ALL_MISSING_TITLE', { defaultValue: 'Restore All Missing' }),
      message: t('OPENAPI_SYNC.COLLECTION_STATUS.ACTIONS.RESTORE_ALL_MISSING_MESSAGE', {
        defaultValue: 'Are you sure you want to restore {{count}} missing endpoint(s) to your collection?',
        count: collectionDrift.missing.length
      })
    });
  };

  // Execute confirmed action
  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { type, endpoint } = pendingAction;
    setPendingAction(null);

    switch (type) {
      case 'reset-endpoint':
        return executeEndpointAction(
          ['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: [endpoint] }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.RESET_ENDPOINT_SUCCESS', {
            defaultValue: 'Reset {{endpoint}} to spec',
            endpoint: `${endpoint.method} ${endpoint.path}`
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.RESET_ENDPOINT_FAILED', { defaultValue: 'Failed to reset endpoint' })
        );
      case 'reset-all-modified':
        return executeEndpointAction(
          ['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: collectionDrift.modified }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.RESET_ENDPOINTS_SUCCESS', {
            defaultValue: 'Reset {{count}} endpoints to spec',
            count: collectionDrift.modified.length
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.RESET_ENDPOINTS_FAILED', { defaultValue: 'Failed to reset endpoints' })
        );
      case 'delete-endpoint':
        return executeEndpointAction(
          ['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: [endpoint] }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.DELETE_ENDPOINT_SUCCESS', {
            defaultValue: 'Deleted {{endpoint}}',
            endpoint: `${endpoint.method} ${endpoint.path}`
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.DELETE_ENDPOINT_FAILED', { defaultValue: 'Failed to delete endpoint' })
        );
      case 'delete-all-local':
        return executeEndpointAction(
          ['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: collectionDrift.localOnly }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.DELETE_LOCAL_ONLY_SUCCESS', {
            defaultValue: 'Deleted {{count}} local-only endpoints',
            count: collectionDrift.localOnly.length
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.DELETE_ENDPOINTS_FAILED', { defaultValue: 'Failed to delete endpoints' })
        );
      case 'revert-all': {
        const calls = [];
        if (collectionDrift?.modified?.length > 0) {
          calls.push(['renderer:reset-endpoints-to-spec', { collectionPath: collection.pathname, endpoints: collectionDrift.modified }]);
        }
        if (collectionDrift?.missing?.length > 0) {
          calls.push(['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: collectionDrift.missing }]);
        }
        if (collectionDrift?.localOnly?.length > 0) {
          calls.push(['renderer:delete-endpoints', { collectionPath: collection.pathname, collectionUid: collection.uid, endpoints: collectionDrift.localOnly }]);
        }
        return executeEndpointAction(
          calls,
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.REVERT_ALL_SUCCESS', { defaultValue: 'All changes discarded successfully' }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.REVERT_ALL_FAILED', { defaultValue: 'Failed to discard changes' })
        );
      }
      case 'restore-endpoint':
        return executeEndpointAction(
          ['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: [endpoint] }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.RESTORE_ENDPOINT_SUCCESS', {
            defaultValue: 'Added {{endpoint}} to collection',
            endpoint: `${endpoint.method} ${endpoint.path}`
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.RESTORE_ENDPOINT_FAILED', { defaultValue: 'Failed to add endpoint' })
        );
      case 'restore-all-missing':
        return executeEndpointAction(
          ['renderer:add-missing-endpoints', { collectionPath: collection.pathname, endpoints: collectionDrift.missing }],
          t('OPENAPI_SYNC.COLLECTION_STATUS.TOAST.RESTORE_ENDPOINTS_SUCCESS', {
            defaultValue: 'Added {{count}} endpoints to collection',
            count: collectionDrift.missing.length
          }),
          t('OPENAPI_SYNC.COLLECTION_STATUS.ERRORS.RESTORE_ENDPOINTS_FAILED', { defaultValue: 'Failed to add endpoints' })
        );
    }
  };

  return {
    pendingAction, setPendingAction,
    confirmPendingAction,
    handleResetEndpoint,
    handleResetAllModified,
    handleDeleteEndpoint,
    handleDeleteAllLocalOnly,
    handleRevertAllChanges,
    handleAddMissingEndpoint,
    handleAddAllMissing
  };
};

export default useEndpointActions;
