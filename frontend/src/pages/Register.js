import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Leaf, Mail, Lock, User, MapPin, Phone, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'restaurant',
    cnpj_cpf: '',
    contact: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setFormData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast.success('Endereço preenchido automaticamente!');
    } catch {
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const user = await register(formData);
      toast.success('Conta criada com sucesso!');

      if (user.role === 'restaurant') {
        navigate('/dashboard/restaurant');
      } else {
        navigate('/dashboard/collector');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao criar conta';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F0E9] via-[#FBFBF9] to-[#FCF3D9] p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(45,90,54,0.08)] p-8 border border-[#D1D9D3]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2D5A36] rounded-full mb-4">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-semibold text-[#1A2E1F] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>Criar Conta</h1>
            <p className="text-[#4A5D4E]">Junte-se à rede Ecolink</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-[#1A2E1F] font-medium mb-3 block">Tipo de Conta</Label>
              <RadioGroup value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="restaurant" id="restaurant" className="peer sr-only" data-testid="role-restaurant" />
                  <Label htmlFor="restaurant" className="flex items-center justify-center rounded-xl border-2 border-[#D1D9D3] bg-white p-4 hover:bg-[#E8F0E9] peer-data-[state=checked]:border-[#2D5A36] peer-data-[state=checked]:bg-[#E8F0E9] cursor-pointer transition-all">
                    <span className="text-sm font-medium">Restaurante</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="collector" id="collector" className="peer sr-only" data-testid="role-collector" />
                  <Label htmlFor="collector" className="flex items-center justify-center rounded-xl border-2 border-[#D1D9D3] bg-white p-4 hover:bg-[#E8F0E9] peer-data-[state=checked]:border-[#2D5A36] peer-data-[state=checked]:bg-[#E8F0E9] cursor-pointer transition-all">
                    <span className="text-sm font-medium">Coletor</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Dados pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-[#1A2E1F] font-medium mb-2 block">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Seu nome" required data-testid="register-name-input" className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-[#1A2E1F] font-medium mb-2 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required data-testid="register-email-input" className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-[#1A2E1F] font-medium mb-2 block">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required data-testid="register-password-input" className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-[#1A2E1F] font-medium mb-2 block">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
                {confirmPassword && formData.password !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">As senhas não coincidem</p>
                )}
              </div>

              <div>
                <Label htmlFor="cnpj_cpf" className="text-[#1A2E1F] font-medium mb-2 block">CNPJ/CPF</Label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="cnpj_cpf" name="cnpj_cpf" value={formData.cnpj_cpf} onChange={handleChange} placeholder="00.000.000/0000-00" data-testid="register-cnpj-input" className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>

              <div>
                <Label htmlFor="contact" className="text-[#1A2E1F] font-medium mb-2 block">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                  <Input id="contact" name="contact" value={formData.contact} onChange={handleChange} placeholder="(00) 00000-0000" data-testid="register-contact-input" className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-2 border-t border-[#E2E6D9]">
              <h3 className="text-base font-semibold text-[#1A2E1F] mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep" className="text-[#1A2E1F] font-medium mb-2 block">CEP</Label>
                  <Input id="cep" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} placeholder="00000-000" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="street" className="text-[#1A2E1F] font-medium mb-2 block">Rua/Avenida</Label>
                  <Input id="street" name="street" value={formData.street} onChange={handleChange} placeholder="Nome da rua" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div>
                  <Label htmlFor="number" className="text-[#1A2E1F] font-medium mb-2 block">Número</Label>
                  <Input id="number" name="number" value={formData.number} onChange={handleChange} placeholder="123" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="complement" className="text-[#1A2E1F] font-medium mb-2 block">Complemento</Label>
                  <Input id="complement" name="complement" value={formData.complement} onChange={handleChange} placeholder="Apto, Sala, etc (opcional)" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div>
                  <Label htmlFor="neighborhood" className="text-[#1A2E1F] font-medium mb-2 block">Bairro</Label>
                  <Input id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange} placeholder="Centro" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div>
                  <Label htmlFor="city" className="text-[#1A2E1F] font-medium mb-2 block">Cidade</Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="São Paulo" className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>

                <div>
                  <Label htmlFor="state" className="text-[#1A2E1F] font-medium mb-2 block">Estado</Label>
                  <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="SP" maxLength={2} className="bg-white border-[#D1D9D3] rounded-xl h-12" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="register-submit-button"
              className="w-full bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full h-12 font-medium"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#4A5D4E] text-sm">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-[#2D5A36] hover:text-[#22452A] font-medium" data-testid="login-link">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
