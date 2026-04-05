import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Leaf, ArrowLeft, User, Mail, Phone, MapPin, FileText, Eye, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { user, checkAuth } = useAuth();
  const { highContrast, toggleHighContrast } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    contact: user?.contact || '',
    cnpj_cpf: user?.cnpj_cpf || '',
    cep: user?.cep || '',
    street: user?.street || '',
    number: user?.number || '',
    complement: user?.complement || '',
    neighborhood: user?.neighborhood || '',
    city: user?.city || '',
    state: user?.state || ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(
        `${BACKEND_URL}/api/profile/update`,
        formData,
        { withCredentials: true }
      );
      toast.success('Perfil atualizado com sucesso!');
      await checkAuth();
    } catch (error) {
      toast.error('Erro ao atualizar perfil: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (user?.role === 'restaurant') {
      navigate('/dashboard/restaurant');
    } else {
      navigate('/dashboard/collector');
    }
  };

  const isRestaurant = user?.role === 'restaurant';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F0E9] via-[#FBFBF9] to-[#FCF3D9]">
      {/* Header */}
      <header className="bg-white border-b border-[#D1D9D3] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBack}
              variant="outline"
              data-testid="back-button"
              className="border-[#D1D9D3] text-[#4A5D4E] hover:bg-[#E8F0E9] rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2D5A36] rounded-full flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1A2E1F]" style={{ fontFamily: "'Outfit', sans-serif" }}>Configurações</h1>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Accessibility Settings */}
          <Card className="bg-white rounded-2xl p-8 border border-[#D1D9D3] shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1A2E1F] mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Acessibilidade
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-[#4A5D4E]" />
                <div>
                  <p className="font-medium text-[#1A2E1F]">Modo Alto Contraste</p>
                  <p className="text-sm text-[#4A5D4E]">Aumenta o contraste das cores para melhor visibilidade</p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={toggleHighContrast}
                data-testid="high-contrast-toggle"
              />
            </div>
          </Card>

          {/* Profile Settings */}
          <Card className="bg-white rounded-2xl p-8 border border-[#D1D9D3] shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1A2E1F] mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Informações do Perfil
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-[#1A2E1F] font-medium mb-2 block">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      data-testid="settings-name-input"
                      className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-[#1A2E1F] font-medium mb-2 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                    <Input
                      id="email"
                      value={user?.email}
                      disabled
                      className="pl-12 bg-[#F0F2EB] border-[#D1D9D3] rounded-xl h-12 opacity-70 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-[#4A5D4E] mt-1">O email não pode ser alterado</p>
                </div>

                <div>
                  <Label htmlFor="contact" className="text-[#1A2E1F] font-medium mb-2 block">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                    <Input
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      data-testid="settings-contact-input"
                      className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cnpj_cpf" className="text-[#1A2E1F] font-medium mb-2 block">CNPJ/CPF</Label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                    <Input
                      id="cnpj_cpf"
                      name="cnpj_cpf"
                      value={formData.cnpj_cpf}
                      onChange={handleChange}
                      placeholder="00.000.000/0000-00"
                      data-testid="settings-cnpj-input"
                      className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section - More detailed for restaurants */}
              {isRestaurant && (
                <div className="mt-8 pt-6 border-t border-[#E2E6D9]">
                  <h3 className="text-xl font-semibold text-[#1A2E1F] mb-4 flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <MapPin className="w-5 h-5" />
                    Endereço Completo
                  </h3>
                  <p className="text-sm text-[#4A5D4E] mb-4">
                    Este endereço será usado automaticamente quando você publicar óleo disponível no mapa.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="cep" className="text-[#1A2E1F] font-medium mb-2 block">CEP</Label>
                      <Input
                        id="cep"
                        name="cep"
                        value={formData.cep}
                        onChange={handleChange}
                        placeholder="00000-000"
                        data-testid="settings-cep-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="street" className="text-[#1A2E1F] font-medium mb-2 block">Rua/Avenida</Label>
                      <Input
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        placeholder="Nome da rua"
                        data-testid="settings-street-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="number" className="text-[#1A2E1F] font-medium mb-2 block">Número</Label>
                      <Input
                        id="number"
                        name="number"
                        value={formData.number}
                        onChange={handleChange}
                        placeholder="123"
                        data-testid="settings-number-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="complement" className="text-[#1A2E1F] font-medium mb-2 block">Complemento</Label>
                      <Input
                        id="complement"
                        name="complement"
                        value={formData.complement}
                        onChange={handleChange}
                        placeholder="Apto, Sala, etc (opcional)"
                        data-testid="settings-complement-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="neighborhood" className="text-[#1A2E1F] font-medium mb-2 block">Bairro</Label>
                      <Input
                        id="neighborhood"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleChange}
                        placeholder="Centro"
                        data-testid="settings-neighborhood-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-[#1A2E1F] font-medium mb-2 block">Cidade</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="São Paulo"
                        data-testid="settings-city-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-[#1A2E1F] font-medium mb-2 block">Estado</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="SP"
                        maxLength={2}
                        data-testid="settings-state-input"
                        className="bg-white border-[#D1D9D3] rounded-xl h-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="border-[#D1D9D3] text-[#4A5D4E] hover:bg-[#E8F0E9] rounded-full px-8"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="save-settings-button"
                  className="bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full px-8"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Account Info */}
          <Card className="bg-white rounded-2xl p-8 border border-[#D1D9D3] shadow-sm">
            <h2 className="text-2xl font-semibold text-[#1A2E1F] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Informações da Conta
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[#E2E6D9]">
                <span className="text-[#4A5D4E]">Tipo de conta:</span>
                <span className="font-medium text-[#1A2E1F] capitalize">
                  {user?.role === 'restaurant' ? 'Restaurante' : 'Coletor'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#4A5D4E]">Conta criada em:</span>
                <span className="font-medium text-[#1A2E1F]">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;
