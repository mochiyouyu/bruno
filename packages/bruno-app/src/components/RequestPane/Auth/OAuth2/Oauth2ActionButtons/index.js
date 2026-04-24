import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { cloneDeep, find, get } from 'lodash';
import { IconLoader2, IconX } from '@tabler/icons';
import { interpolate } from '@usebruno/common';
import { fetchOauth2Credentials, clearOauth2Cache, refreshOauth2Credentials, cancelOauth2AuthorizationRequest, isOauth2AuthorizationRequestInProgress } from 'providers/ReduxStore/slices/collections/actions';
import { getAllVariables } from 'utils/collections/index';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const Oauth2ActionButtons = ({ item, request, collection, url: accessTokenUrl, credentialsId }) => {
  const { uid: collectionUid } = collection;

  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const { t } = useTranslation();
  const [fetchingToken, toggleFetchingToken] = useState(false);
  const [refreshingToken, toggleRefreshingToken] = useState(false);
  const [fetchingAuthorizationCode, toggleFetchingAuthorizationCode] = useState(false);

  const useSystemBrowser = get(preferences, 'request.oauth2.useSystemBrowser', false);

  // Check for pending authorization when component mounts or when fetching starts
  useEffect(() => {
    if (useSystemBrowser && fetchingToken) {
      const getRequestStatus = async () => {
        try {
          toggleFetchingAuthorizationCode(await dispatch(isOauth2AuthorizationRequestInProgress()));
        } catch (err) {
          console.error('Error checking pending authorization:', err);
        }
      };
      getRequestStatus();
    }
  }, [useSystemBrowser, fetchingToken, dispatch]);

  const interpolatedAccessTokenUrl = useMemo(() => {
    const variables = getAllVariables(collection, item);
    return interpolate(accessTokenUrl, variables);
  }, [collection, item, accessTokenUrl]);

  const credentialsData = find(collection?.oauth2Credentials, (creds) => creds?.url == interpolatedAccessTokenUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);
  const creds = credentialsData?.credentials || {};

  const handleFetchOauth2Credentials = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleFetchingToken(true);
    try {
      const result = await dispatch(fetchOauth2Credentials({
        itemUid: item.uid,
        request: requestCopy,
        collection,
        forceGetToken: true
      }));

      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || t('OAUTH.OAUTH2.ACTIONS.NO_ACCESS_TOKEN', { defaultValue: 'No access token received from authorization server' });
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success(t('OAUTH.OAUTH2.ACTIONS.TOKEN_FETCHED', { defaultValue: 'Token fetched successfully!' }));
    } catch (error) {
      console.error('could not fetch the token!');
      console.error(error);
      // Don't show error toast for user cancellation
      if (error?.message && error.message.includes('cancelled by user')) {
        return;
      }
      toast.error(error?.message || t('OAUTH.OAUTH2.ACTIONS.FETCH_TOKEN_FAILED', { defaultValue: 'An error occurred while fetching token!' }));
    } finally {
      toggleFetchingToken(false);
      toggleFetchingAuthorizationCode(false);
    }
  };

  const handleRefreshAccessToken = async () => {
    let requestCopy = cloneDeep(request);
    requestCopy.oauth2 = requestCopy?.auth.oauth2;
    requestCopy.headers = {};
    toggleRefreshingToken(true);
    try {
      const result = await dispatch(refreshOauth2Credentials({
        itemUid: item.uid,
        request: requestCopy,
        collection,
        forceGetToken: true
      }));

      toggleRefreshingToken(false);

      // Check if the result contains error or if access_token is missing
      if (!result || !result.access_token) {
        const errorMessage = result?.error || t('OAUTH.OAUTH2.ACTIONS.NO_ACCESS_TOKEN', { defaultValue: 'No access token received from authorization server' });
        console.error(errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success(t('OAUTH.OAUTH2.ACTIONS.TOKEN_REFRESHED', { defaultValue: 'Token refreshed successfully!' }));
    } catch (error) {
      console.error(error);
      toggleRefreshingToken(false);
      toast.error(error?.message || t('OAUTH.OAUTH2.ACTIONS.REFRESH_TOKEN_FAILED', { defaultValue: 'An error occurred while refreshing token!' }));
    }
  };

  const handleClearCache = (e) => {
    dispatch(clearOauth2Cache({ collectionUid: collection?.uid, url: interpolatedAccessTokenUrl, credentialsId }))
      .then(() => {
        toast.success(t('OAUTH.OAUTH2.ACTIONS.CACHE_CLEARED', { defaultValue: 'Cleared cache successfully' }));
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const handleCancelAuthorization = async () => {
    try {
      const result = await dispatch(cancelOauth2AuthorizationRequest());
      if (result.success && result.cancelled) {
        toast.error(t('OAUTH.OAUTH2.ACTIONS.AUTHORIZATION_CANCELLED', { defaultValue: 'Authorization cancelled' }));
        toggleFetchingToken(false);
        toggleFetchingAuthorizationCode(false);
      }
    } catch (err) {
      console.error('Error cancelling authorization:', err);
      toast.error(t('OAUTH.OAUTH2.ACTIONS.CANCEL_AUTHORIZATION_FAILED', { defaultValue: 'Failed to cancel authorization' }));
    }
  };

  return (
    <div className="flex flex-row gap-2 mt-4">
      <Button
        size="sm"
        color="secondary"
        onClick={handleFetchOauth2Credentials}
        disabled={fetchingToken || refreshingToken}
        loading={fetchingToken}
      >
        {t('OAUTH.OAUTH2.ACTIONS.GET_ACCESS_TOKEN', { defaultValue: 'Get Access Token' })}
      </Button>
      {creds?.refresh_token
        ? (
            <Button
              size="sm"
              color="secondary"
              onClick={handleRefreshAccessToken}
              disabled={fetchingToken || refreshingToken}
              loading={refreshingToken}
            >
              {t('OAUTH.OAUTH2.ACTIONS.REFRESH_TOKEN', { defaultValue: 'Refresh Token' })}
            </Button>
          )
        : null}
      {useSystemBrowser && fetchingAuthorizationCode
        ? (
            <Button
              size="sm"
              color="secondary"
              onClick={handleCancelAuthorization}
              icon={<IconX size={16} />}
              iconPosition="left"
            >
              {t('OAUTH.OAUTH2.ACTIONS.CANCEL_AUTHORIZATION', { defaultValue: 'Cancel Authorization' })}
            </Button>
          ) : null}
      <Button
        size="sm"
        color="secondary"
        variant="ghost"
        onClick={handleClearCache}
      >
        {t('OAUTH.OAUTH2.ACTIONS.CLEAR_CACHE', { defaultValue: 'Clear Cache' })}
      </Button>
    </div>
  );
};

export default Oauth2ActionButtons;
