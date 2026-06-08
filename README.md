# 🛡️ eSocial S-5002 Fiscal Auditor

> **Solução corporativa robusta para leitura, consolidação fiscal e auditoria automatizada de eventos S-5002 do eSocial, com foco na validação de DIRF Digital, IRRF Retido e cruzamento de dados com EFD-Reinf.**

---

## 📺 Apresentação do Dashboard Workspace

Abaixo está o preview conceitual da interface do **eSocial S-5002 Fiscal Auditor**, destacando os painéis interativos de KPIs, análises de divergências e relatórios dinâmicos:

![Visual Mockup Demo](/src/assets/images/dashboard_demo_1780932422043.png)

*(Para uma visualização fluida e demonstração interativa dos fluxos, utilize o ambiente Dev na porta 3000 do contêiner).*

---

## 🎯 Visão Geral

O **eSocial S-5002 Fiscal Auditor** foi projetado para atuar no coração do compliance tributário e de recursos humanos das empresas brasileiras. Com a transição para a **DIRF Digital**, tornou-se crucial auditar individualmente os valores mensais de repasses e retenções tributárias declaradas ao Fisco.

Esta ferramenta realiza o processamento completo dos pacotes XML S-5002 (retorno de consolidação de IRRF por trabalhador), armazena estruturadamente os dados e gera cruzamentos lógicos automáticos para identificar passivos tributários, pagamentos em duplicidade ou erros cadastrais antes da consolidação definitiva da DCTFWeb.

---

## ✨ Principais Funcionalidades

O sistema está estruturado em uma arquitetura limpa dividida em verticais de negócio:

### 1. 📂 Leitura, Importação e Parser de XML S-5002
*   **Upload em Processamento**: Suporte a arraste-e-solte (drag and drop) de múltiplos arquivos XML S-5002 consolidados ou lotes fechados no padrão federal.
*   **Parser de Extrema Performance**: Processamento via `fast-xml-parser` extraindo de forma íntegra períodos de apuração, bases de cálculo do IRRF, deduções de previdência oficial, pensão alimentícia e despesas com plano de saúde.
*   **Validação de Lotes**: Detecção e bloqueio de arquivos corrompidos, repetidos ou com CNPJ raiz divergente da empresa configurada.

### 2. 📊 Consolidação das Demonstrações Fiscais
*   **Análise de Códigos de Receita (CR)**: Inteligência nativa para agrupar as contribuições conforme o Código de Receita Oficial da RFB (foco em códigos como `0561-07`, `0561-08`, `0588-06`, `3533-01`, `3562-01`).
*   **Posição Consolidada (Mensal e Anual)**: KPIs detalhados que mostram em tempo de execução os rendimentos totais, base de cálculo efetiva, deduções apuradas e o imposto real retido na fonte.
*   **Módulo Comparativo eSocial vs EFD-Reinf**: Mecanismo inteligente para cruzar a folha declarada em eSocial com os impostos recolhidos nas séries R-4000 no REINF.

### 3. 🚨 Auditoria Contínua de Divergências
*   **Varredura Cadastral**: Alertas sobre trabalhadores listados no eSocial cujos CPFs ou dados cadastrais não estão em sincronicidade com os cadastros ativos.
*   **Identificação de Inconsistências**: Sinalização imediata para retenções indevidas, alíquotas de impostos inconsistentes e dependentes sem CPF válido cadastrado no sistema.
*   **Histórico e Timeline de Retificações**: Acompanhamento cronológico de quais XMLs foram retificados e qual o impacto direto na contabilidade fiscal.

### 4. 📅 Calendário de Competências e Status
*   **Mapa de Calor por Competência**: Visualização visual das competências fechadas e em aberto para mapeamento rápido de pendências mensais do ano fiscal.

### 5. 🛡️ Governança e Perfis de Acesso
*   **Separação por Perfis**: Módulo de gerenciamento com controle detalhado para administradores, auditores e operacionais.
*   **Logs de Histórico (Audit Trail)**: Rastreabilidade total sobre quem realizou uploads de arquivos, quem processou as conciliações ou excluiu registros do banco de dados.

### 6. 📝 Relatórios e Exportações Executivas
*   **Exportação para Excel**: Download instantâneo de tabelas consolidadas, lista de trabalhadores auditados e resumo de divergências formatado para auditoria externa.
*   **Download de PDF Gerencial**: Emissão de relatórios executivos com os dashboards financeiros consolidados para apresentações rápidas à diretoria.

---

## 🛠️ Arquitetura e Tecnologias

O projeto foi edificado sob os maiores padrões de estabilidade e performance:

*   **Runtime & Framework**: [Next.js 15+](https://nextjs.org/) utilizando a estrutura inovadora de **App Router** e suporte nativo a Server Actions e API Routes.
*   **Estilização**: [Tailwind CSS v3/v4](https://tailwindcss.com/) com design minimalista, alta acessibilidade e foco na experiência de dados massivos.
*   **Visualização de Dados**: [Recharts](https://recharts.org/) para gráficos analíticos de série histórica e pizza.
*   **Customização**: `react-grid-layout` integrado, permitindo que o usuário organize a posição física de seus widgets KPI de auditoria predileta.
*   **Persistência**: [Prisma ORM](https://www.prisma.io/) como camada de abstração de alta tipagem estática integrada a banco relacional **PostgreSQL** para durabilidade e segurança de dados massivos de folha.

---

## ⚙️ Instruções de Instalação e Configuração

Siga o passo a passo abaixo para rodar e testar o ambiente em sua máquina local ou servidor privado:

### 1. Pré-requisitos
*   **Node.js**: Versão `>= 18.0.0`
*   **npm**: Versão `>= 9.0.0`
*   **PostgreSQL**: Instância ativa local ou em Cloud (ex: Supabase, Neon)

### 2. Clonar o Repositório e Instalar Dependências
```bash
# Entre no diretório raiz do projeto
cd s5002-fiscal-auditor

# Instale os pacotes e dependências listadas no package.json
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo chamado **`.env`** localizado perfeitamente no nível raiz do projeto e configure suas credenciais de conexão do PostgreSQL e do Supabase:

```env
# Banco de Dados de Produção / Pooler (Usado pelo Prisma Client)
PRISMA_DATABASE_URL="postgresql://USUARIO:SENHA@HOST:6543/postgres?pgbouncer=true"

# Conexão direta ao banco (Usada para Migrations e Seedings)
PRISMA_DIRECT_URL="postgresql://USUARIO:SENHA@HOST:5432/postgres"

# Credenciais Públicas do Supabase (Usadas para conexões de autenticação do cliente)
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto-supabase.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sua-chave-publica-do-supabase"
```

### 4. Inicializar o Banco de Dados e as Migrações
Com a conexão com o PostgreSQL ativa, execute os utilitários do Prisma para mapear o banco relacional e gerar o Client auto-tipado:

```bash
# 1. Gerar o client de consulta customizado do Prisma
npx prisma generate

# 2. Sincronizar e criar as tabelas relacionais no PostgreSQL automaticamente
npx prisma db push
```

### 5. Alimentar o Banco de Dados com as Tabelas de Códigos de Receita (Seeds)
O sistema necessita da importação inicial de Códigos de Receita Federais (como `0561`, `0588`, etc.). Você pode popular os dados com o script de semente de dados executando:

```bash
# Popular os códigos e tabelas de referência fiscal padrão e empresas piloto
npx tsx prisma/seeds/rfb-codigos-receita.seed.ts
```

*(Opcional) O sistema também possui lotes de seed adicionais em `prisma/seeds/chunk1.ts` até `chunk8.ts` para testar com uma carga completa de amostragem de dados de auditoria*.

---

## 🚀 Executando a Aplicação

### Modo de Desenvolvimento

Para rodar com recompilação instantânea e feedback rápido no console:

```bash
npm run dev
```

A aplicação estará acessível em: `http://localhost:3000` (porta oficial e exclusiva de tráfego do proxy).

### Compilação de Produção

Para testar o build final otimizado, empacotando os assets estáticos e pré-processando as rotas do Next.js:

```bash
# Compilar o código TypeScript e gerar as páginas estáticas
npm run build

# Iniciar o servidor de produção otimizado
npm run start
```

---

## 📑 Orientações de Uso Contínuo e Boas Práticas

*   **Sincronização Cadastral**: Sempre registre detalhadamente os dados cadastrais da empresa raiz (CNPJ) antes de processar o upload de novos XMLs S-5002 para garantir que o pareamento de dados do eSocial ocorra sem alertas de falso-positivo de vínculo.
*   **Códigos de Receita Customizados**: Caso sua empresa necessite acompanhar recolhimentos especiais adicionais (ex: pensão com alíquotas particulares), você poderá cadastrá-los facilmente sob o menu de configurações da aplicação.

---

*Desenvolvido em conformidade rígida com os leiautes federais oficiais do eSocial S-1.2 / S-1.3.*
