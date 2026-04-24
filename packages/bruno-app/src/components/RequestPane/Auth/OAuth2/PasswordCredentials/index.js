import React from 'react';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { IconCaretDown, IconSettings, IconKey, IconAdjustmentsHorizontal, IconHelp } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { inputsConfig } from './inputsConfig';
import MenuDropdown from 'ui/MenuDropdown';
import Oauth2TokenViewer from '../Oauth2TokenViewer/index';
import Oauth2ActionButtons from '../Oauth2ActionButtons/index';
import AdditionalParams from '../AdditionalParams/index';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning/index';
import { useTranslation } from 'react-i18next';

const OAuth2PasswordCredentials = ({ save, item = {}, request, handleRun, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const oAuth = get(request, 'auth.oauth2', {});
  const { isSensitive } = useDetectSensitiveField(collection);
  const { t } = useTranslation();

  const {
    accessTokenUrl,
    username,
    password,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement,
    credentialsId,
    tokenPlacement,
    tokenHeaderPrefix,
    tokenQueryKey,
    refreshTokenUrl,
    autoRefreshToken,
    autoFetchToken,
    tokenSource,
    additionalParameters
  } = oAuth;

  const refreshTokenUrlAvailable = refreshTokenUrl?.trim() !== '';
  const isAutoRefreshDisabled = !refreshTokenUrlAvailable;

  const handleSave = () => { save(); };

  const handleChange = (key, value) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'password',
          accessTokenUrl,
          username,
          password,
          clientId,
          clientSecret,
          scope,
          credentialsPlacement,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          refreshTokenUrl,
          autoRefreshToken,
          autoFetchToken,
          tokenSource,
          additionalParameters,
          [key]: value
        }
      })
    );
  };

  return (
    <StyledWrapper className="mt-2 flex w-full gap-4 flex-col">
      <Oauth2TokenViewer handleRun={handleRun} collection={collection} item={item} url={accessTokenUrl} credentialsId={credentialsId} />
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSettings size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          {t('OAUTH.COMMON.CONFIGURATION', { defaultValue: 'Configuration' })}
        </span>
      </div>
      {inputsConfig.map((input) => {
        const { key, label, labelKey, isSecret } = input;
        const value = oAuth[key] || '';
        const { showWarning, warningMessage } = isSensitive(value);

        return (
          <div className="flex items-center gap-4 w-full" key={`input-${key}`}>
            <label className="block min-w-[140px]">{t(labelKey, { defaultValue: label })}</label>
            <div className="single-line-editor-wrapper flex-1 flex items-center">
              <SingleLineEditor
                value={value}
                theme={storedTheme}
                onSave={handleSave}
                onChange={(val) => handleChange(key, val)}
                onRun={handleRun}
                collection={collection}
                item={item}
                isSecret={isSecret}
                isCompact
              />
              {isSecret && showWarning && <SensitiveFieldWarning fieldName={key} warningMessage={warningMessage} />}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 w-full" key="input-credentials-placement">
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.ADD_CREDENTIALS_TO', { defaultValue: 'Add Credentials to' })}</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={[
              { id: 'body', label: t('OAUTH.COMMON.REQUEST_BODY', { defaultValue: 'Request Body' }), onClick: () => handleChange('credentialsPlacement', 'body') },
              { id: 'basic_auth_header', label: t('OAUTH.COMMON.BASIC_AUTH_HEADER', { defaultValue: 'Basic Auth Header' }), onClick: () => handleChange('credentialsPlacement', 'basic_auth_header') }
            ]}
            selectedItemId={credentialsPlacement}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {credentialsPlacement == 'body'
                ? t('OAUTH.COMMON.REQUEST_BODY', { defaultValue: 'Request Body' })
                : t('OAUTH.COMMON.BASIC_AUTH_HEADER', { defaultValue: 'Basic Auth Header' })}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          {t('OAUTH.COMMON.TOKEN', { defaultValue: 'Token' })}
        </span>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-token-type">
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.TOKEN_SOURCE', { defaultValue: 'Token Source' })}</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={[
              { id: 'access_token', label: t('OAUTH.COMMON.ACCESS_TOKEN', { defaultValue: 'Access Token' }), onClick: () => handleChange('tokenSource', 'access_token') },
              { id: 'id_token', label: t('OAUTH.COMMON.ID_TOKEN', { defaultValue: 'ID Token' }), onClick: () => handleChange('tokenSource', 'id_token') }
            ]}
            selectedItemId={tokenSource}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {tokenSource === 'id_token'
                ? t('OAUTH.COMMON.ID_TOKEN', { defaultValue: 'ID Token' })
                : t('OAUTH.COMMON.ACCESS_TOKEN', { defaultValue: 'Access Token' })}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-token-name">
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.TOKEN_ID', { defaultValue: 'Token ID' })}</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={oAuth['credentialsId'] || ''}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('credentialsId', val)}
            onRun={handleRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>
      <div className="flex items-center gap-4 w-full" key="input-token-placement">
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.ADD_TOKEN_TO', { defaultValue: 'Add token to' })}</label>
        <div className="inline-flex items-center cursor-pointer token-placement-selector">
          <MenuDropdown
            items={[
              { id: 'header', label: t('OAUTH.COMMON.HEADER', { defaultValue: 'Header' }), onClick: () => handleChange('tokenPlacement', 'header') },
              { id: 'url', label: t('OAUTH.COMMON.URL', { defaultValue: 'URL' }), onClick: () => handleChange('tokenPlacement', 'url') }
            ]}
            selectedItemId={tokenPlacement}
            placement="bottom-end"
          >
            <div className="flex items-center justify-end token-placement-label select-none">
              {tokenPlacement == 'url'
                ? t('OAUTH.COMMON.URL', { defaultValue: 'URL' })
                : t('OAUTH.COMMON.HEADERS', { defaultValue: 'Headers' })}
              <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
            </div>
          </MenuDropdown>
        </div>
      </div>
      {
        tokenPlacement === 'header'
          ? (
              <div className="flex items-center gap-4 w-full" key="input-token-prefix">
                <label className="block min-w-[140px]">{t('OAUTH.COMMON.HEADER_PREFIX', { defaultValue: 'Header Prefix' })}</label>
                <div className="single-line-editor-wrapper flex-1">
                  <SingleLineEditor
                    value={oAuth['tokenHeaderPrefix'] || ''}
                    theme={storedTheme}
                    onSave={handleSave}
                    onChange={(val) => handleChange('tokenHeaderPrefix', val)}
                    onRun={handleRun}
                    collection={collection}
                    isCompact
                  />
                </div>
              </div>
            )
          : (
              <div className="flex items-center gap-4 w-full" key="input-token-query-param-key">
                <label className="block min-w-[140px]">{t('OAUTH.COMMON.QUERY_PARAM_KEY', { defaultValue: 'Query Param Key' })}</label>
                <div className="single-line-editor-wrapper flex-1">
                  <SingleLineEditor
                    value={oAuth['tokenQueryKey'] || ''}
                    theme={storedTheme}
                    onSave={handleSave}
                    onChange={(val) => handleChange('tokenQueryKey', val)}
                    onRun={handleRun}
                    collection={collection}
                    isCompact
                  />
                </div>
              </div>
            )
      }
      <div className="flex items-center gap-2.5 mt-4 mb-2">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconAdjustmentsHorizontal size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          {t('OAUTH.COMMON.ADVANCED_SETTINGS', { defaultValue: 'Advanced Settings' })}
        </span>
      </div>

      <div className="flex items-center gap-4 w-full mb-4">
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.REFRESH_TOKEN_URL', { defaultValue: 'Refresh Token URL' })}</label>
        <div className="single-line-editor-wrapper flex-1">
          <SingleLineEditor
            value={get(request, 'auth.oauth2.refreshTokenUrl', '')}
            theme={storedTheme}
            onSave={handleSave}
            onChange={(val) => handleChange('refreshTokenUrl', val)}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5 mt-4">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconSettings size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">{t('OAUTH.COMMON.SETTINGS', { defaultValue: 'Settings' })}</span>
      </div>

      {/* Automatically Fetch Token */}
      <div className="flex items-center gap-4 w-full">
        <input
          type="checkbox"
          checked={Boolean(autoFetchToken)}
          onChange={(e) => handleChange('autoFetchToken', e.target.checked)}
          className="cursor-pointer ml-1"
        />
        <label className="block min-w-[140px]">{t('OAUTH.COMMON.AUTO_FETCH_TOKEN_IF_NOT_FOUND', { defaultValue: 'Automatically fetch token if not found' })}</label>
        <div className="flex items-center gap-2">
          <div className="relative group cursor-pointer">
            <IconHelp size={16} className="text-gray-500" />
            <span className="group-hover:opacity-100 pointer-events-none opacity-0 max-w-60 absolute left-0 bottom-full mb-1 w-max p-2 bg-gray-700 text-white text-xs rounded-md transition-opacity duration-200">
              {t('OAUTH.COMMON.AUTO_FETCH_TOKEN_TOOLTIP', { defaultValue: "Automatically fetch a new token when you try to access a resource and don't have one." })}
            </span>
          </div>
        </div>
      </div>

      {/* Auto Refresh Token (With Refresh URL) */}
      <div className="flex items-center gap-4 w-full">
        <input
          type="checkbox"
          checked={Boolean(autoRefreshToken)}
          onChange={(e) => handleChange('autoRefreshToken', e.target.checked)}
          className={`cursor-pointer ml-1 ${isAutoRefreshDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isAutoRefreshDisabled}
        />
        <label className={`block min-w-[140px] ${isAutoRefreshDisabled ? 'text-gray-500' : ''}`}>{t('OAUTH.COMMON.AUTO_REFRESH_TOKEN', { defaultValue: 'Auto refresh token (with refresh URL)' })}</label>
        <div className="flex items-center gap-2">
          <div className="relative group cursor-pointer">
            <IconHelp size={16} className="text-gray-500" />
            <span className="group-hover:opacity-100 pointer-events-none opacity-0 max-w-60 absolute left-0 bottom-full mb-1 w-max p-2 bg-gray-700 text-white text-xs rounded-md transition-opacity duration-200">
              {t('OAUTH.COMMON.AUTO_REFRESH_TOKEN_TOOLTIP', { defaultValue: 'Automatically refresh your token using the refresh URL when it expires.' })}
            </span>
          </div>
        </div>
      </div>
      <AdditionalParams
        item={item}
        request={request}
        collection={collection}
        updateAuth={updateAuth}
        handleSave={handleSave}
      />
      <Oauth2ActionButtons item={item} request={request} collection={collection} url={accessTokenUrl} credentialsId={credentialsId} />
    </StyledWrapper>
  );
};

export default OAuth2PasswordCredentials;
