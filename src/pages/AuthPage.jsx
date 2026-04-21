import { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Paper, 
  Alert 
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [view, setView] = useState('login'); // 'login', 'signup', 'recovery'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      if (view === 'login') {
        const { error: signInError } = await signIn({ email, password });
        if (signInError) throw signInError;
      } else if (view === 'signup') {
        const { error: signUpError } = await signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccess("Reģistrācija veiksmīga! Jūs varat tagad pierakstīties.");
        setView('login');
      } else if (view === 'recovery') {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        });
        if (recoveryError) throw recoveryError;
        setSuccess("Pārbaudiet savu e-pastu, lai atjaunotu paroli.");
      }
    } catch (err) {
      setError(err.message || 'Notikusi kļūda autentifikācijas laikā');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
          Auto Moto Journal
        </Typography>
        <Typography variant="h6" gutterBottom>
          {view === 'login' && 'Pieslēgties'}
          {view === 'signup' && 'Reģistrēties'}
          {view === 'recovery' && 'Paroles atjaunošana'}
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-pasts"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {view !== 'recovery' && (
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Parole"
              type="password"
              id="password"
              autoComplete={view === 'login' ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Apstrādā...' : (
              view === 'login' ? 'Pieslēgties' : 
              view === 'signup' ? 'Reģistrēties' : 'Nosūtīt saiti'
            )}
          </Button>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {view === 'login' && (
              <>
                <Button fullWidth variant="text" onClick={() => setView('signup')}>
                  Nav konta? Reģistrēties
                </Button>
                <Button fullWidth variant="text" size="small" onClick={() => setView('recovery')}>
                  Aizmirsi paroli?
                </Button>
              </>
            )}
            {view === 'signup' && (
              <Button fullWidth variant="text" onClick={() => setView('login')}>
                Jau ir konts? Pieslēgties
              </Button>
            )}
            {view === 'recovery' && (
              <Button fullWidth variant="text" onClick={() => setView('login')}>
                Atpakaļ uz pieslēgšanos
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
