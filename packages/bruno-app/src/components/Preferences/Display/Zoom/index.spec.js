import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import Zoom from './index';
import { renderWithProviders } from 'test-utils/render';

const mockSavePreferences = jest.fn();
const mockInvoke = jest.fn();
const mockSend = jest.fn();

jest.mock('providers/ReduxStore/slices/app', () => {
  const actual = jest.requireActual('providers/ReduxStore/slices/app');
  return {
    ...actual,
    savePreferences: (...args) => mockSavePreferences(...args)
  };
});

jest.mock('@usebruno/common', () => ({
  percentageToZoomLevel: (zoomPercentage) => (zoomPercentage - 100) / 100
}), { virtual: true });

describe('Preferences Display Zoom', () => {
  const renderComponent = (preloadedState = {}) => {
    const defaultState = {
      app: {
        preferences: {
          display: {
            zoomPercentage: 100
          }
        }
      }
    };

    return renderWithProviders(<Zoom />, {
      preloadedState: {
        ...defaultState,
        ...preloadedState
      }
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    window.ipcRenderer = {
      invoke: mockInvoke,
      send: mockSend
    };

    mockInvoke.mockResolvedValue(undefined);
    mockSavePreferences.mockImplementation((preferences) => {
      return () => Promise.resolve(preferences);
    });

    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = jest.fn();
    } else {
      jest.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    if (HTMLElement.prototype.scrollIntoView.mockRestore) {
      HTMLElement.prototype.scrollIntoView.mockRestore();
    }
  });

  it('shows the saved zoom percentage from preferences', () => {
    renderComponent({
      app: {
        preferences: {
          display: {
            zoomPercentage: 120
          }
        }
      }
    });

    expect(screen.getByText('120%')).toBeInTheDocument();
  });

  it('updates zoom via ipcRenderer and saves preferences when a new option is selected', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByText('100%').closest('.custom-select'));
    await user.click(screen.getByText('120%'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('renderer:set-zoom-level', 0.2);
    });

    expect(mockSavePreferences).toHaveBeenCalledWith({
      display: {
        zoomPercentage: 120
      }
    });
  });

  it('shows reset control for non-default zoom and resets back to 100%', async () => {
    const user = userEvent.setup();
    const { container } = renderComponent({
      app: {
        preferences: {
          display: {
            zoomPercentage: 130
          }
        }
      }
    });

    const resetButton = container.querySelector('button');
    expect(resetButton).toBeInTheDocument();

    await user.click(resetButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('renderer:set-zoom-level', 0);
    });

    expect(mockSavePreferences).toHaveBeenCalledWith({
      display: {
        zoomPercentage: 100
      }
    });
  });
});
