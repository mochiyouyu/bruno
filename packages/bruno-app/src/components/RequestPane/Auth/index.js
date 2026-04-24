import React from 'react';
import get from 'lodash/get';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import DigestAuth from './DigestAuth';
import WsseAuth from './WsseAuth';
import NTLMAuth from './NTLMAuth';
import OAuth1 from './OAuth1';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import ApiKeyAuth from './ApiKeyAuth';
import StyledWrapper from './StyledWrapper';
import OAuth2 from './OAuth2/index';
import { findItemInCollection, findParentItemInCollection } from 'utils/collections/index';

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item?.uid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item?.uid);
  }
  return path;
};

const Auth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  // Create a request object to pass to the auth components
  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  // Save function for request level
  const save = () => {
    return dispatch(saveRequest(item.uid, collection.uid));
  };

  const getEffectiveAuthSource = () => {
    if (authMode !== 'inherit') return null;

    const collectionRoot = collection?.draft?.root || collection?.root || {};
    const collectionAuth = get(collectionRoot, 'request.auth');
    let effectiveSource = {
      type: 'collection',
      name: t('REQUEST_PANE.AUTH_FORM.COLLECTION', { defaultValue: 'Collection' }),
      auth: collectionAuth
    };

    // Check folders in reverse to find the closest auth configuration
    for (let i of [...requestTreePath].reverse()) {
      if (i.type === 'folder') {
        const folderAuth = get(i, 'root.request.auth');
        if (folderAuth && folderAuth.mode && folderAuth.mode !== 'inherit') {
          effectiveSource = {
            type: 'folder',
            name: i.name,
            auth: folderAuth
          };
          break;
        }
      }
    }

    return effectiveSource;
  };

  const getAuthView = () => {
    const authModeLabelMap = {
      inherit: t('REQUEST_PANE.AUTH_FORM.MODES.INHERIT', { defaultValue: 'Inherit' }),
      awsv4: t('REQUEST_PANE.AUTH_FORM.MODES.AWS_V4', { defaultValue: 'AWS Sig V4' }),
      basic: t('REQUEST_PANE.AUTH_FORM.MODES.BASIC', { defaultValue: 'Basic Auth' }),
      bearer: t('REQUEST_PANE.AUTH_FORM.MODES.BEARER', { defaultValue: 'Bearer Token' }),
      digest: t('REQUEST_PANE.AUTH_FORM.MODES.DIGEST', { defaultValue: 'Digest Auth' }),
      ntlm: t('REQUEST_PANE.AUTH_FORM.MODES.NTLM', { defaultValue: 'NTLM' }),
      oauth1: t('REQUEST_PANE.AUTH_FORM.MODES.OAUTH1', { defaultValue: 'OAuth 1.0' }),
      oauth2: t('REQUEST_PANE.AUTH_FORM.MODES.OAUTH2', { defaultValue: 'OAuth 2.0' }),
      wsse: t('REQUEST_PANE.AUTH_FORM.MODES.WSSE', { defaultValue: 'WSSE Auth' }),
      apikey: t('REQUEST_PANE.AUTH_FORM.MODES.API_KEY', { defaultValue: 'API Key' })
    };

    switch (authMode) {
      case 'none': {
        return <div className="mt-2">{t('REQUEST_PANE.AUTH_FORM.NO_AUTH', { defaultValue: 'No Auth' })}</div>;
      }
      case 'awsv4': {
        return <AwsV4Auth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'digest': {
        return <DigestAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'ntlm': {
        return <NTLMAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'oauth1': {
        return <OAuth1 collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'oauth2': {
        return <OAuth2 collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'wsse': {
        return <WsseAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'apikey': {
        return <ApiKeyAuth collection={collection} item={item} request={request} save={save} updateAuth={updateAuth} />;
      }
      case 'inherit': {
        const source = getEffectiveAuthSource();
        return (
          <>
            <div className="flex flex-row w-full gap-2">
              <div>
                {t('REQUEST_PANE.AUTH_FORM.INHERITED_FROM', {
                  defaultValue: 'Auth inherited from {{name}}:',
                  name: source.name
                })}
              </div>
              <div className="inherit-mode-text">
                {authModeLabelMap[source.auth?.mode] || t('REQUEST_PANE.AUTH_FORM.NO_AUTH', { defaultValue: 'No Auth' })}
              </div>
            </div>
          </>
        );
      }
    }
  };

  return (
    <StyledWrapper className="w-full overflow-auto">
      {getAuthView()}
    </StyledWrapper>
  );
};

export default Auth;
