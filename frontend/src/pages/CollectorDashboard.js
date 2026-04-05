import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Leaf, LogOut, MapPin, Calendar, CheckCircle, Droplet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CollectorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [availablePoints, setAvailablePoints] = useState([]);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [collections, setCollections] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectedVolume, setCollectedVolume] = useState('');
  const [ws, setWs] = useState(null);

  const fetchAvailablePoints = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/collectors/available-points`, {
        withCredentials: true
      });
      setAvailablePoints(response.data);
    } catch (error) {
      console.error('Error fetching available points:', error);
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/collectors/my-collections`, {
        withCredentials: true
      });
      setCollections(response.data);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, []);

  useEffect(() => {
    fetchAvailablePoints();
    fetchCollections();

    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const websocket = new WebSocket(`${wsUrl}/ws/notifications`);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_publication') {
        toast.success(`Nova publicação: ${data.data.restaurant_name} - ${data.data.volume_liters}L`);
        fetchAvailablePoints();
      }
    };

    websocket.onerror = () => {
      console.error('WebSocket error');
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [fetchAvailablePoints, fetchCollections]);

  const handleSelectPoint = (publicationId) => {
    if (selectedPoints.includes(publicationId)) {
      setSelectedPoints(selectedPoints.filter(id => id !== publicationId));
    } else {
      setSelectedPoints([...selectedPoints, publicationId]);
    }
  };

  const handleScheduleClick = () => {
    if (selectedPoints.length === 0) {
      toast.error('Selecione pelo menos um ponto de coleta');
      return;
    }
    setShowScheduleDialog(true);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduledDate) {
      toast.error('Selecione uma data');
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/collectors/schedule-collection`,
        {
          publication_ids: selectedPoints,
          scheduled_date: scheduledDate
        },
        { withCredentials: true }
      );
      toast.success('Coletas agendadas com sucesso!');
      setShowScheduleDialog(false);
      setSelectedPoints([]);
      setScheduledDate('');
      fetchAvailablePoints();
      fetchCollections();
    } catch (error) {
      toast.error('Erro ao agendar coletas: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleConfirmClick = (collection) => {
    setSelectedCollection(collection);
    setCollectedVolume(collection.scheduled_volume.toString());
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!collectedVolume || parseFloat(collectedVolume) <= 0) {
      toast.error('Informe o volume coletado');
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/collectors/confirm-collection`,
        {
          collection_id: selectedCollection.collection_id,
          collected_volume: parseFloat(collectedVolume)
        },
        { withCredentials: true }
      );
      toast.success('Coleta confirmada com sucesso!');
      setShowConfirmDialog(false);
      setSelectedCollection(null);
      setCollectedVolume('');
      fetchCollections();
    } catch (error) {
      toast.error('Erro ao confirmar coleta: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleLogout = async () => {
    if (ws) {
      ws.close();
    }
    await logout();
    navigate('/login');
  };

  const center = availablePoints.length > 0 && availablePoints[0].location
    ? [availablePoints[0].location.coordinates[1], availablePoints[0].location.coordinates[0]]
    : [-23.5505, -46.6333]; // Default to São Paulo

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F0E9] via-[#FBFBF9] to-[#FCF3D9]">
      {/* Header */}
      <header className="bg-white border-b border-[#D1D9D3] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D5A36] rounded-full flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>Ecolink</h1>
              <p className="text-sm text-[#4A5D4E]">Coletor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[#1A2E1F]" data-testid="user-name">{user?.name}</p>
              <p className="text-xs text-[#4A5D4E]">{user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              data-testid="logout-button"
              className="border-[#D1D9D3] text-[#4A5D4E] hover:bg-[#E8F0E9] rounded-full"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <Card className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#D1D9D3] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Pontos Disponíveis
              </h2>
              <Button
                onClick={handleScheduleClick}
                disabled={selectedPoints.length === 0}
                data-testid="schedule-button"
                className="bg-[#E5A91E] hover:bg-[#C99115] text-white rounded-full px-6 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agendar ({selectedPoints.length})
              </Button>
            </div>
            <div className="h-[500px] rounded-2xl overflow-hidden border border-[#D1D9D3]" data-testid="map-container">
              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {availablePoints.map((point) => (
                  point.location && (
                    <Marker
                      key={point.publication_id}
                      position={[point.location.coordinates[1], point.location.coordinates[0]]}
                      icon={customIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-semibold text-[#1A2E1F] mb-1">{point.restaurant_name}</h3>
                          <p className="text-sm text-[#4A5D4E] mb-1">{point.restaurant_address}</p>
                          <p className="text-sm font-medium text-[#E5A91E] mb-2">
                            <Droplet className="w-4 h-4 inline mr-1" />
                            {point.volume_liters}L
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleSelectPoint(point.publication_id)}
                            data-testid={`select-point-${point.publication_id}`}
                            className={`w-full rounded-full ${
                              selectedPoints.includes(point.publication_id)
                                ? 'bg-[#2D5A36] hover:bg-[#22452A]'
                                : 'bg-white border border-[#2D5A36] text-[#2D5A36] hover:bg-[#E8F0E9]'
                            }`}
                          >
                            {selectedPoints.includes(point.publication_id) ? 'Selecionado ✓' : 'Selecionar'}
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            </div>
          </Card>

          {/* Collections List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Minhas Coletas
            </h2>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2" data-testid="collections-list">
              {collections.length === 0 ? (
                <Card className="bg-white rounded-xl p-6 border border-[#D1D9D3] text-center">
                  <p className="text-[#4A5D4E]">Nenhuma coleta agendada</p>
                </Card>
              ) : (
                collections.map((collection) => (
                  <Card
                    key={collection.collection_id}
                    className="bg-white rounded-xl p-4 border border-[#D1D9D3] shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`collection-${collection.collection_id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-[#1A2E1F]">{collection.restaurant_name}</h3>
                        <p className="text-sm text-[#4A5D4E]">
                          <Droplet className="w-3 h-3 inline mr-1" />
                          {collection.scheduled_volume}L
                        </p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          collection.status === 'completed'
                            ? 'bg-[#E8F0E9] text-[#2D5A36]'
                            : 'bg-[#FCF3D9] text-[#E5A91E]'
                        }`}
                      >
                        {collection.status === 'completed' ? 'Concluída' : 'Agendada'}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A5D4E] mb-3">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(collection.scheduled_date).toLocaleDateString('pt-BR')}
                    </p>
                    {collection.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmClick(collection)}
                        data-testid={`confirm-collection-${collection.collection_id}`}
                        className="w-full bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar Coleta
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="bg-white rounded-2xl border border-[#D1D9D3]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Agendar Coletas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-[#4A5D4E]">
              Você está agendando <strong>{selectedPoints.length}</strong> coleta(s).
            </p>
            <div>
              <Label htmlFor="scheduled_date" className="text-[#1A2E1F] font-medium mb-2 block">
                Data da Coleta
              </Label>
              <Input
                id="scheduled_date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                data-testid="schedule-date-input"
                className="bg-white border-[#D1D9D3] rounded-xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              className="border-[#D1D9D3] rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleSubmit}
              data-testid="confirm-schedule-button"
              className="bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full"
            >
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Collection Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-white rounded-2xl border border-[#D1D9D3]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Confirmar Coleta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCollection && (
              <>
                <p className="text-[#4A5D4E]">
                  <strong>{selectedCollection.restaurant_name}</strong>
                </p>
                <div>
                  <Label htmlFor="collected_volume" className="text-[#1A2E1F] font-medium mb-2 block">
                    Volume Coletado (litros)
                  </Label>
                  <Input
                    id="collected_volume"
                    type="number"
                    step="0.1"
                    value={collectedVolume}
                    onChange={(e) => setCollectedVolume(e.target.value)}
                    data-testid="collected-volume-input"
                    className="bg-white border-[#D1D9D3] rounded-xl h-12"
                  />
                  <p className="text-xs text-[#4A5D4E] mt-1">
                    Volume agendado: {selectedCollection.scheduled_volume}L
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-[#D1D9D3] rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              data-testid="confirm-collection-button"
              className="bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorDashboard;
