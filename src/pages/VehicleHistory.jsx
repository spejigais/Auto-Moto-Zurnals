import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { ArrowBack, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import ServiceLogModal from '../components/ServiceLogModal';
import { getMaintenanceHint } from '../utils/maintenanceHints';

export default function VehicleHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedImagePath, setExpandedImagePath] = useState(null);
  const [expandedImageLogId, setExpandedImageLogId] = useState(null);

  const fetchVehicleAndLogs = async (isInitial = true) => {
    try {
      if (isInitial) {
        setLoading(true);
        setPage(0);
      } else {
        setFetchingMore(true);
      }

      // Fetch vehicle (only on initial load)
      if (isInitial) {
        const { data: vData, error: vError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (vError) throw vError;
        setVehicle(vData);
      }

      // Fetch logs
      const start = isInitial ? 0 : (page + 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data: lData, error: lError, count } = await supabase
        .from('service_logs')
        .select('*', { count: 'exact' })
        .eq('vehicle_id', id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(start, end);

      if (lError) throw lError;
      
      const fetchedLogs = lData || [];
      let updatedLogs = [];
      
      if (isInitial) {
        updatedLogs = fetchedLogs;
        setLogs(updatedLogs);
        // Smart Onboarding: Open modal if brand new vehicle
        if (fetchedLogs.length === 0 && !firstLoadDone) {
          setModalOpen(true);
        }
        setFirstLoadDone(true);
      } else {
        updatedLogs = [...logs, ...fetchedLogs];
        setLogs(updatedLogs);
        setPage(prev => prev + 1);
      }

      // Robust check for more records
      setHasMore(updatedLogs.length < (count || 0));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVehicleAndLogs(true);
    }
  }, [id]);

  const handleLoadMore = () => {
    fetchVehicleAndLogs(false);
  };

  const handleAddLog = () => {
    setEditingLog(null);
    setModalOpen(true);
  };

  const handleEditLog = (log) => {
    setEditingLog(log);
    setModalOpen(true);
  };

  const handleDeleteLog = (log) => {
    setLogToDelete(log);
    setDeleteModalOpen(true);
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      // Cascading storage deletion
      if (logToDelete.image_paths && logToDelete.image_paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove(logToDelete.image_paths);
        
        if (storageError) {
          console.error('Error deleting images from storage:', storageError);
          // We continue anyway to delete the record, but log the error
        }
      }

      const { error } = await supabase.from('service_logs').delete().eq('id', logToDelete.id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== logToDelete.id));
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Kļūda dzēšot ierakstu: ' + err.message);
    } finally {
      setDeleteModalOpen(false);
      setLogToDelete(null);
    }
  };

  const handleDeleteImage = async (logId, imagePath) => {
    if (!logId || !imagePath) return;

    const confirmDelete = window.confirm("Vai tiešām vēlaties dzēst šo attēlu?");
    if (!confirmDelete) return;

    try {
      // 1. Delete from Storage
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove([imagePath]);
      
      if (storageError) throw storageError;

      // 2. Update DB
      const logToUpdate = logs.find(l => l.id === logId);
      if (logToUpdate) {
        const newPaths = logToUpdate.image_paths.filter(p => p !== imagePath);
        const { error: dbError } = await supabase
          .from('service_logs')
          .update({ image_paths: newPaths })
          .eq('id', logId);
        
        if (dbError) throw dbError;

        // 3. Update local state
        setLogs(prev => prev.map(l => 
          l.id === logId ? { ...l, image_paths: newPaths } : l
        ));

        // 4. Close viewer if no images left
        if (newPaths.length === 0) {
          setExpandedImage(null);
          setExpandedImagePath(null);
          setExpandedImageLogId(null);
        } else {
          // Just clear the current viewing state if it's the one we deleted
          setExpandedImage(null);
          setExpandedImagePath(null);
          setExpandedImageLogId(null);
        }
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Kļūda dzēšot attēlu: ' + err.message);
    }
  };

  if (loading) {
    return <Container sx={{ mt: 4 }}><Typography>Ielādē vēsturi...</Typography></Container>;
  }

  if (!vehicle) {
    return <Container sx={{ mt: 4 }}><Typography>Transportlīdzeklis nav atrasts.</Typography></Container>;
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {vehicle.brand_model} - Vēsture
        </Typography>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Typography color="text.secondary">VNZ: {vehicle.plate_number} | Tips: {vehicle.type}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddLog}>
          Pievienot ierakstu
        </Button>
      </Box>

      {logs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography color="text.secondary">Nav servisa ierakstu. Pievieno savu pirmo ierakstu!</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {logs.map((log, i) => {
            const diff = logs[i + 1] ? log.mileage - logs[i + 1].mileage : null;
            return (
            <Grid item xs={12} key={log.id}>
              <Card sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{format(new Date(log.date), 'dd/MM/yyyy')}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">{log.mileage} km</Typography>
                      {diff !== null && diff > 0 && (
                        <Typography variant="caption" color="text.secondary">(+ {diff} km)</Typography>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 1.5 }}>{log.description || 'Nav apraksta'}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {log.is_oil_changed && (
                      <Tooltip
                        title={getMaintenanceHint('is_oil_changed', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Mainīta eļļa" color="primary" />
                      </Tooltip>
                    )}
                    {log.is_belt_changed && (
                      <Tooltip
                        title={getMaintenanceHint('is_belt_changed', vehicle?.type, vehicle?.engine_drive_type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Apkopta piedziņa" color="secondary" />
                      </Tooltip>
                    )}
                    {log.is_brake_fluid_changed && (
                      <Tooltip
                        title={getMaintenanceHint('is_brake_fluid_changed', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Bremžu šķidrums" color="warning" />
                      </Tooltip>
                    )}
                    {log.is_oil_filter && (
                      <Tooltip
                        title={getMaintenanceHint('is_oil_filter', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Eļļas filtrs" color="info" variant="outlined" />
                      </Tooltip>
                    )}
                    {log.is_air_filter && (
                      <Tooltip
                        title={getMaintenanceHint('is_air_filter', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Gaisa filtrs" color="info" variant="outlined" />
                      </Tooltip>
                    )}
                    {log.is_cabin_filter && (
                      <Tooltip
                        title={getMaintenanceHint('is_cabin_filter', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Salona filtrs" color="info" variant="outlined" />
                      </Tooltip>
                    )}
                    {log.is_fuel_filter && (
                      <Tooltip
                        title={getMaintenanceHint('is_fuel_filter', vehicle?.type)}
                        arrow placement="top"
                        slotProps={{ tooltip: { sx: { fontSize: '13px', fontWeight: 'bold', whiteSpace: 'pre-line', maxWidth: 'none' } } }}
                      >
                        <Chip size="small" label="Degvielas filtrs" color="info" variant="outlined" />
                      </Tooltip>
                    )}
                    {log.cost && <Chip size="small" label={`€${log.cost}`} color="error" sx={{ fontWeight: 'bold' }} />}
                  </Box>

                  {/* LOG IMAGES */}
                  {log.image_paths && log.image_paths.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {log.image_paths.map((path, idx) => {
                        const publicUrl = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
                        return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              width: 60, height: 60, borderRadius: 1, overflow: 'hidden', 
                              cursor: 'pointer', border: '1px solid', borderColor: 'divider',
                              transition: 'transform 0.1s', '&:hover': { transform: 'scale(1.05)' }
                            }}
                            onClick={() => { 
                              setExpandedImage(publicUrl); 
                              setExpandedImagePath(path);
                              setExpandedImageLogId(log.id);
                            }}
                          >
                            <img 
                              src={publicUrl} 
                              alt={`Receipt ${idx}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <IconButton onClick={() => handleEditLog(log)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteLog(log)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {hasMore && logs.length > 0 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={handleLoadMore} 
            disabled={fetchingMore}
            sx={{ minWidth: 200 }}
          >
            {fetchingMore ? 'Ielādē...' : 'Ielādēt vairāk'}
          </Button>
        </Box>
      )}

      <ServiceLogModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        vehicle={vehicle}
        existingLog={editingLog}
        logs={logs}
        onSaved={fetchVehicleAndLogs}
      />

      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Dzēst ierakstu?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vai tiešām vēlaties dzēst šo ierakstu?
            {logToDelete?.image_paths?.length > 0 && " Tiks izdzēsti arī visi pievienotie attēli."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} color="inherit">Atcelt</Button>
          <Button onClick={confirmDeleteLog} color="error" variant="contained">Dzēst</Button>
        </DialogActions>
      </Dialog>

      {/* Image Expansion Dialog */}
      <Dialog 
        open={Boolean(expandedImage)} 
        onClose={() => { 
          setExpandedImage(null); 
          setExpandedImagePath(null); 
          setExpandedImageLogId(null);
        }}
        maxWidth="md"
      >
        <Box sx={{ position: 'relative', bgcolor: 'black', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {expandedImage && (
            <img 
              src={expandedImage} 
              alt="Expanded receipt" 
              style={{ display: 'block', maxWidth: '100%', maxHeight: '90vh' }} 
            />
          )}
          
          {/* Top Right: Delete Button */}
          <IconButton 
            onClick={() => handleDeleteImage(expandedImageLogId, expandedImagePath)}
            sx={{ 
              position: 'absolute', top: 8, right: 8, color: 'white', 
              bgcolor: 'rgba(0,0,0,0.3)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
            }}
            title="Dzēst attēlu"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Dialog>
    </Container>
  );
}
