import React, { useEffect, useState } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const ExampleNotFound = ({ exampleUid }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = () => {
    dispatch(closeTabs({
      tabUids: [exampleUid]
    }));
  };

  useEffect(() => {
    setTimeout(() => {
      setShowErrorMessage(true);
    }, 300);
  }, []);

  if (!showErrorMessage) {
    return null;
  }

  const errors = [
    {
      title: t('NOT_FOUND.EXAMPLE_TITLE', { defaultValue: 'Response example no longer exists' }),
      message: t('NOT_FOUND.EXAMPLE_MESSAGE', { defaultValue: 'This can occur when the example definition in your local file has been deleted or updated.' })
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

export default ExampleNotFound;
