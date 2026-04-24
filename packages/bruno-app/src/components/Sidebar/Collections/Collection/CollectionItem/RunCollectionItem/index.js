import React, { useState } from 'react';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { flattenItems } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { areItemsLoading } from 'utils/collections';
import RunnerTags from 'components/RunnerResults/RunnerTags/index';
import { getRequestItemsForCollectionRun } from 'utils/collections/index';
import Button from 'ui/Button';

const RunCollectionItem = ({ collectionUid, item, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [delay, setDelay] = useState('');

  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const isCollectionRunInProgress = collection?.runnerResult?.info?.status && (collection?.runnerResult?.info?.status !== 'ended');

  // tags for the collection run
  const tags = get(collection, 'runnerTags', { include: [], exclude: [] });

  const onSubmit = (recursive) => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    if (!isCollectionRunInProgress) {
      dispatch(runCollectionFolder(collection.uid, item ? item.uid : null, recursive, delay ? Number(delay) : null, tags));
    }
    onClose();
  };

  const handleViewRunner = (e) => {
    e.preventDefault();
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
    onClose();
  };

  const isFolderLoading = areItemsLoading(item);

  const requestItemsForRecursiveFolderRun = getRequestItemsForCollectionRun({ recursive: true, tags, items: item ? item.items : collection.items });
  const totalRequestItemsCountForRecursiveFolderRun = requestItemsForRecursiveFolderRun.length;
  const shouldDisableRecursiveFolderRun = totalRequestItemsCountForRecursiveFolderRun <= 0;

  const requestItemsForFolderRun = getRequestItemsForCollectionRun({ recursive: false, tags, items: item ? item.items : collection.items });
  const totalRequestItemsCountForFolderRun = requestItemsForFolderRun.length;
  const shouldDisableFolderRun = totalRequestItemsCountForFolderRun <= 0;

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={t('RUNNER.RUN_COLLECTION_MODAL.TITLE', { defaultValue: 'Collection Runner' })}
        hideFooter={true}
        handleCancel={onClose}
      >
        <div>
          <div className="mb-1">
            <span className="font-medium">{t('RUNNER.RUN_COLLECTION_MODAL.RUN', { defaultValue: 'Run' })}</span>
            <span className="ml-1 text-xs">
              ({t('RUNNER.REQUEST_COUNT', { defaultValue: '{{count}} requests', count: totalRequestItemsCountForFolderRun })})
            </span>
          </div>
          <div className="mb-3 description">
            {t('RUNNER.RUN_COLLECTION_MODAL.RUN_DESC', {
              defaultValue: 'This will only run the requests in this folder.'
            })}
          </div>
          <div className="mb-1">
            <span className="font-medium">
              {t('RUNNER.RUN_COLLECTION_MODAL.RECURSIVE_RUN', { defaultValue: 'Recursive Run' })}
            </span>
            <span className="ml-1 text-xs">
              ({t('RUNNER.REQUEST_COUNT', { defaultValue: '{{count}} requests', count: totalRequestItemsCountForRecursiveFolderRun })})
            </span>
          </div>
          <div className={`description ${isFolderLoading ? 'mb-2' : 'mb-6'}`}>
            {t('RUNNER.RUN_COLLECTION_MODAL.RECURSIVE_RUN_DESC', {
              defaultValue: 'This will run all the requests in this folder and all its subfolders.'
            })}
          </div>
          {isFolderLoading ? (
            <div className="mb-8 warning">
              {t('RUNNER.RUN_COLLECTION_MODAL.FOLDER_LOADING', {
                defaultValue: 'Requests in this folder are still loading.'
              })}
            </div>
          ) : null}
          {isCollectionRunInProgress ? (
            <div className="mb-6 warning">
              {t('RUNNER.RUN_COLLECTION_MODAL.RUN_IN_PROGRESS', {
                defaultValue: 'A Collection Run is already in progress.'
              })}
            </div>
          ) : null}

          <hr className="divider" />

          {/* Timings */}
          <div className="flex flex-col items-start gap-2 mb-8">
            <label htmlFor="runner-delay" className="block text-sm">
              {t('RUNNER.TIMINGS.DELAY_BETWEEN_REQUESTS', { defaultValue: 'Delay between requests (ms)' })}
            </label>
            <input
              id="runner-delay"
              type="number"
              className="textbox w-1/2"
              placeholder={t('RUNNER.TIMINGS.DELAY_PLACEHOLDER', { defaultValue: 'e.g. 5' })}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
            />
          </div>

          {/* Tags for the collection run */}
          <RunnerTags collectionUid={collection.uid} className="mb-6" />

          <div className="flex justify-end bruno-modal-footer">
            <Button type="button" color="secondary" variant="ghost" onClick={onClose} className="mr-3">
              {t('OPENAPI_SYNC.COMMON.CANCEL', { defaultValue: 'Cancel' })}
            </Button>
            {
              isCollectionRunInProgress
                ? (
                    <Button type="submit" onClick={handleViewRunner}>
                      {t('RUNNER.RUN_COLLECTION_MODAL.VIEW_RUN', { defaultValue: 'View Run' })}
                    </Button>
                  )
                : (
                    <>
                      <Button type="submit" disabled={shouldDisableRecursiveFolderRun} onClick={() => onSubmit(true)} className="mr-3">
                        {t('RUNNER.RUN_COLLECTION_MODAL.RECURSIVE_RUN', { defaultValue: 'Recursive Run' })}
                      </Button>
                      <Button type="submit" disabled={shouldDisableFolderRun} onClick={() => onSubmit(false)}>
                        {t('RUNNER.RUN_COLLECTION_MODAL.RUN', { defaultValue: 'Run' })}
                      </Button>
                    </>
                  )
            }
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default RunCollectionItem;
