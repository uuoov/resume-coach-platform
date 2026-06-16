import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppRoutes from './AppRoutes';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5',
      light: '#EEF2FF',
      dark: '#4338CA',
    },
    success: {
      main: '#10B981',
      light: '#D1FAE5',
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
    },
    error: {
      main: '#EF4444',
      light: '#FEE2E2',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #F3F4F6',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
        },
        contained: {
          '&:hover': { transform: 'translateY(-1px)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
