import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import WelcomeModal from './index';
import { renderWithProviders } from 'test-utils/render';

const mockBrowseDirectory = jest.fn();
const mockSavePreferences = jest.fn();

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: (...args) => mockBrowseDirectory(...args)
}));

jest.mock('providers/ReduxStore/slices/app', () => {
  const actual = jest.requireActual('providers/ReduxStore/slices/app');
  return {
    ...actual,
    savePreferences: (...args) => mockSavePreferences(...args)
  };
});

describe('WelcomeModal', () => {
  const onDismiss = jest.fn();
  const onImportCollection = jest.fn();
  const onCreateCollection = jest.fn();
  const onOpenCollection = jest.fn();
  const onStartRequest = jest.fn();

  const defaultState = {
    app: {
      preferences: {
        general: {
          defaultLocation: 'C:/collections'
        }
      }
    }
  };

  const renderComponent = (preloadedState = defaultState) => {
    return renderWithProviders(
      <WelcomeModal
        onDismiss={onDismiss}
        onImportCollection={onImportCollection}
        onCreateCollection={onCreateCollection}
        onOpenCollection={onOpenCollection}
        onStartRequest={onStartRequest}
      />,
      {
        preloadedState
      }
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockBrowseDirectory.mockImplementation(() => {
      return () => Promise.resolve('D:/chosen-folder');
    });

    mockSavePreferences.mockImplementation((preferences) => {
      return () => Promise.resolve(preferences);
    });
  });

  it('navigates across onboarding steps and supports going back', async () => {
    const user = userEvent.setup();

    renderComponent();

    expect(screen.getByText('Welcome to Bruno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByText('Choose your theme')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Where should we store your collections?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Choose your theme')).toBeInTheDocument();
  });

  it('loads a browsed storage path into the storage step', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: /browse/i }));

    await waitFor(() => {
      expect(mockBrowseDirectory).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('D:/chosen-folder')).toBeInTheDocument();
  });

  it('persists updated default location and triggers create collection on completion', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /browse/i }));

    expect(await screen.findByText('D:/chosen-folder')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Create Collection/i }));

    await waitFor(() => {
      expect(mockSavePreferences).toHaveBeenCalledWith({
        general: {
          defaultLocation: 'D:/chosen-folder'
        }
      });
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onCreateCollection).toHaveBeenCalledTimes(1);
    });
  });
});
