import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import General from './index';
import { renderWithProviders } from 'test-utils/render';
import appReducer, { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';

jest.mock('providers/ReduxStore/slices/app', () => {
  const actual = jest.requireActual('providers/ReduxStore/slices/app');

  return {
    __esModule: true,
    ...actual,
    savePreferences: jest.fn((preferences) => () => Promise.resolve(preferences))
  };
});

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  __esModule: true,
  browseDirectory: jest.fn(() => () => Promise.resolve('C:\\Users\\Administrator\\Bruno'))
}));

describe('Preferences/General', () => {
  const baseAppState = appReducer(undefined, { type: '@@INIT' });

  const renderComponent = (preferencesOverrides = {}) => {
    return renderWithProviders(<General />, {
      reducer: {
        app: appReducer
      },
      preloadedState: {
        app: {
          ...baseAppState,
          preferences: {
            ...baseAppState.preferences,
            request: {
              ...baseAppState.preferences.request,
              ...preferencesOverrides.request
            },
            autoSave: {
              ...baseAppState.preferences.autoSave,
              ...preferencesOverrides.autoSave
            },
            general: {
              ...baseAppState.preferences.general,
              ...preferencesOverrides.general
            }
          }
        }
      }
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    window.ipcRenderer = {
      getFilePath: jest.fn((file) => file?.path || file?.name || null),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders values from saved preferences', () => {
    renderComponent({
      request: {
        timeout: 2500,
        storeCookies: false
      },
      autoSave: {
        enabled: true,
        interval: 2000
      },
      general: {
        defaultLocation: 'D:\\Collections',
        language: 'zh-CN'
      }
    });

    expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    expect(screen.getByLabelText('Store Cookies automatically')).not.toBeChecked();
    expect(screen.getByLabelText('Enable Auto Save')).toBeChecked();
    expect(screen.getByLabelText('Save Delay (in ms)')).toHaveValue('2000');
    expect(screen.getByLabelText('Default Location')).toHaveValue('D:\\Collections');
    expect(screen.getByLabelText('Language')).toHaveValue('zh-CN');
  });

  it('updates the default location after browsing for a directory', async () => {
    renderComponent();

    fireEvent.click(screen.getByText('Browse'));

    await waitFor(() => {
      expect(browseDirectory).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Default Location')).toHaveValue('C:\\Users\\Administrator\\Bruno');
    });
  });

  it('persists changed preferences after the debounce interval', async () => {
    renderComponent();

    fireEvent.click(screen.getByLabelText('Store Cookies automatically'));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            storeCookies: false
          }),
          autoSave: expect.objectContaining({
            enabled: false,
            interval: 1000
          }),
          general: expect.objectContaining({
            defaultLocation: '',
            language: 'en'
          })
        })
      );
    });
  });

  it('persists changed language after the debounce interval', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('Language'), {
      target: {
        value: 'zh-CN'
      }
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          general: expect.objectContaining({
            language: 'zh-CN'
          })
        })
      );
    });
  });
});
