import React, { useEffect, useState, useCallback } from 'react';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import ErrorBanner from 'ui/ErrorBanner';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

const FolderNotFound = ({ folderUid }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const closeTab = useCallback(() => {
    dispatch(
      closeTabs({
        tabUids: [folderUid]
      })
    );
  }, [dispatch, folderUid]);

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
      title: t('NOT_FOUND.FOLDER_TITLE', { defaultValue: 'Folder no longer exists' }),
      message: t('NOT_FOUND.FOLDER_MESSAGE', { defaultValue: 'This can happen when the folder was renamed or deleted on your filesystem.' })
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

export default FolderNotFound;
