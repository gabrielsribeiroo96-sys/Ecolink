import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Leaf, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Login realizado com sucesso!');
      
      if (user.role === 'restaurant') {
        navigate('/dashboard/restaurant');
      } else {
        navigate('/dashboard/collector');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8F0E9] via-[#FBFBF9] to-[#FCF3D9] p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(45,90,54,0.08)] p-8 border border-[#D1D9D3]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2D5A36] rounded-full mb-4">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-semibold text-[#1A2E1F] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>Ecolink</h1>
            <p className="text-[#4A5D4E]">Logística reversa de óleo sustentável</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-[#1A2E1F] font-medium mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  data-testid="login-email-input"
                  className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12 focus:ring-2 focus:ring-[#2D5A36]/20 focus:border-[#2D5A36]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[#1A2E1F] font-medium mb-2 block">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A5D4E]" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                  className="pl-12 bg-white border-[#D1D9D3] rounded-xl h-12 focus:ring-2 focus:ring-[#2D5A36]/20 focus:border-[#2D5A36]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#2D5A36] hover:bg-[#22452A] text-white rounded-full h-12 font-medium transition-colors duration-200"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#4A5D4E] text-sm">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-[#2D5A36] hover:text-[#22452A] font-medium" data-testid="register-link">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
