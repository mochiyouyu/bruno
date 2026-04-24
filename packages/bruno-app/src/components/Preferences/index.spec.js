import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import Preferences from './index';
import { renderWithProviders } from 'test-utils/render';
import appReducer from 'providers/ReduxStore/slices/app';

jest.mock('./General', () => () => <div>General Panel</div>);
jest.mock('./Themes', () => () => <div>Themes Panel</div>);
jest.mock('./ProxySettings', () => () => <div>Proxy Panel</div>);
jest.mock('./Display', () => () => <div>Display Panel</div>);
jest.mock('./Keybindings', () => () => <div>Keybindings Panel</div>);
jest.mock('./Beta', () => () => <div>Beta Panel</div>);
jest.mock('./Support', () => () => <div>Support Panel</div>);
jest.mock('./Cache/index', () => () => <div>Cache Panel</div>);

describe('Preferences', () => {
  const renderComponent = (activePreferencesTab = 'general') => {
    return renderWithProviders(<Preferences />, {
      reducer: {
        app: appReducer
      },
      preloadedState: {
        app: {
          activePreferencesTab,
          preferences: {}
        }
      }
    });
  };

  beforeEach(() => {
    window.ipcRenderer = {
      send: jest.fn()
    };
  });

  it('renders the panel matching the active preferences tab', () => {
    renderComponent('general');

    expect(screen.getByText('General Panel')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'General' })).toHaveClass('active');
  });

  it('switches the visible panel when another tab is clicked', async () => {
    renderComponent('general');

    fireEvent.click(screen.getByRole('tab', { name: 'Display' }));

    await waitFor(() => {
      expect(screen.getByText('Display Panel')).toBeInTheDocument();
      expect(screen.queryByText('General Panel')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Display' })).toHaveClass('active');
    });
  });

  it('updates the Redux state when tabs change', async () => {
    const { store } = renderComponent('general');

    fireEvent.click(screen.getByRole('tab', { name: 'Proxy' }));

    await waitFor(() => {
      expect(store.getState().app.activePreferencesTab).toBe('proxy');
    });
  });
});
