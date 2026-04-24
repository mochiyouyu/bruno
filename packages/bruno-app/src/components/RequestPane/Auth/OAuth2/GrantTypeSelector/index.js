import React from 'react';
import get from 'lodash/get';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { IconCaretDown, IconKey } from '@tabler/icons';
import { useEffect } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const GrantTypeSelector = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const oAuth = get(request, 'auth.oauth2', {});
  const { t } = useTranslation();
  const [valuesCache, setValuesCache] = useState({
    ...oAuth
  });
  const grantTypeOptions = [
    { id: 'password', label: t('OAUTH.OAUTH2.GRANT_TYPES.PASSWORD', { defaultValue: 'Password Credentials' }) },
    { id: 'authorization_code', label: t('OAUTH.OAUTH2.GRANT_TYPES.AUTHORIZATION_CODE', { defaultValue: 'Authorization Code' }) },
    { id: 'implicit', label: t('OAUTH.OAUTH2.GRANT_TYPES.IMPLICIT', { defaultValue: 'Implicit' }) },
    { id: 'client_credentials', label: t('OAUTH.OAUTH2.GRANT_TYPES.CLIENT_CREDENTIALS', { defaultValue: 'Client Credentials' }) }
  ];
  const selectedGrantTypeLabel = grantTypeOptions.find((option) => option.id === oAuth?.grantType)?.label
    || grantTypeOptions.find((option) => option.id === 'authorization_code')?.label;

  const onGrantTypeChange = (grantType) => {
    let updatedValues = {
      ...valuesCache,
      ...oAuth,
      grantType
    };
    setValuesCache(updatedValues);
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...updatedValues
        }
      })
    );
  };

  useEffect(() => {
    // initialize redux state with a default oauth2 grant type
    // authorization_code - default option
    !oAuth?.grantType
    && dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType: 'authorization_code',
          accessTokenUrl: '',
          username: '',
          password: '',
          clientId: '',
          clientSecret: '',
          scope: '',
          credentialsPlacement: 'body',
          credentialsId: 'credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          tokenSource: 'access_token'
        }
      })
    );
  }, [oAuth]);

  return (
    <StyledWrapper>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center px-2.5 py-1.5 oauth2-icon-container rounded-md">
          <IconKey size={14} className="oauth2-icon" />
        </div>
        <span className="oauth2-section-label">
          {t('OAUTH.OAUTH2.GRANT_TYPE', { defaultValue: 'Grant Type' })}
        </span>
      </div>
      <div className="inline-flex items-center cursor-pointer grant-type-mode-selector w-fit">
        <MenuDropdown
          items={grantTypeOptions.map((option) => ({
            ...option,
            onClick: () => onGrantTypeChange(option.id)
          }))}
          selectedItemId={oAuth?.grantType}
          placement="bottom-end"
        >
          <div className="flex items-center justify-end grant-type-label select-none">
            {selectedGrantTypeLabel} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default GrantTypeSelector;
