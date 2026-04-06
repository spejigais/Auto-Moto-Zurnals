import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateMetrics } from '../utils/calculations';
import { useNavigate } from 'react-router-dom';
import VehicleModal from '../components/VehicleModal';

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width:768px)');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          service_logs (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (vehicleId) => {
    navigate(`/vehicle/${vehicleId}`);
  };

  const handleDeleteClick = (e, vehicle) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setDeleteModalOpen(true);
  };

  const handleEditClick = (e, vehicle) => {
    e.stopPropagation();
    setVehicleToEdit(vehicle);
    setAddModalOpen(true);
  };

  const handleAddClick = () => {
    setVehicleToEdit(null);
    setAddModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleToDelete.id);
      if (error) throw error;
      setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Kļūda dzēšot transportlīdzekli: ' + err.message);
    } finally {
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
    }
  };

  const renderVehicleList = (list) => {
    if (list.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary">Nav pievienotu transportlīdzekļu</Typography>
        </Box>
      );
    }

    if (isMobile) {
      return (
        <Grid container spacing={2}>
          {list.map((v) => {
            const metrics = calculateMetrics(v, v.service_logs);
            const driveType = v.engine_drive_type || 'Zobsiksna';
            return (
              <Grid item xs={12} key={v.id}>
                <Card
                  onClick={() => handleRowClick(v.id)}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    pl: v.color ? '6px' : 0, // Padding for the strip
                    overflow: 'hidden'
                  }}
                >
                  {v.color && (
                    <Box
                      sx={{
                        width: '6px',
                        height: '100%',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bgcolor: v.color,
                        zIndex: 1
                      }}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6" color="primary">{v.brand_model} - {v.plate_number}</Typography>
                        <Typography color="text.secondary" gutterBottom>Aktuālais nobraukums: {metrics.currentOdometer} km</Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" color="primary" onClick={(e) => handleEditClick(e, v)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(e, v)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Eļļa: <Box component="span" sx={{ color: metrics.oilColor, fontWeight: 'bold' }}>{metrics.oilRemainingStr}</Box>
                      </Typography>
                      <Typography variant="body2">
                        Piedziņas atlikums ({driveType}): <Box component="span" sx={{ color: metrics.beltColor, fontWeight: 'bold' }}>{metrics.beltRemainingStr}</Box>
                      </Typography>
                      <Typography variant="body2">
                        {(() => {
                          if (!v.inspection_date) return 'Tehniskās apskates datums: Nav datu';
                          const inspectionRemaining = differenceInDays(new Date(v.inspection_date), new Date());
                          const isCritical = inspectionRemaining <= 30;
                          return (
                            <>
                              Tehniskās apskates datums: <Box component="span" sx={{ color: isCritical ? 'error.main' : 'inherit', fontWeight: isCritical ? 'bold' : 'normal' }}>
                                {format(new Date(v.inspection_date), 'dd/MM/yyyy')}
                              </Box>
                            </>
                          );
                        })()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold', color: '#003314' }}>VNZ / Marka un Modelis</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#003314' }}>Aktuālais nobraukums</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#003314' }}>Eļļas atlikums</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#003314' }}>Piedziņas atlikums</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#003314' }}>Tehniskās apskates datums</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: '#003314' }}>Darbības</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((v) => {
              const metrics = calculateMetrics(v, v.service_logs);
              const driveType = v.engine_drive_type || 'Zobsiksna';
              return (
                <TableRow
                  key={v.id}
                  hover
                  onClick={() => handleRowClick(v.id)}
                  sx={{
                    cursor: 'pointer',
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell sx={{ position: 'relative', pl: v.color ? 4 : 2 }}>
                    {v.color && (
                      <Box
                        sx={{
                          width: '6px',
                          height: '100%',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bgcolor: v.color,
                          zIndex: 1
                        }}
                      />
                    )}
                    <Typography fontWeight="bold" color="primary">{v.plate_number}</Typography>
                    <Typography variant="body2" color="text.secondary">{v.brand_model}</Typography>
                  </TableCell>
                  <TableCell>{metrics.currentOdometer} km</TableCell>
                  <TableCell sx={{ color: metrics.oilColor, fontWeight: 'bold' }}>
                    {metrics.oilRemainingStr}
                  </TableCell>
                  <TableCell sx={{ color: metrics.beltColor, fontWeight: 'bold' }}>
                    {driveType}: {metrics.beltRemainingStr}
                  </TableCell>
                  <TableCell sx={(() => {
                    if (!v.inspection_date) return {};
                    const inspectionRemaining = differenceInDays(new Date(v.inspection_date), new Date());
                    return inspectionRemaining <= 30 ? { color: 'error.main', fontWeight: 'bold' } : {};
                  })()}>
                    {v.inspection_date ? format(new Date(v.inspection_date), 'dd/MM/yyyy') : 'Nav datu'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexWrap: 'nowrap',
                      gap: 1
                    }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => handleEditClick(e, v)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => handleDeleteClick(e, v)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const autos = vehicles.filter((v) => v.type === 'Auto');
  const motos = vehicles.filter((v) => v.type === 'Moto');

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Mani transportlīdzekļi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Pievienot transportlīdzekli
        </Button>
      </Box>

      {loading ? (
        <Typography>Ielādē...</Typography>
      ) : (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" color="primary" gutterBottom sx={{ borderBottom: '2px solid', borderColor: 'divider', pb: 1 }}>
              Automašīnas
            </Typography>
            {renderVehicleList(autos)}
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" color="primary" gutterBottom sx={{ borderBottom: '2px solid', borderColor: 'divider', pb: 1 }}>
              Motocikli
            </Typography>
            {renderVehicleList(motos)}
          </Box>
        </>
      )}

      <VehicleModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setVehicleToEdit(null);
        }}
        onVehicleSaved={() => {
          fetchVehicles();
        }}
        vehicleToEdit={vehicleToEdit}
      />

      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Dzēst transportlīdzekli?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vai tiešām vēlaties dzēst {vehicleToDelete?.plate_number} {vehicleToDelete?.brand_model}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} color="inherit">Atcelt</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Dzēst</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
