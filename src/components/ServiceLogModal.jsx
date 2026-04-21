import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  useTheme,
  MenuItem,
  Typography,
  Divider,
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PhotoCamera, Delete as DeleteIcon, InfoOutlined } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { parseISO, format } from 'date-fns';
import { getMaintenanceHint } from '../utils/maintenanceHints';
import imageCompression from 'browser-image-compression';


export default function ServiceLogModal({ open, onClose, vehicle, existingLog, logs = [], onSaved }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);

  // Helper: renders a label text with a tooltip info icon
  const LabelWithHint = ({ text, itemKey, driveType }) => {
    const hint = getMaintenanceHint(itemKey, vehicle?.type, driveType ?? vehicle?.engine_drive_type);
    return (
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {text}
        {hint && (
          <Tooltip
            title={hint}
            arrow
            placement="right"
            slotProps={{
              tooltip: {
                sx: {
                  fontSize: '13px',
                  fontWeight: 'bold',
                  whiteSpace: 'pre-line',
                  maxWidth: 'none',
                },
              },
            }}
          >
            <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        )}
      </Box>
    );
  };

  const [formData, setFormData] = useState({
    // Log Data
    date: null,
    mileage: '',
    description: '',
    cost: '',
    is_oil_changed: false,
    is_belt_changed: false,
    is_brake_fluid_changed: false,
    is_oil_filter: false,
    is_air_filter: false,
    is_cabin_filter: false,
    is_fuel_filter: false,
    image_paths: [],

    // Vehicle Data (Intervals)
    oil_interval_km: '',
    oil_interval_months: '',
    belt_interval_km: '',
    belt_interval_months: '',
    inspection_date: null
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vehicle && !open) return;

    const baseVehicleData = {
      oil_interval_km: vehicle?.oil_interval_km || 0,
      oil_interval_months: (vehicle?.oil_interval_months === 0 && vehicle?.type === 'Auto') ? 12 : (vehicle?.oil_interval_months || 0),
      belt_interval_km: vehicle?.belt_interval_km || 0,
      belt_interval_months: vehicle?.belt_interval_months || 0,
      inspection_date: vehicle?.inspection_date ? parseISO(vehicle.inspection_date) : null
    };

    if (existingLog) {
      setFormData({
        date: parseISO(existingLog.date),
        mileage: existingLog.mileage,
        description: existingLog.description || '',
        cost: existingLog.cost || '',
        is_oil_changed: existingLog.is_oil_changed,
        is_belt_changed: existingLog.is_belt_changed,
        is_brake_fluid_changed: existingLog.is_brake_fluid_changed || false,
        is_oil_filter: existingLog.is_oil_filter || false,
        is_air_filter: existingLog.is_air_filter || false,
        is_cabin_filter: existingLog.is_cabin_filter || false,
        is_fuel_filter: existingLog.is_fuel_filter || false,
        image_paths: existingLog.image_paths || [],
        ...baseVehicleData
      });
      // Show existing images if any (placeholders for now or generate URLs)
      setPreviews(existingLog.image_paths?.map(path => supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl) || []);
    } else {
      // Find highest mileage for default value
      const highestMileage = logs.length > 0 ? Math.max(...logs.map(l => l.mileage)) : 0;
      setFormData({
        date: new Date(),
        mileage: highestMileage ? highestMileage.toString() : '',
        description: '',
        cost: '',
        is_oil_changed: false,
        is_belt_changed: false,
        is_brake_fluid_changed: false,
        is_oil_filter: false,
        is_air_filter: false,
        is_cabin_filter: false,
        is_fuel_filter: false,
        image_paths: [],
        ...baseVehicleData
      });
      setPreviews([]);
    }
    setSelectedFiles([]);
    setError(null);
  }, [existingLog, logs, open, vehicle]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Limits: Max 5 files total (existing + new)
    if (files.length + selectedFiles.length + (formData.image_paths?.length || 0) > 5) {
      setError("Var pievienot ne vairāk kā 5 attēlus.");
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      // Limit: 10MB each
      if (file.size > 20 * 1024 * 1024) {
        setError(`Fails ${file.name} pārsniedz 10MB limitu.`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    // Clear the input value so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = async (index, isExisting = false) => {
    if (isExisting) {
      const pathToRemove = formData.image_paths[index];
      setLoading(true);
      try {
        // Physical deletion from bucket
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([pathToRemove]);

        if (storageError) throw storageError;

        setFormData(prev => ({
          ...prev,
          image_paths: prev.image_paths.filter((_, i) => i !== index)
        }));
        setPreviews(prev => prev.filter((_, i) => i !== index));
      } catch (err) {
        console.error('Error deleting file from storage:', err);
        setError("Kļūda dzēšot attēlu no servera.");
      } finally {
        setLoading(false);
      }
    } else {
      // Adjust index for newly selected files
      const existingFilesCount = formData.image_paths?.length || 0;
      const realIndex = index - existingFilesCount;

      setSelectedFiles(prev => prev.filter((_, i) => i !== realIndex));
      setPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploading(false); // Make sure it's reset
    setError(null);

    try {
      // 1. Validation & Mileage logic (Before DB calls)
      const newDateStr = formData.date ? format(formData.date, 'yyyy-MM-dd') : '';
      const newMileage = parseInt(formData.mileage);

      if (logs.length > 0) {
        const otherLogs = existingLog ? logs.filter(l => l.id !== existingLog.id) : logs;

        const priorLogs = otherLogs
          .filter(l => l.date <= newDateStr)
          .sort((a, b) => new Date(b.date) - new Date(a.date) || b.mileage - a.mileage);
        const priorLog = priorLogs[0];

        const nextLogs = otherLogs
          .filter(l => l.date > newDateStr)
          .sort((a, b) => new Date(a.date) - new Date(b.date) || a.mileage - b.mileage);
        const nextLog = nextLogs[0];

        if (priorLog && newMileage < priorLog.mileage) {
          throw new Error("Odometra rādījums neiekļaujas vēsturiskajā secībā! (Mazāks par iepriekšējo ierakstu)");
        }

        if (nextLog && newMileage > nextLog.mileage) {
          throw new Error("Odometra rādījums neiekļaujas vēsturiskajā secībā! (Lielāks par nākamo ierakstu)");
        }
      }

      // 2. Image Logic (Skip if zero images)
      let uploadedPaths = [...(formData.image_paths || [])];

      if (selectedFiles.length > 0) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();

        for (const originalFile of selectedFiles) {
          let fileToUpload = originalFile;

          // Client-side compression
          try {
            const options = {
              maxSizeMB: 0.45, // Target safely under 500KB
              maxWidthOrHeight: 1920, // Restore crispness (Full HD)
              initialQuality: 0.8, // Increase starting quality to 80% to remove grain
              useWebWorker: false, // CRITICAL: Keep this false to prevent the fallback bug
              alwaysKeepResolution: false,
              fileType: 'image/jpeg'
            };
            const compressedBlob = await imageCompression(originalFile, options);

            // Create a new File from the compressed Blob
            // We force .jpg extension because we forced image/jpeg type
            const newFileName = originalFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
            fileToUpload = new File([compressedBlob], newFileName, { type: 'image/jpeg' });

            console.log('Uploading compressed file size:', fileToUpload.size / 1024 / 1024, 'MB');
          } catch (compressErr) {
            console.error('Image compression failed:', compressErr);
            throw new Error(`Neizdevās saspiest attēlu: ${originalFile.name}`);
          }

          const fileExt = fileToUpload.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${user.id}/${vehicle.id}/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('receipts')
            .upload(filePath, fileToUpload);

          if (uploadError) throw uploadError;
          uploadedPaths.push(data.path);
        }
      }

      // 3. Save Record & Sync Vehicle Data
      const vehiclePayload = {
        inspection_date: formData.inspection_date ? format(formData.inspection_date, 'yyyy-MM-dd') : null
      };

      if (formData.is_oil_changed) {
        vehiclePayload.oil_interval_km = parseInt(formData.oil_interval_km) || 0;
        vehiclePayload.oil_interval_months = parseInt(formData.oil_interval_months) || 0;
      }

      if (formData.is_belt_changed) {
        vehiclePayload.belt_interval_km = parseInt(formData.belt_interval_km) || 0;
        vehiclePayload.belt_interval_months = parseInt(formData.belt_interval_months) || 0;
      }

      const { error: vError } = await supabase
        .from('vehicles')
        .update(vehiclePayload)
        .eq('id', vehicle.id);

      if (vError) throw vError;

      const logPayload = {
        vehicle_id: vehicle.id,
        date: formData.date ? format(formData.date, 'yyyy-MM-dd') : null,
        mileage: parseInt(formData.mileage),
        description: formData.description,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        is_oil_changed: formData.is_oil_changed,
        is_belt_changed: formData.is_belt_changed,
        is_brake_fluid_changed: formData.is_brake_fluid_changed,
        is_oil_filter: formData.is_oil_filter,
        is_air_filter: formData.is_air_filter,
        is_cabin_filter: formData.is_cabin_filter,
        is_fuel_filter: formData.is_fuel_filter,
        image_paths: uploadedPaths
      };

      if (existingLog) {
        const { error: updateError } = await supabase
          .from('service_logs')
          .update(logPayload)
          .eq('id', existingLog.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('service_logs')
          .insert([logPayload]);
        if (insertError) throw insertError;
      }

      if (onSaved) onSaved();
      onClose();

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };


  if (!vehicle) return null;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle>{existingLog ? 'Labot ierakstu' : 'Pievienot ierakstu'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Box sx={{ color: 'error.main', mb: 2, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>{error}</Box>}

          {/* 1. TECHNICAL INSPECTION */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>Tehniskā apskate</Typography>
            <DatePicker
              label="Nākamās tehniskās apskates datums"
              value={formData.inspection_date}
              onChange={(date) => setFormData(prev => ({ ...prev, inspection_date: date }))}
              format="dd/MM/yyyy"
              views={['year', 'month', 'day']}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'dense',
                  sx: { mt: 1 }
                }
              }}
            />
          </Box>
          <Divider sx={{ mb: 3 }} />

          {/* 2. SERVICE LOG RECORD */}
          <Typography variant="h6" color="primary" gutterBottom>Ieraksts</Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <DatePicker
              label="Datums"
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
              format="dd/MM/yyyy"
              disableFuture
              views={['year', 'month', 'day']}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'dense',
                  required: true
                }
              }}
            />
            <TextField
              margin="dense"
              label="Odometra rādījums"
              name="mileage"
              type="number"
              fullWidth
              required
              value={formData.mileage}
              onChange={handleChange}
            />
          </Box>

          <TextField
            margin="dense"
            label="Izmaksas (€)"
            name="cost"
            type="number"
            inputProps={{ step: "0.01" }}
            fullWidth
            value={formData.cost}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Apraksts"
            name="description"
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />

          {/* IMAGE UPLOAD SECTION */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
              Pievienot čekus/bildes (max 5)
            </Typography>
            <input
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading || previews.length >= 5}
              fullWidth
              sx={{ mb: 2 }}
            >
              Izvēlēties failus
            </Button>

            {previews.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {previews.map((src, index) => (
                  <Box key={index} sx={{ position: 'relative', width: 80, height: 80 }}>
                    <img
                      src={src}
                      alt={`Preview ${index}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeFile(index, index < (formData.image_paths?.length || 0))}
                      sx={{
                        position: 'absolute', top: -8, right: -8,
                        bgcolor: 'background.paper', boxShadow: 1,
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      <DeleteIcon fontSize="inherit" color="error" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {(loading || uploading) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Notiek augšupielāde...
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
            {/* Oil Change Checkbox + Inline Intervals */}
            <Box sx={{ mb: formData.is_oil_changed ? 1 : 0 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_oil_changed}
                    onChange={handleChange}
                    name="is_oil_changed"
                    color="primary"
                  />
                }
                label={<LabelWithHint text="Eļļas maiņa" itemKey="is_oil_changed" />}
              />
              {formData.is_oil_changed && (
                <Box sx={{
                  ml: 4, mt: 1, mb: 2, p: 2,
                  bgcolor: 'rgba(0, 51, 20, 0.04)',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                    EĻĻAS MAIŅAS INTERVĀLS
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      margin="dense"
                      label="Kilometri (km)"
                      name="oil_interval_km"
                      type="number"
                      fullWidth
                      required
                      value={formData.oil_interval_km}
                      onChange={handleChange}
                      size="small"
                    />
                    <TextField
                      margin="dense"
                      label="Mēneši"
                      name="oil_interval_months"
                      type="number"
                      fullWidth
                      required
                      value={formData.oil_interval_months}
                      onChange={handleChange}
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Drive System Checkbox + Inline Intervals */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.is_belt_changed}
                    onChange={handleChange}
                    name="is_belt_changed"
                    color="primary"
                  />
                }
                label={(() => {
                  const labels = {
                    'Zobsiksna': 'Zobsiksnas maiņa',
                    'Dzinēja ķēde': 'Dzinēja ķēdes maiņa',
                    'Piedziņas ķēde': 'Piedziņas ķēdes maiņa',
                    'Piedziņas siksna': 'Piedziņas siksnas maiņa',
                    'Kardāns': 'Kardāna eļļas maiņa',
                  };
                  const text = labels[vehicle?.engine_drive_type] ?? 'Piedziņas maiņa';
                  return <LabelWithHint text={text} itemKey="is_belt_changed" />;
                })()}
              />
              {formData.is_belt_changed && (
                <Box sx={{
                  ml: 4, mt: 1, mb: 2, p: 2,
                  bgcolor: 'rgba(0, 51, 20, 0.04)',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                    {vehicle?.engine_drive_type?.toUpperCase()} INTERVĀLS
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      margin="dense"
                      label="Kilometri (km)"
                      name="belt_interval_km"
                      type="number"
                      fullWidth
                      required
                      value={formData.belt_interval_km}
                      onChange={handleChange}
                      size="small"
                    />
                    <TextField
                      margin="dense"
                      label="Mēneši"
                      name="belt_interval_months"
                      type="number"
                      fullWidth
                      required
                      value={formData.belt_interval_months}
                      onChange={handleChange}
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Brake Fluid Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_brake_fluid_changed}
                  onChange={handleChange}
                  name="is_brake_fluid_changed"
                  color="primary"
                />
              }
              label={<LabelWithHint text="Bremžu šķidruma maiņa" itemKey="is_brake_fluid_changed" />}
            />
          </Box>

          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>Filtri</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 3 }}>
            <FormControlLabel
              control={<Checkbox checked={formData.is_oil_filter} onChange={handleChange} name="is_oil_filter" color="primary" />}
              label={<LabelWithHint text="Eļļas filtrs" itemKey="is_oil_filter" />}
            />
            <FormControlLabel
              control={<Checkbox checked={formData.is_air_filter} onChange={handleChange} name="is_air_filter" color="primary" />}
              label={<LabelWithHint text="Gaisa filtrs" itemKey="is_air_filter" />}
            />
            {vehicle?.type === 'Auto' && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={formData.is_cabin_filter} onChange={handleChange} name="is_cabin_filter" color="primary" />}
                  label={<LabelWithHint text="Salona filtrs" itemKey="is_cabin_filter" />}
                />
                <FormControlLabel
                  control={<Checkbox checked={formData.is_fuel_filter} onChange={handleChange} name="is_fuel_filter" color="primary" />}
                  label={<LabelWithHint text="Degvielas filtrs" itemKey="is_fuel_filter" />}
                />
              </>
            )}
          </Box>



        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Atcelt
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saglabā...' : 'Saglabāt'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
