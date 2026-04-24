import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';

const SaveScenarioModal = ({
  initialName = '',
  title = 'Save Scenario',
  confirmText = 'Save',
  label = 'Scenario name',
  requiredErrorText = 'Scenario name is required',
  placeholder,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(requiredErrorText);
      return;
    }

    onSubmit(trimmedName);
  };

  return (
    <Modal
      size="sm"
      title={title}
      confirmText={confirmText}
      handleCancel={onClose}
      handleConfirm={handleSubmit}
      confirmDisabled={!name.trim()}
      dataTestId="save-scenario-modal"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="scenario-name" className="font-medium text-sm">{label}</label>
        <input
          id="scenario-name"
          ref={inputRef}
          type="text"
          className="textbox w-full"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError('');
            }
          }}
          placeholder={placeholder || t('RUNNER.SAVE_MODAL.PLACEHOLDER', { defaultValue: 'e.g. Smoke Test' })}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {error ? <div className="danger text-xs">{error}</div> : null}
      </div>
    </Modal>
  );
};

export default SaveScenarioModal;
