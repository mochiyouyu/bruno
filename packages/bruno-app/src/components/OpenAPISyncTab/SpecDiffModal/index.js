import { useRef, useEffect, useState } from 'react';
import { useTheme } from 'providers/Theme/index';
import { IconLoader2 } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';
import StatusBadge from 'ui/StatusBadge';

const SpecDiffModal = ({ specDrift, onClose }) => {
  const diffRef = useRef(null);
  const { displayedTheme } = useTheme();
  const { t } = useTranslation();
  const [isRendering, setIsRendering] = useState(true);

  const addedCount = specDrift?.added?.length || 0;
  const modifiedCount = specDrift?.modified?.length || 0;
  const removedCount = specDrift?.removed?.length || 0;

  const versionLabel = specDrift?.versionChanged
    ? `v${specDrift.storedVersion || '?'} → v${specDrift.newVersion}`
    : null;

  useEffect(() => {
    const { Diff2Html } = window;
    if (!diffRef?.current || !Diff2Html || !specDrift?.unifiedDiff) {
      setIsRendering(false);
      return;
    }
    setIsRendering(true);
    const diffHtml = Diff2Html.html(specDrift.unifiedDiff, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'side-by-side',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false,
      colorScheme: displayedTheme
    });
    // Safe: Diff2Html is loaded from a local static bundle (public/static/diff2Html.js)
    diffRef.current.innerHTML = diffHtml;
    setIsRendering(false);
  }, [displayedTheme, specDrift?.unifiedDiff]);

  return (
    <Modal
      size="xl"
      title={t('OPENAPI_SYNC.SPEC_DIFF.TITLE', { defaultValue: 'Spec Diff' })}
      hideFooter
      handleCancel={onClose}
    >
      <div className="spec-diff-modal">
        <div className="spec-diff-badges">
          {modifiedCount > 0 && (
            <StatusBadge status="warning">
              {t('OPENAPI_SYNC.SPEC_DIFF.UPDATED', { defaultValue: 'Updated: {{count}}', count: modifiedCount })}
            </StatusBadge>
          )}
          {addedCount > 0 && (
            <StatusBadge status="success">
              {t('OPENAPI_SYNC.SPEC_DIFF.ADDED', { defaultValue: 'Added: {{count}}', count: addedCount })}
            </StatusBadge>
          )}
          {removedCount > 0 && (
            <StatusBadge status="danger">
              {t('OPENAPI_SYNC.SPEC_DIFF.REMOVED', { defaultValue: 'Removed: {{count}}', count: removedCount })}
            </StatusBadge>
          )}
          {versionLabel && <StatusBadge>{versionLabel}</StatusBadge>}
        </div>

        <p className="spec-diff-subtitle">
          {specDrift?.storedSpecMissing
            ? t('OPENAPI_SYNC.SPEC_DIFF.MISSING_SPEC_DESC', {
              defaultValue: 'The current spec file is missing. The full remote spec is shown below.'
            })
            : t('OPENAPI_SYNC.SPEC_DIFF.DIFF_DESC', {
              defaultValue: 'Side-by-side diff of your current spec vs the updated spec from the spec URL.'
            })}
        </p>

        <div className="spec-diff-body">
          <div className="text-diff-container">
            {specDrift?.unifiedDiff ? (
              <>
                <div className="diff-column-headers">
                  <span className="diff-column-label">
                    {specDrift?.storedSpecMissing
                      ? t('OPENAPI_SYNC.SPEC_DIFF.CURRENT_SPEC_MISSING', { defaultValue: 'Current Spec (missing)' })
                      : t('OPENAPI_SYNC.SPEC_DIFF.CURRENT_SPEC', { defaultValue: 'Current Spec' })}
                  </span>
                  <span className="diff-column-label">
                    {t('OPENAPI_SYNC.SPEC_DIFF.UPDATED_SPEC', { defaultValue: 'Updated Spec' })}
                  </span>
                </div>
                {isRendering && (
                  <div className="text-diff-loading">
                    <IconLoader2 className="animate-spin" size={20} strokeWidth={1.5} />
                    <span>{t('OPENAPI_SYNC.SPEC_DIFF.LOADING', { defaultValue: 'Loading diff...' })}</span>
                  </div>
                )}
                <div ref={diffRef} style={{ display: isRendering ? 'none' : 'block' }}></div>
              </>
            ) : (
              <div className="text-diff-empty">
                {t('OPENAPI_SYNC.SPEC_DIFF.EMPTY', { defaultValue: 'No text diff available.' })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpecDiffModal;
