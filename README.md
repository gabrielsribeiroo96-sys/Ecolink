# Ecolink

Plataforma que conecta restaurantes e coletores de óleo de cozinha usado, facilitando o descarte correto e o reaproveitamento do resíduo.

- **Repositório:** https://github.com/gabrielsribeiroo96-sys/Ecolink
- **Aplicação em produção:** https://ecolink-iota.vercel.app/login

---

## Funcionalidades

- Restaurantes publicam volumes de óleo disponíveis para coleta
- Coletores visualizam pontos disponíveis em um mapa interativo
- Coletores agendam e confirmam coletas
- Restaurantes acompanham histórico de volume e impacto ambiental (litros coletados, água preservada)
- Notificações em tempo real via WebSocket
- Autenticação com JWT (access token + refresh token via cookie HttpOnly)
- Preenchimento automático de endereço por CEP (API ViaCEP)
- Geocodificação automática de endereço para exibição no mapa (Nominatim/OpenStreetMap)
- Modo alto contraste de acessibilidade

---

## Tecnologias

### Frontend — JavaScript

| Tecnologia | Versão | Função |
|---|---|---|
| **React** | 19 | Framework principal de UI |
| **Vite** | 5 | Bundler e servidor de desenvolvimento |
| **React Router DOM** | 7 | Roteamento de páginas (SPA) |
| **Tailwind CSS** | 3 | Estilização utilitária |
| **Radix UI** | — | Componentes acessíveis (modais, selects, switches, etc.) |
| **Leaflet + React Leaflet** | 1.9 / 5 | Mapa interativo com OpenStreetMap (sem API key) |
| **Axios** | 1.8 | Requisições HTTP para o backend |
| **React Hook Form** | 7 | Gerenciamento de formulários |
| **Zod** | 3 | Validação de schemas |
| **Recharts** | 3 | Gráficos de histórico de volume |
| **Sonner** | 2 | Notificações toast |
| **Lucide React** | — | Ícones |
| **date-fns** | 4 | Manipulação de datas |

### Backend — Python

| Tecnologia | Versão | Função |
|---|---|---|
| **Python** | 3.14 | Linguagem do servidor |
| **FastAPI** | 0.115+ | Framework web assíncrono (REST + WebSocket) |
| **Uvicorn** | 0.30+ | Servidor ASGI para rodar o FastAPI |
| **Pydantic** | 2.12 | Validação e serialização de dados |
| **PyJWT** | 2.12 | Geração e verificação de tokens JWT |
| **bcrypt** | 4.1 | Hash seguro de senhas |
| **supabase-py** | 2.28 | Cliente Python para o Supabase (PostgreSQL) |
| **python-dotenv** | 1.2 | Carregamento de variáveis de ambiente |
| **requests** | 2.32 | Requisições HTTP (geocodificação via Nominatim) |
| **Starlette CORS** | — | Middleware de CORS para aceitar requisições do frontend |

### Banco de Dados

| Tecnologia | Função |
|---|---|
| **Supabase** | Banco de dados PostgreSQL gerenciado na nuvem |
| **PostgreSQL** | Banco relacional com 4 tabelas: `users`, `oil_publications`, `collections`, `volume_history` |

### Integrações Externas (todas gratuitas, sem API key)

| Serviço | Função |
|---|---|
| **ViaCEP** (`viacep.com.br`) | Autocompletar endereço pelo CEP |
| **Nominatim / OpenStreetMap** | Geocodificação: converte endereço em coordenadas (lat/lng) |
| **Leaflet / OpenStreetMap** | Renderização do mapa no frontend |

---

## Infraestrutura — 100% gratuita

| Serviço | Plano | Função | Link |
|---|---|---|---|
| **Vercel** | Hobby (grátis, sem cartão) | Hospedagem do frontend | [vercel.com](https://vercel.com) |
| **Render** | Free (grátis, sem cartão) | Hospedagem do backend (FastAPI) | [render.com](https://render.com) |
| **Supabase** | Free (grátis, sem cartão) | Banco de dados PostgreSQL na nuvem | [supabase.com](https://supabase.com) |
| **GitHub** | Free | Repositório e integração com CI/CD | [github.com](https://github.com) |

> O deploy é automático: qualquer push na branch `main` atualiza o frontend (Vercel) e o backend (Render) automaticamente.

---

## Estrutura do Projeto

```
Ecolink/
├── frontend/                   # Aplicação React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── RestaurantDashboard.js
│   │   │   ├── CollectorDashboard.js
│   │   │   └── Settings.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   └── components/ui/      # Componentes Radix UI
│   ├── vite.config.js
│   └── package.json
│
├── backend/                    # API FastAPI
│   ├── server.py               # Toda a lógica da API
│   ├── requirements.txt        # Dependências Python
│   └── supabase_schema.sql     # SQL para criar as tabelas no Supabase
│
└── README.md
```

---

## Configuração do Banco de Dados (Supabase)

1. Acesse [app.supabase.com](https://app.supabase.com) e crie uma conta gratuita
2. Crie um novo projeto
3. Vá em **SQL Editor**, cole o conteúdo de `backend/supabase_schema.sql` e clique em **Run**
4. Vá em **Settings → API** e copie:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Secret key** (`sb_secret_...`)

---

## Configuração do Backend (Render)

1. Acesse [render.com](https://render.com) e faça login com GitHub
2. Clique em **New → Web Service** e conecte o repositório
3. Configure:

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Language | `Python` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |

4. Em **Environment**, adicione as variáveis:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Secret key do Supabase |
| `JWT_SECRET` | Qualquer string aleatória segura |
| `ADMIN_EMAIL` | Email do usuário admin inicial |
| `ADMIN_PASSWORD` | Senha do usuário admin inicial |
| `CORS_ORIGINS` | URL do frontend no Vercel |

---

## Configuração do Frontend (Vercel)

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project** e importe o repositório
3. Configure:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `20.x` |

4. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `REACT_APP_BACKEND_URL` | URL do backend no Render |

---

## Rodando Localmente

### Backend

```bash
cd backend

# Crie o arquivo .env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=sb_secret_...
JWT_SECRET=qualquer-string-segura
ADMIN_EMAIL=admin@ecolink.com
ADMIN_PASSWORD=admin123
CORS_ORIGINS=http://localhost:5173

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor
uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Crie o arquivo .env
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env

# Instale as dependências
npm install --legacy-peer-deps

# Inicie o servidor de desenvolvimento
npm start
```

Acesse: http://localhost:5173

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro de usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Dados do usuário autenticado |
| POST | `/api/auth/logout` | Logout |
| PUT | `/api/profile/update` | Atualizar perfil e endereço |
| POST | `/api/restaurants/publish-oil` | Publicar óleo disponível |
| GET | `/api/restaurants/impact-stats` | Estatísticas de impacto ambiental |
| GET | `/api/restaurants/volume-history` | Histórico de volume publicado/coletado |
| GET | `/api/collectors/available-points` | Pontos disponíveis para coleta no mapa |
| POST | `/api/collectors/schedule-collection` | Agendar coleta |
| POST | `/api/collectors/confirm-collection` | Confirmar coleta realizada |
| GET | `/api/collectors/my-collections` | Histórico de coletas do coletor |
| WS | `/ws/notifications` | Notificações em tempo real (WebSocket) |

---

## Observações sobre o Plano Gratuito

- **Render**: o serviço entra em modo sleep após 15 min de inatividade. O primeiro acesso pode demorar ~30 segundos para acordar o servidor
- **Supabase**: projetos pausam automaticamente após 1 semana sem uso — reative em [app.supabase.com](https://app.supabase.com)
- **Vercel**: sem limitações relevantes para uso acadêmico, deploy automático a cada push
