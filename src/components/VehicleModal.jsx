import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { parseISO } from 'date-fns';

export default function VehicleModal({ open, onClose, onVehicleSaved, vehicleToEdit }) {
  const { user } = useAuth();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const colorInputRef = useRef(null);

  const [formData, setFormData] = useState({
    type: 'Auto',
    engine_drive_type: 'Zobsiksna',
    brand_model: '',
    plate_number: '',
    inspection_date: null,
    color: '#000000',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleToEdit) {
      setFormData({
        type: vehicleToEdit.type,
        engine_drive_type: vehicleToEdit.engine_drive_type,
        brand_model: vehicleToEdit.brand_model,
        plate_number: vehicleToEdit.plate_number,
        inspection_date: vehicleToEdit.inspection_date ? parseISO(vehicleToEdit.inspection_date) : null,
        color: vehicleToEdit.color || '#000000',
      });
    } else {
      setFormData({
        type: 'Auto',
        engine_drive_type: 'Zobsiksna',
        brand_model: '',
        plate_number: '',
        inspection_date: null,
        color: '#000000',
      });
    }
  }, [vehicleToEdit, open]);

  const driveOptions = formData.type === 'Auto'
    ? ['Zobsiksna', 'Dzinēja ķēde']
    : ['Piedziņas ķēde', 'Piedziņas siksna', 'Kardāns'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updates = { [name]: value };
      if (name === 'type') {
        updates.engine_drive_type = value === 'Auto' ? 'Zobsiksna' : 'Piedziņas ķēde';
      }
      return { ...prev, ...updates };
    });
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, inspection_date: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        inspection_date: formData.inspection_date ? formData.inspection_date.toISOString().split('T')[0] : null,
        user_id: user.id,
      };

      if (!vehicleToEdit) {
        // Only set default intervals for NEW vehicles
        payload.oil_interval_km = 0;
        payload.oil_interval_months = formData.type === 'Auto' ? 12 : 0;
        payload.belt_interval_km = 0;
        payload.belt_interval_months = 0;
      }

      const { data, error } = vehicleToEdit
        ? await supabase
          .from('vehicles')
          .update(payload)
          .eq('id', vehicleToEdit.id)
          .select()
        : await supabase
          .from('vehicles')
          .insert([payload])
          .select();

      if (error) throw error;
      if (onVehicleSaved) onVehicleSaved(data[0]);
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Kļūda saglabājot transportlīdzekli: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle>{vehicleToEdit ? 'Labot transportlīdzekli' : 'Pievienot transportlīdzekli'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <TextField
            select
            margin="dense"
            label="Tips"
            name="type"
            fullWidth
            required
            value={formData.type}
            onChange={handleChange}
          >
            <MenuItem value="Auto">Auto</MenuItem>
            <MenuItem value="Moto">Moto</MenuItem>
          </TextField>

          <TextField
            select
            margin="dense"
            label="Piedziņas tips"
            name="engine_drive_type"
            fullWidth
            required
            value={formData.engine_drive_type}
            onChange={handleChange}
            sx={{ mt: 2 }}
          >
            {driveOptions.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>

          <TextField
            margin="dense"
            label="Marka un Modelis"
            name="brand_model"
            fullWidth
            required
            value={formData.brand_model}
            onChange={handleChange}
            sx={{ mt: 2 }}
          />

          <TextField
            margin="dense"
            label="Numura zīme (VNZ)"
            name="plate_number"
            fullWidth
            required
            value={formData.plate_number}
            onChange={handleChange}
            sx={{ mt: 2 }}
          />

          <Box
            onClick={() => colorInputRef.current?.click()}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
              p: '10px 14px',
              border: '1px solid rgba(0, 0, 0, 0.23)',
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'rgba(0, 0, 0, 0.87)',
                bgcolor: 'rgba(0, 0, 0, 0.02)'
              }
            }}
          >
            <Typography variant="body1" color="text.secondary">Izvēlēties krāsu...</Typography>
            <Box
              component="input"
              type="color"
              name="color"
              ref={colorInputRef}
              value={formData.color}
              onChange={handleChange}
              onClick={(e) => e.stopPropagation()}
              sx={{
                width: 32,
                height: 32,
                padding: 0,
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.15)',
                borderRadius: '50%',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none',
                '&::-webkit-color-swatch-wrapper': {
                  padding: 0
                },
                '&::-webkit-color-swatch': {
                  border: 'none',
                  borderRadius: '50%'
                },
                '&::-moz-color-swatch': {
                  border: 'none',
                  borderRadius: '50%'
                }
              }}
            />
          </Box>





        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Atcelt
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saglabā...' : (vehicleToEdit ? 'Saglabāt' : 'Pievienot')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
