# Expense Organizer

Sistema de organização de despesas pessoais/familiares com suporte a divisão de gastos entre pessoas.

## Estrutura do Projeto

```
expense_organizer/
├── frontend/          # Aplicação React (Vite + TypeScript + MUI)
├── backend/           # API Node.js (Express + TypeScript + PostgreSQL)
├── docker-compose.yml # Orquestração dos containers
└── README.md
```

## 🐳 Deploy com Docker (Recomendado para VPS)

A forma mais fácil de rodar o projeto em produção é usando Docker.

### Requisitos
- Docker 20+
- Docker Compose 2+

### Configuração Rápida

1. **Clone o repositório:**
```bash
git clone https://github.com/francoggm/expense_organizer.git
cd expense_organizer
```

2. **Configure as variáveis de ambiente:**
```bash
cp .env.docker.example .env
```

3. **Edite o arquivo `.env` com suas configurações:**
```env
# Database
DB_USER=expense_user
DB_PASSWORD=sua_senha_segura_do_banco
DB_NAME=expense_organizer

# Authentication (IMPORTANTE: altere em produção!)
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres
JWT_EXPIRES_IN=7d
ACCESS_PASSWORD=sua_senha_de_acesso_ao_sistema

# CORS (altere para seu domínio em produção)
CORS_ORIGIN=http://seu-dominio.com
```

4. **Inicie os containers:**
```bash
docker-compose up -d
```

5. **Acesse a aplicação:**
- Frontend: http://localhost (porta 80)
- Backend API: http://localhost:3001
- Health check: http://localhost/health

### Comandos Docker Úteis

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Parar todos os containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados do banco!)
docker-compose down -v

# Reconstruir containers após alterações
docker-compose up -d --build

# Reiniciar um serviço específico
docker-compose restart backend
```

### Arquitetura Docker

O projeto usa 3 containers:

| Serviço | Imagem | Porta | Descrição |
|---------|--------|-------|-----------|
| `postgres` | postgres:16-alpine | 5432 | Banco de dados PostgreSQL |
| `backend` | Node.js 20 Alpine | 3001 | API Express |
| `frontend` | Nginx Alpine | 80 | Frontend React (SPA) |

**Características:**
- ✅ `restart: always` - Containers reiniciam automaticamente
- ✅ Health checks - Monitoramento de saúde dos serviços
- ✅ Volume persistente - Dados do PostgreSQL são preservados
- ✅ Rede interna - Comunicação segura entre containers
- ✅ Multi-stage builds - Imagens otimizadas para produção

---

## 💻 Desenvolvimento Local (Sem Docker)

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Configuração

#### 1. Banco de Dados

1. Crie um banco de dados PostgreSQL:
```sql
CREATE DATABASE expense_organizer;
```

2. Execute o script de criação das tabelas:
```bash
psql -d expense_organizer -f backend/database/schema.sql
```

#### 2. Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações:
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_organizer
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# Authentication
JWT_SECRET=sua_chave_secreta_muito_segura_aqui
JWT_EXPIRES_IN=7d
ACCESS_PASSWORD=sua_senha_de_acesso

# CORS
CORS_ORIGIN=http://localhost:5173
```

5. Inicie o servidor:
```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm run build
npm start
```

#### 3. Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` se necessário:
```env
VITE_API_URL=http://localhost:3001/api
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse http://localhost:5173

---

## Uso

1. Ao acessar a aplicação, você será solicitado a inserir a senha configurada em `ACCESS_PASSWORD`
2. Após autenticação, você terá acesso completo ao sistema

## Funcionalidades

- **Dashboard**: Visão geral das despesas e resumos
- **Pessoas**: Gerenciamento de pessoas que compartilham despesas
- **Contas Fixas**: Despesas recorrentes mensais (aluguel, internet, etc.)
- **Despesas Variáveis**: Gastos pontuais (compras, restaurantes, etc.)
- **Resumo Mensal**: Visualização detalhada por mês
- **Relatórios**: Gráficos e análises de gastos
- **Configurações**: Tema, moeda, backup/restore de dados

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login com senha
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/logout` - Logout

### Pessoas
- `GET /api/people` - Listar todas
- `GET /api/people/:id` - Buscar por ID
- `POST /api/people` - Criar
- `PUT /api/people/:id` - Atualizar
- `DELETE /api/people/:id` - Remover

### Despesas
- `GET /api/expenses` - Listar todas
- `GET /api/expenses/:id` - Buscar por ID
- `POST /api/expenses` - Criar
- `POST /api/expenses/bulk` - Criar múltiplas (parcelas)
- `PUT /api/expenses/:id` - Atualizar
- `DELETE /api/expenses/:id` - Remover
- `DELETE /api/expenses/group/:groupId` - Remover grupo de parcelas
- `PATCH /api/expenses/:id/split/:personId/paid` - Marcar divisão como paga
- `PATCH /api/expenses/:id/monthly-payment` - Marcar pagamento mensal

### Categorias
- `GET /api/categories` - Listar todas
- `GET /api/categories/:id` - Buscar por ID
- `POST /api/categories` - Criar
- `PUT /api/categories/:id` - Atualizar
- `DELETE /api/categories/:id` - Remover
- `POST /api/categories/reset` - Resetar para padrão

### Configurações
- `GET /api/settings` - Obter configurações
- `PUT /api/settings` - Atualizar configurações

### Backup
- `GET /api/backup/export` - Exportar todos os dados
- `POST /api/backup/import` - Importar dados
- `DELETE /api/backup/clear` - Limpar todos os dados

## Tecnologias

### Frontend
- React 19
- TypeScript
- Vite
- Material-UI (MUI)
- React Router
- Recharts (gráficos)

### Backend
- Node.js 20
- Express
- TypeScript
- PostgreSQL 16
- JWT (autenticação)
- bcryptjs (hash de senha)

### Infraestrutura
- Docker & Docker Compose
- Nginx (proxy reverso)
- Multi-stage builds

## Licença

MIT