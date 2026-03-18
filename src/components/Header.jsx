import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  useTheme, 
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Divider,
  IconButton
} from '@mui/material';
import { Settings as SettingsIcon, ExitToApp as LogoutIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      
      await signOut();
      navigate('/auth');
      setSettingsOpen(false);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Kļūda dzēšot kontu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => navigate('/')}
          >
            {isMobile ? 'AMJ' : 'Auto Moto Journal'}
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              {!isMobile && (
                <Typography variant="body2" color="inherit" sx={{ mr: 1, opacity: 0.9 }}>
                  {user.email}
                </Typography>
              )}
              
              <Button 
                color="inherit" 
                onClick={() => setSettingsOpen(true)}
                startIcon={<SettingsIcon />}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                {!isMobile && 'Iestatījumi'}
              </Button>

              <Button 
                color="inherit" 
                onClick={handleLogout}
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                sx={{ borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none' }}
              >
                {!isMobile && 'Izrakstīties'}
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon /> Iestatījumi
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Lietotāja profils
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {user?.email}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Konta dzēšana ir neatgriezeniska. Visi jūsu dati (transportlīdzekļi un servisa vēsture) tiks izdzēsti uz visiem laikiem.
            </Typography>
            <Button 
              variant="contained" 
              color="error" 
              fullWidth
              onClick={() => setDeleteConfirmOpen(true)}
              sx={{ fontWeight: 'bold' }}
            >
              Dzēst manu kontu uz visiem laikiem
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Aizvērt</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => !loading && setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" /> Vai tiešām dzēst kontu?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Šī darbība ir neatgriezeniska. Vai tiešām vēlaties dzēst savu kontu un visus ar to saistītos datus?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={loading}>
            Atcelt
          </Button>
          <Button 
            onClick={handleDeleteAccount} 
            color="error" 
            variant="contained" 
            disabled={loading}
            autoFocus
          >
            {loading ? 'Dzēš...' : 'Jā, izdzēst manu kontu'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
