# Ecolink

Plataforma que conecta restaurantes e coletores de óleo de cozinha usado, facilitando o descarte correto e o reaproveitamento do resíduo.

## Funcionalidades

- Restaurantes publicam volumes de óleo disponíveis para coleta
- Coletores visualizam pontos disponíveis em um mapa (Leaflet/OpenStreetMap)
- Coletores agendam e confirmam coletas
- Restaurantes acompanham histórico de volume e impacto ambiental
- Notificações em tempo real via WebSocket
- Autenticação com JWT (access token + refresh token via cookie)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Radix UI, React Router |
| Backend | Python, FastAPI, Uvicorn |
| Banco de dados | Supabase (PostgreSQL) |
| Mapa | Leaflet + OpenStreetMap (gratuito, sem API key) |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

---

## Estrutura do projeto

```
Ecolink/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/     # Login, Register, RestaurantDashboard, CollectorDashboard, Settings
│   │   ├── contexts/  # AuthContext, ThemeContext
│   │   └── components/
│   ├── vite.config.js
│   └── package.json
├── backend/           # FastAPI
│   ├── server.py
│   ├── requirements.txt
│   └── supabase_schema.sql
```

---

## Configuração do Banco de Dados (Supabase)

### 1. Criar conta e projeto

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie uma conta gratuita (sem cartão)
3. Clique em **New Project** e preencha nome e senha do banco
4. Aguarde o projeto ser criado (~2 minutos)

### 2. Criar as tabelas

1. No dashboard, vá em **SQL Editor**
2. Cole o conteúdo do arquivo `backend/supabase_schema.sql`
3. Clique em **Run**

### 3. Obter as credenciais

1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Secret key** (`sb_secret_...`) → chave do backend

---

## Configuração do Backend (Render)

### 1. Criar conta

1. Acesse [render.com](https://render.com)
2. Faça login com GitHub

### 2. Criar Web Service

1. Clique em **New → Web Service**
2. Conecte o repositório do GitHub
3. Configure:

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Language | `Python` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |

### 3. Variáveis de ambiente

Na aba **Environment**, adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Secret key do Supabase |
| `JWT_SECRET` | Qualquer string aleatória segura |
| `ADMIN_EMAIL` | Email do usuário admin inicial |
| `ADMIN_PASSWORD` | Senha do usuário admin inicial |
| `CORS_ORIGINS` | `*` (ou a URL do frontend) |

4. Clique em **Create Web Service** e aguarde o deploy

---

## Configuração do Frontend (Vercel)

### 1. Criar conta

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub

### 2. Criar projeto

1. Clique em **Add New → Project**
2. Importe o repositório do GitHub
3. Configure:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3. Variável de ambiente

| Variável | Valor |
|---|---|
| `REACT_APP_BACKEND_URL` | URL do backend no Render (ex: `https://ecolink-uybj.onrender.com`) |

4. Clique em **Deploy**

---

## Rodando localmente

### Backend

```bash
cd backend

# Crie o arquivo .env com as variáveis abaixo
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=sb_secret_...
JWT_SECRET=qualquer-string-segura
ADMIN_EMAIL=admin@ecolink.com
ADMIN_PASSWORD=admin123
CORS_ORIGINS=http://localhost:5173

# Instale as dependências
pip install -r requirements.txt

# Rode o servidor
uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Crie o arquivo .env
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env

# Instale as dependências
npm install --legacy-peer-deps

# Rode o servidor de desenvolvimento
npm start
```

Acesse: [http://localhost:5173](http://localhost:5173)

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
| GET | `/api/restaurants/impact-stats` | Estatísticas de impacto |
| GET | `/api/restaurants/volume-history` | Histórico de volume |
| GET | `/api/collectors/available-points` | Pontos disponíveis no mapa |
| POST | `/api/collectors/schedule-collection` | Agendar coleta |
| POST | `/api/collectors/confirm-collection` | Confirmar coleta realizada |
| GET | `/api/collectors/my-collections` | Minhas coletas |
| WS | `/ws/notifications` | Notificações em tempo real |

---

## Observações sobre o plano gratuito

- **Render**: o serviço dorme após 15 minutos de inatividade — o primeiro acesso pode demorar ~30 segundos para acordar
- **Supabase**: projetos pausam após 1 semana sem uso (reative manualmente em [app.supabase.com](https://app.supabase.com))
- **Vercel**: sem limitações relevantes para uso acadêmico
