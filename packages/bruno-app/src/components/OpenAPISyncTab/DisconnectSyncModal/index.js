import Button from 'ui/Button';
import Modal from 'components/Modal';
import { useTranslation } from 'react-i18next';

const DisconnectSyncModal = ({ onConfirm, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      size="sm"
      title={t('OPENAPI_SYNC.DISCONNECT.TITLE', { defaultValue: 'Disconnect Sync' })}
      hideFooter={true}
      handleCancel={onClose}
    >
      <div className="disconnect-modal">
        <p className="disconnect-message">
          <>{t('OPENAPI_SYNC.DISCONNECT.CONFIRM', { defaultValue: 'Are you sure you want to disconnect OpenAPI sync?' })}</> <br /> <br />
          <>{t('OPENAPI_SYNC.DISCONNECT.DESCRIPTION', { defaultValue: 'This will only disconnect the sync configuration. Your collection will remain intact.' })}</>
        </p>
        <div className="disconnect-actions">
          <Button variant="ghost" color="secondary" onClick={onClose}>
            {t('OPENAPI_SYNC.COMMON.CANCEL', { defaultValue: 'Cancel' })}
          </Button>
          <Button color="danger" onClick={onConfirm}>
            {t('OPENAPI_SYNC.DISCONNECT.ACTION', { defaultValue: 'Disconnect' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DisconnectSyncModal;
