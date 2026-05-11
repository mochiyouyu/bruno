import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const RequestNotFound = ({ itemUid }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = () => {
    dispatch(
      closeTabs({
        tabUids: [itemUid]
      })
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowErrorMessage(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (!showErrorMessage) {
    return null;
  }

  const errors = [
    {
      title: t('NOT_FOUND.REQUEST_TITLE', { defaultValue: 'Request no longer exists' }),
      message: t('NOT_FOUND.REQUEST_MESSAGE', { defaultValue: 'This can happen when the file associated with this request was deleted on your filesystem.' })
    }
  ];

  return (
    <div className="mt-6 px-6">
      <ErrorBanner errors={errors} className="mb-4" />
      <Button size="md" color="secondary" variant="ghost" onClick={closeTab}>
        {t('KEYBINDINGS.ACTIONS.CLOSE_TAB', { defaultValue: 'Close Tab' })}
      </Button>
    </div>
  );
};

export default RequestNotFound;
