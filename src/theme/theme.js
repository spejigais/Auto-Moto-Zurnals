import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003314', // Dark green as requested
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F5F5', // Light gray background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A', // Dark gray/black
      secondary: '#4D4D4D',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Inter", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: 44, // Mobile-first touch target minimum height/width
          minHeight: 44,
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px', // Comfortable touch targets in tables
        },
      },
    },
  },
});

export default theme;
