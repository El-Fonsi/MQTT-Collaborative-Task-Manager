import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import './index.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

const theme = createTheme({
  fontFamily: 'Inter, system-ui, sans-serif',
  primaryColor: 'indigo',
  defaultRadius: 'lg',
  components: {
    Card: {
      defaultProps: { padding: 'lg' },
    },
    Modal: {
      defaultProps: { centered: true, padding: 'xl' },
    },
  },
});

const initialDark = localStorage.getItem('darkMode') === 'true';
if (initialDark) {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} forceColorScheme={initialDark ? 'dark' : 'light'}>
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
