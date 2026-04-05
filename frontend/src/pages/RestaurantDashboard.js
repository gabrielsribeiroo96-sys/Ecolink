import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Leaf, Droplet, TrendingUp, LogOut, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RestaurantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [volume, setVolume] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_oil_collected_liters: 0,
    water_preserved_liters: 0,
    collections_count: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/restaurants/impact-stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePublishOil = async (e) => {
    e.preventDefault();
    
    if (!volume || parseFloat(volume) < 10) {
      toast.error('O volume mínimo para publicação é 10 litros');
      return;
    }

    setLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await axios.post(
              `${BACKEND_URL}/api/restaurants/publish-oil`,
              {
                volume_liters: parseFloat(volume),
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              },
              { withCredentials: true }
            );
            toast.success('Óleo publicado com sucesso! Coletores serão notificados.');
            setVolume('');
            fetchStats();
          } catch (error) {
            toast.error('Erro ao publicar óleo: ' + (error.response?.data?.detail || error.message));
          } finally {
            setLoading(false);
          }
        },
        () => {
          toast.error('Não foi possível obter sua localização');
          setLoading(false);
        }
      );
    } else {
      toast.error('Geolocalização não suportada');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
              <p className="text-sm text-[#4A5D4E]">Restaurante</p>
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
          {/* Publish Oil Card */}
          <Card className="lg:col-span-2 bg-white rounded-2xl p-8 border border-[#D1D9D3] shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1A2E1F] mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Publicar Óleo Disponível
            </h2>
            <p className="text-[#4A5D4E] mb-6">
              Informe a quantidade de óleo usado que você tem armazenado. Volume mínimo: 10 litros.
            </p>
            <form onSubmit={handlePublishOil} className="space-y-6">
              <div>
                <Label htmlFor="volume" className="text-[#1A2E1F] font-medium mb-2 block">
                  Volume (óleo em litros)
                </Label>
                <div className="relative">
                  <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5A91E]" />
                  <Input
                    id="volume"
                    type="number"
                    step="0.1"
                    min="10"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="Ex: 25.5"
                    required
                    data-testid="volume-input"
                    className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-14 text-lg"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !volume || parseFloat(volume) < 10}
                data-testid="publish-oil-button"
                className="w-full bg-[#E5A91E] hover:bg-[#C99115] text-white rounded-full h-14 text-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                <Plus className="w-5 h-5 mr-2" />
                {loading ? 'Publicando...' : 'Publicar no Mapa'}
              </Button>
            </form>
          </Card>

          {/* Impact Stats */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-[#2D5A36] to-[#22452A] text-white rounded-2xl p-6 border-0 shadow-md" data-testid="impact-card">
              <div className="flex items-center gap-3 mb-4">
                <Droplet className="w-8 h-8" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>Total Coletado</h3>
              </div>
              <p className="text-4xl font-bold mb-2" data-testid="total-collected">{stats.total_oil_collected_liters.toFixed(1)}L</p>
              <p className="text-sm opacity-90">Óleo de cozinha usado</p>
            </Card>

            <Card className="bg-gradient-to-br from-[#E5A91E] to-[#C99115] text-white rounded-2xl p-6 border-0 shadow-md" data-testid="water-card">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-8 h-8" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>Água Preservada</h3>
              </div>
              <p className="text-4xl font-bold mb-2" data-testid="water-preserved">{stats.water_preserved_liters.toFixed(0)}L</p>
              <p className="text-sm opacity-90">Impacto ecológico positivo</p>
            </Card>

            <Card className="bg-white rounded-2xl p-6 border border-[#D1D9D3] shadow-sm" data-testid="collections-card">
              <div className="flex items-center gap-3 mb-4">
                <Leaf className="w-8 h-8 text-[#2D5A36]" />
                <h3 className="text-lg font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>Coletas Realizadas</h3>
              </div>
              <p className="text-4xl font-bold text-[#2D5A36] mb-2" data-testid="collections-count">{stats.collections_count}</p>
              <p className="text-sm text-[#4A5D4E]">Contribuições para sustentabilidade</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RestaurantDashboard;
