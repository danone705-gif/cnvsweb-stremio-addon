# 🎬 CNVS Web Stremio Addon

Addon para o **Stremio** que integra o catálogo do site **CNVS Web (VisionCine)** — a maior plataforma de streaming em português do Brasil.

> **Site:** [https://www.cnvsweb.stream/](https://www.cnvsweb.stream/)

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| 🎬 Catálogo de Filmes | Listagem completa de filmes disponíveis no CNVS Web |
| 📺 Catálogo de Séries | Listagem completa de séries disponíveis no CNVS Web |
| 🎌 Catálogo de Animes | Listagem completa de animes disponíveis no CNVS Web |
| 🔍 Busca por Título | Pesquise filmes, séries e animes pelo nome |
| 🔗 Link Direto | Abre o conteúdo diretamente no CNVS Web |

---

## 📋 Pré-requisitos

- **Node.js** v14 ou superior
- **npm** (incluso com Node.js)
- Conta no [CNVS Web](https://www.cnvsweb.stream/) para assistir ao conteúdo

---

## 🚀 Instalação e Uso

### 1. Instalar as dependências

```bash
cd cnvsweb-stremio-addon
npm install
```

### 2. Iniciar o addon

```bash
npm start
```

O addon será iniciado na porta **7000** por padrão.

### 3. Instalar no Stremio

Após iniciar o servidor, abra o Stremio e adicione o addon usando a URL:

```
http://localhost:7000/manifest.json
```

**Como adicionar no Stremio:**
1. Abra o Stremio
2. Vá em **Addons** (ícone de peça de puzzle)
3. Clique em **Community Addons**
4. No campo de busca, cole a URL: `http://localhost:7000/manifest.json`
5. Clique em **Install**

---

## 🌐 Deploy Online (Opcional)

Para usar o addon de qualquer lugar (sem precisar do servidor local), você pode fazer o deploy em serviços gratuitos:

### Render.com (Recomendado — Gratuito)

1. Crie uma conta em [render.com](https://render.com)
2. Crie um novo **Web Service**
3. Conecte ao repositório do addon
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** `7000`
5. Após o deploy, use a URL gerada para instalar no Stremio:
   ```
   https://seu-addon.onrender.com/manifest.json
   ```

### Railway.app (Alternativa Gratuita)

1. Crie uma conta em [railway.app](https://railway.app)
2. Crie um novo projeto a partir do repositório
3. Configure a variável de ambiente `PORT=7000`
4. Use a URL gerada para instalar no Stremio

### Heroku

```bash
heroku create meu-cnvsweb-addon
git push heroku main
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `7000` | Porta do servidor HTTP |

### Exemplo com porta customizada

```bash
PORT=8080 npm start
```

---

## 📁 Estrutura do Projeto

```
cnvsweb-stremio-addon/
├── addon.js          # Código principal do addon
├── package.json      # Dependências e scripts
└── README.md         # Este arquivo
```

---

## 🔧 Como Funciona

O addon funciona como uma **ponte** entre o Stremio e o CNVS Web:

1. **Catálogo:** O addon faz scraping das páginas de listagem do CNVS Web e retorna os metadados (título, poster, ano) para o Stremio.

2. **Busca:** Ao pesquisar um título no Stremio, o addon consulta a página de busca do CNVS Web (`/search.php?q=...`) e retorna os resultados.

3. **Streams:** Ao clicar em um título, o addon tenta extrair os links de stream da página de watch. Se o usuário não estiver logado, retorna um link externo que abre o navegador no CNVS Web.

4. **Meta:** Informações detalhadas de cada título são obtidas da página de watch do CNVS Web.

---

## ⚠️ Avisos Importantes

- **Conta necessária:** Para assistir ao conteúdo, é necessário ter uma conta no [CNVS Web](https://www.cnvsweb.stream/).
- **Conteúdo gratuito:** O CNVS Web oferece conteúdo gratuito (marcado como "FREE") e conteúdo premium.
- **Dependência do site:** O addon depende da disponibilidade e estrutura do CNVS Web. Mudanças no site podem afetar o funcionamento.
- **Uso pessoal:** Este addon é para uso pessoal. Respeite os termos de uso do CNVS Web.

---

## 🐛 Solução de Problemas

### O addon não inicia
- Verifique se o Node.js está instalado: `node --version`
- Verifique se as dependências foram instaladas: `npm install`

### Catálogo vazio
- Verifique sua conexão com a internet
- O CNVS Web pode estar temporariamente indisponível

### Não consegue assistir
- Certifique-se de ter uma conta no CNVS Web
- Faça login no site antes de tentar assistir pelo Stremio

---

## 📄 Licença

MIT License — Uso livre para fins pessoais.

---

## 🙏 Créditos

- [CNVS Web (VisionCine)](https://www.cnvsweb.stream/) — Plataforma de streaming
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) — SDK oficial do Stremio
