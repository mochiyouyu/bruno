import React from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import '../i18n';

const createPassthroughReducer = (initialSliceState = {}) => {
  return (state = initialSliceState) => state;
};

const createDefaultReducers = (preloadedState = {}) => {
  const stateKeys = Object.keys(preloadedState);

  if (!stateKeys.length) {
    return {
      app: createPassthroughReducer({})
    };
  }

  return stateKeys.reduce((reducers, key) => {
    reducers[key] = createPassthroughReducer(preloadedState[key]);
    return reducers;
  }, {});
};

export const createTestStore = ({
  preloadedState,
  reducer
} = {}) => {
  return configureStore({
    reducer: reducer || createDefaultReducers(preloadedState),
    preloadedState
  });
};

export const renderWithProviders = (
  ui,
  {
    preloadedState,
    reducer,
    store = createTestStore({ preloadedState, reducer }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => {
    return (
      <Provider store={store}>
        <ThemeProvider>{children}</ThemeProvider>
      </Provider>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
};
