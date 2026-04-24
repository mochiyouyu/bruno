import React, { useEffect } from 'react';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import { applyLanguage } from '../../i18n';
import ConfirmAppClose from './ConfirmAppClose';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';
import StyledWrapper from './StyledWrapper';
import useOpenAPISyncPolling from './useOpenAPISyncPolling';
import { version } from '../../../package.json';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry({ version });
  useIpcEvents();
  useOpenAPISyncPolling();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.app.preferences?.general?.language);

  useEffect(() => {
    dispatch(refreshScreenWidth());
  }, [dispatch]);

  useEffect(() => {
    const platform = get(navigator, 'platform', '').toLowerCase();

    if (!platform) {
      return;
    }

    if (platform.includes('mac')) {
      document.body.classList.add('os-mac');
      return;
    }

    if (platform.includes('win')) {
      document.body.classList.add('os-windows');
      return;
    }

    if (platform.includes('linux')) {
      document.body.classList.add('os-linux');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      dispatch(refreshScreenWidth());
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return (
    <AppContext.Provider {...props} value={{ version }}>
      <StyledWrapper>
        <ConfirmAppClose />
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppProvider;
