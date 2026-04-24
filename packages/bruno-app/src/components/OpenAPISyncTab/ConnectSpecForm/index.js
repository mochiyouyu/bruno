import { useState, useRef } from 'react';
import { IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import { isHttpUrl } from 'utils/url/index';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';
import { useTranslation } from 'react-i18next';

const ConnectSpecForm = ({ sourceUrl, setSourceUrl, isLoading, error, setError, onConnect }) => {
  const [mode, setMode] = useState('url');
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

  const features = [
    t('OPENAPI_SYNC.CONNECT.FEATURES.DETECT_CHANGES', { defaultValue: 'Detect new, modified, and removed endpoints' }),
    t('OPENAPI_SYNC.CONNECT.FEATURES.TRACK_LOCAL_CHANGES', { defaultValue: 'Track local changes against the spec' }),
    t('OPENAPI_SYNC.CONNECT.FEATURES.SYNC_ONE_CLICK', { defaultValue: 'Sync collection with a single click' }),
    t('OPENAPI_SYNC.CONNECT.FEATURES.PRESERVE_LOGIC', { defaultValue: 'Your tests, assertions, and scripts are preserved during sync' })
  ];

  return (
    <div className="setup-section">
      <div className="setup-header">
        <h2 className="setup-title">{t('OPENAPI_SYNC.CONNECT.TITLE', { defaultValue: 'Connect to OpenAPI Spec' })}</h2>
        <p className="setup-description">
          {t('OPENAPI_SYNC.CONNECT.DESCRIPTION', { defaultValue: 'Keep your collection synchronized with an OpenAPI specification. Changes in the spec will be detected automatically.' })}
        </p>
      </div>

      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          onConnect();
        }}
      >
        <label className="url-label">{t('OPENAPI_SYNC.CONNECT.SPEC_LABEL', { defaultValue: 'OpenAPI Specification' })}</label>
        <div className="url-row">
          <div className="setup-mode-toggle">
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'url' ? 'active' : ''}`}
              onClick={() => {
                setMode('url');
                setSourceUrl('');
              }}
            >
              {t('OPENAPI_SYNC.COMMON.URL', { defaultValue: 'URL' })}
            </button>
            <button
              type="button"
              className={`setup-mode-btn ${mode === 'file' ? 'active' : ''}`}
              onClick={() => {
                setMode('file');
                setSourceUrl('');
              }}
            >
              {t('OPENAPI_SYNC.COMMON.FILE', { defaultValue: 'File' })}
            </button>
          </div>

          {mode === 'url' ? (
            <input
              type="text"
              className="url-input"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
            />
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setError(null);
                  setSourceUrl('');

                  try {
                    const data = await parseFileAsJsonOrYaml(file);
                    if (!isOpenApiSpec(data)) {
                      setError(t('OPENAPI_SYNC.ERRORS.INVALID_FILE_SPEC', { defaultValue: 'The selected file is not a valid OpenAPI 3.x specification' }));
                      return;
                    }
                    if (data.swagger && String(data.swagger).startsWith('2')) {
                      setError(t('OPENAPI_SYNC.ERRORS.SWAGGER_UNSUPPORTED', { defaultValue: 'Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.' }));
                      return;
                    }
                    const filePath = window.ipcRenderer.getFilePath(file);
                    if (filePath) setSourceUrl(filePath);
                  } catch (err) {
                    setError(err.message || t('OPENAPI_SYNC.ERRORS.READ_FILE_FAILED', { defaultValue: 'Failed to read the selected file' }));
                  }
                }}
              />
              <button
                type="button"
                className="url-input file-pick-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {sourceUrl ? sourceUrl.split(/[\\/]/).pop() : t('OPENAPI_SYNC.COMMON.CHOOSE_FILE', { defaultValue: 'Choose file...' })}
              </button>
            </>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={mode === 'url' ? !isHttpUrl(sourceUrl.trim()) : !sourceUrl.trim()}
            loading={isLoading}
          >
            {t('OPENAPI_SYNC.CONNECT.CONNECT', { defaultValue: 'Connect' })}
          </Button>
        </div>
        <p className="setup-hint">
          {mode === 'url'
            ? t('OPENAPI_SYNC.CONNECT.URL_HINT', { defaultValue: 'Supports OpenAPI 3.x specifications in JSON or YAML format' })
            : t('OPENAPI_SYNC.CONNECT.FILE_HINT', { defaultValue: 'Select a local OpenAPI/Swagger JSON or YAML file' })}
        </p>
        {error && (
          <p className="setup-error">{error}</p>
        )}
      </form>

      <div className="setup-features">
        {features.map((text) => (
          <div className="setup-feature" key={text}>
            <IconCheck size={16} />
            <span>{text}</span>
          </div>
        ))}
      </div>

      <p className="beta-feedback-inline">
        {t('OPENAPI_SYNC.COMMON.BETA_FEEDBACK', { defaultValue: "OpenAPI Sync is in Beta, we'd love to hear your feedback and suggestions." })}{' '}
        <button
          type="button"
          className="beta-feedback-link"
          onClick={() => window?.ipcRenderer?.openExternal('https://github.com/usebruno/bruno/discussions/7401')}
        >
          {t('OPENAPI_SYNC.COMMON.SHARE_FEEDBACK', { defaultValue: 'Share feedback' })}
        </button>
      </p>
    </div>
  );
};

export default ConnectSpecForm;
