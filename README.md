# ContentHub

Aplicativo Expo / React Native com catálogo público de entretenimento, pesquisa em tempo real, autenticação JWT, área administrativa com controle de acesso por proprietário (RBAC/BOLA guard), gerenciamento completo de imagens e API RESTful Express integrada ao MongoDB Atlas.

---

## 🏛️ Arquitetura do Sistema — C4 Model

O sistema foi modelado utilizando a metodologia **C4 Model** (Context, Containers, Components, Code), fornecendo diferentes níveis de abstração técnica para fácil compreensão arquitetural.

### Nível 1: Diagrama de Contexto (System Context)
Apresenta o sistema ContentHub no centro de seu ecossistema, destacando os atores humanos e as integrações externas fundamentais.

```mermaid
flowchart TB
    subgraph Users["Atores do Sistema"]
        Visitor["👤 Visitante<br><i>[Pessoa]</i><br>Acessa a tela inicial, navega pelo catálogo e realiza pesquisas."]
        Member["👤 Usuário Autenticado<br><i>[Pessoa]</i><br>Cadastra títulos, altera conteúdos próprios e gerencia seu perfil."]
    end

    System["🏢 ContentHub<br><i>[Sistema de Software]</i><br>Plataforma móvel de catálogo de entretenimento e administração."]

    DB[("🍃 MongoDB Atlas<br><i>[Banco NoSQL em Nuvem]</i><br>Persistência de usuários e catálogo de conteúdos.")]
    Storage[("📁 Sistema de Arquivos<br><i>[Disco Local / server/uploads]</i><br>Armazenamento físico de pôsteres e avatares.")]

    Visitor -->|"Navega e pesquisa [HTTP / JSON]"| System
    Member -->|"Cadastra, edita e envia imagens [HTTP / JWT]"| System
    System -->|"Lê e grava documentos [Protocolo Mongoose/SRV]"| DB
    System -->|"Salva e exclui arquivos de mídia [I/O em Disco]"| Storage
```

---

### Nível 2: Diagrama de Contêineres (Containers)
Evidencia a separação física e lógica entre os ambientes de Frontend (Mobile Client), Backend (API REST) e camadas de persistência.

```mermaid
flowchart TB
    User["👤 Usuário / Visitante"]

    subgraph ContentHubSystem["ContentHub System"]
        MobileApp["📱 Mobile App Client<br><i>[React Native · Expo SDK 57 · React Native Paper]</i><br>Interface do usuário com catálogo público, navegação Drawer/Stack e sessão segura via Expo SecureStore."]
        API["⚙️ Backend API REST<br><i>[Node.js · Express 5 · Mongoose]</i><br>Lógica de negócio, controle de sessão JWT, validação de propriedade (BOLA guard) e upload com Multer."]
        StaticServer["🖼️ Servidor de Arquivos Estáticos<br><i>[Express Static Middleware /uploads]</i><br>Distribuição pública de imagens de pôsteres e fotos de perfil."]
    end

    Database[("🍃 MongoDB Atlas<br><i>[Cluster de Réplicas NoSQL]</i><br>Armazena coleções 'users' e 'contents' com índices.")]
    DiskStorage[("💾 Disco Local do Servidor<br><i>[server/uploads]</i><br>Armazena arquivos físicos com nomes UUID únicos.")]

    User -->|"Interage via touchscreen"| MobileApp
    MobileApp -->|"Consome endpoints [JSON / UTF-8 / JWT]"| API
    MobileApp -->|"Carrega imagens de capa [HTTP GET]"| StaticServer
    API -->|"Consultas e mutações [TCP 27017]"| Database
    API -->|"Grava e remove imagens [fs.promises]"| DiskStorage
    StaticServer -->|"Lê arquivos de imagem"| DiskStorage
```

---

### Nível 3: Diagrama de Componentes (Components)
Detalha a arquitetura interna do contêiner da **API Backend** e seus relacionamentos com o aplicativo cliente.

```mermaid
flowchart TB
    subgraph MobileContainer["📱 Mobile App Client (React Native)"]
        Screens["Telas (AppBar, Pesquisa, Perfil, Login, Cadastro)"]
        AuthCtx["AuthContext (Gestão de Estado & SecureStore)"]
        ApiService["Serviço de API (fetch / XMLHttpRequest)"]
    end

    subgraph APIContainer["⚙️ Backend API (Express.js)"]
        AuthMiddleware["🛡️ Middleware de Autenticação<br><i>[requireAuth]</i><br>Valida Bearer Token JWT e injeta req.userId"]
        AuthRoutes["🔐 Rotas de Autenticação<br><i>[/api/auth]</i><br>Register, Login, Me, Password, Avatar"]
        ContentRoutes["🎬 Rotas de Conteúdo<br><i>[/api/content]</i><br>CRUD, busca regex, e Ownership Guard"]
        MulterStorage["📦 Upload Engine<br><i>[Multer / DiskStorage]</i><br>Validação de tipos e renomeação com crypto UUID"]
        UserModel["👤 Model User<br><i>[Mongoose Schema]</i><br>Gestão de credenciais com bcrypt salt 12"]
        ContentModel["📄 Model Content<br><i>[Mongoose Schema]</i><br>Gestão de títulos, capas e referência de autor"]
    end

    Database[("🍃 MongoDB Atlas")]
    Disk[("💾 server/uploads")]

    Screens -->|"Lê e atualiza sessão"| AuthCtx
    Screens -->|"Dispara ações assíncronas"| ApiService
    ApiService -->|"Requisição HTTP com Bearer Token"| AuthMiddleware

    AuthMiddleware -->|"Permite acesso autenticado"| AuthRoutes
    AuthMiddleware -->|"Permite acesso autenticado"| ContentRoutes
    ApiService -->|"Requisições públicas (Catálogo / Health)"| ContentRoutes

    AuthRoutes -->|"Upload de avatar"| MulterStorage
    ContentRoutes -->|"Upload de pôster de filme"| MulterStorage
    MulterStorage -->|"Salva arquivo físico"| Disk

    AuthRoutes -->|"Consulta e salva usuário"| UserModel
    ContentRoutes -->|"Verifica propriedade e salva"| ContentModel

    UserModel -->|"Comunicações ODM"| Database
    ContentModel -->|"Comunicações ODM"| Database
```

---

### Nível 4: Diagrama de Código e Entidades (Code / Data Schema)
Modela a estrutura de dados das coleções no MongoDB Atlas e as regras de autorização de recursos.

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String name
        +String email
        +String passwordHash
        +String avatarUrl
        +Date createdAt
        +Date updatedAt
    }

    class Content {
        +ObjectId _id
        +String title
        +String subtitle
        +String description
        +String imageUrl
        +ObjectId createdBy
        +Date createdAt
        +Date updatedAt
    }

    class AuthMiddleware {
        +verifyToken(req, res, next)
    }

    class OwnershipGuard {
        +validateOwnership(content, userId) Boolean
    }

    User "1" <-- "0..*" Content : createdBy (ObjectId Ref)
    AuthMiddleware ..> Content : Exige Bearer JWT para mutação
    OwnershipGuard ..> Content : Bloqueia com 403 Forbidden se createdBy != req.userId
```

---

## Organização do Projeto

```text
assets/
  sample-movies/        Pôsteres cinematográficos em alta definição para testes
src/
  components/           Componentes reutilizáveis (Cards, ContentForm, CabecaMenu, SplashScreen)
  context/              Estado global e sessão de autenticação (AuthContext)
  screens/              Telas do aplicativo (AppBar, Pesquisa, Acesso, Login, Cadastro, Perfil)
  services/             Comunicação HTTP cliente com a API (api.js)
  theme/                Design System e paleta de cores (React Native Paper)
server/
  src/
    middleware/         Middleware de proteção JWT (auth.js)
    models/             Modelos Mongoose (User.js, Content.js)
    index.js            Rotas Express, tratamento de erros e inicialização da API
  uploads/              Armazenamento de mídia física (pôsteres e avatares)
  seed.js               Script de população inicial do banco de dados
```

---

## Requisitos do Ambiente

- **Node.js:** versão 20 ou superior
- **Dispositivo Móvel:** Expo Go instalado no smartphone Android (ou emulador Android Studio)
- **Banco de Dados:** Instância MongoDB local ou MongoDB Atlas em nuvem

---

## Como Iniciar o Backend (API Express)

1. No terminal, acesse a pasta do servidor:
   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   ```

2. Configure as variáveis de ambiente em `server/.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/technologic?retryWrites=true&w=majority
   JWT_SECRET=sua-chave-secreta-de-pelo-menos-32-caracteres
   ```

3. *(Opcional)* Popule o banco com a conta de teste e 3 filmes com descrições ricas em português:
   ```powershell
   npm run seed
   ```
   > Cria a conta `ranzer@gmail.com` (senha: `123456789`) e cadastra os títulos *Interestelar*, *A Origem* e *O Poderoso Chefão*.

4. Inicie o servidor da API em modo de desenvolvimento:
   ```powershell
   npm run dev
   ```
   > A API ficará disponível em `http://localhost:3000`. Teste o endpoint de saúde em `http://localhost:3000/api/health`.

---

## Como Iniciar o Frontend (Expo / React Native)

1. Em outro terminal, na pasta raiz do projeto:
   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

2. Ajuste o arquivo `.env` da raiz de acordo com o ambiente que utilizará:
   - **No navegador Web:** `EXPO_PUBLIC_API_URL=http://localhost:3000`
   - **No Emulador Android:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`
   - **No Celular Físico via Expo Go:** `EXPO_PUBLIC_API_URL=http://<IP-DO-COMPUTADOR-NA-REDE>:3000` *(ex: `http://192.168.0.15:3000`)*

3. Inicie o Metro Bundler:
   ```powershell
   npx expo start
   ```
   - Pressione **`a`** para abrir no emulador Android.
   - Ou escaneie o QR Code com o aplicativo **Expo Go** no celular.

---

## Endpoints da API

### Autenticação & Usuários
- `POST /api/auth/register`: Cadastro de novo usuário (gera hash com bcrypt salt 12)
- `POST /api/auth/login`: Autenticação e emissão de token JWT (expiração em 7 dias)
- `GET /api/auth/me`: Retorna dados do usuário autenticado *(Exige JWT)*
- `PUT /api/auth/password`: Alteração segura de senha com revalidação da senha atual *(Exige JWT)*
- `POST /api/auth/avatar`: Upload de foto de perfil *(Exige JWT · multipart/form-data)*
- `DELETE /api/auth/avatar`: Remoção da foto de perfil *(Exige JWT)*

### Catálogo de Conteúdos
- `GET /api/content`: Listagem pública de conteúdos (suporta filtro por query `?q=termo`)
- `POST /api/content`: Criação de novo conteúdo vinculado ao autor *(Exige JWT)*
- `PUT /api/content/:id`: Alteração de dados do conteúdo *(Exige JWT · Apenas o criador)*
- `DELETE /api/content/:id`: Exclusão de conteúdo e da imagem correspondente *(Exige JWT · Apenas o criador)*
- `POST /api/content/:id/image`: Upload/substituição de pôster do filme *(Exige JWT · Apenas o criador)*
- `DELETE /api/content/:id/image`: Remoção do pôster do filme *(Exige JWT · Apenas o criador)*
