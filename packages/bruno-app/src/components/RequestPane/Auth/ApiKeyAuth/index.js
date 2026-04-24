import React, { useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import { useTranslation } from 'react-i18next';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const ApiKeyAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const { t } = useTranslation();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const apikeyAuth = get(request, 'auth.apikey', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleSave = () => {
    save();
  };

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end auth-type-label select-none">
        {apikeyAuth?.placement === 'queryparams'
          ? t('REQUEST_PANE.AUTH_FORM.QUERY_PARAM', { defaultValue: 'Query Param' })
          : t('REQUEST_PANE.AUTH_FORM.HEADER', { defaultValue: 'Header' })}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleAuthChange = (property, value) => {
    dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...apikeyAuth,
          [property]: value
        }
      })
    );
  };

  useEffect(() => {
    !apikeyAuth?.placement
    && dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          placement: 'header'
        }
      })
    );
  }, [apikeyAuth]);

  return (
    <StyledWrapper className="w-full">
      <label className="block mb-1">{t('REQUEST_PANE.AUTH_FORM.KEY', { defaultValue: 'Key' })}</label>
      <div className="single-line-editor-wrapper mb-3">
        <SingleLineEditor
          value={apikeyAuth.key || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('key', val)}
          onRun={handleRun}
          collection={collection}
          isCompact
        />
      </div>

      <label className="block mb-1">{t('REQUEST_PANE.AUTH_FORM.VALUE', { defaultValue: 'Value' })}</label>
      <div className="single-line-editor-wrapper mb-3">
        <SingleLineEditor
          value={apikeyAuth.value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('value', val)}
          onRun={handleRun}
          collection={collection}
          isCompact
        />
      </div>

      <label className="block mb-1">{t('REQUEST_PANE.AUTH_FORM.ADD_TO', { defaultValue: 'Add To' })}</label>
      <div className="inline-flex items-center cursor-pointer auth-placement-selector w-fit">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              handleAuthChange('placement', 'header');
            }}
          >
            {t('REQUEST_PANE.AUTH_FORM.HEADER', { defaultValue: 'Header' })}
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              handleAuthChange('placement', 'queryparams');
            }}
          >
            {t('REQUEST_PANE.AUTH_FORM.QUERY_PARAM', { defaultValue: 'Query Param' })}
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default ApiKeyAuth;
