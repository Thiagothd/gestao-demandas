# Sistema de Gestão de Demandas

> Uma solução desenvolvida pela própria equipe para substituir planilhas Excel e centralizar o controle de projetos, horas e horas extras em um único sistema web.

**[Acessar o sistema →](https://gestao-demandas-lyart.vercel.app)**

---

## O Problema

Toda a operação era feita via planilhas Excel, gerando gargalos no dia a dia:

- 📊 Planilhas descentralizadas e frequentemente desatualizadas
- ⏰ Sem visibilidade de prazos e SLAs em tempo real
- 🔢 Cálculo manual de horas extras — sujeito a erros
- 🔍 Dificuldade em rastrear o status de cada demanda

---

## Funcionalidades

### 📋 Painel de Demandas
- Kanban: A Fazer → Em Andamento → Concluído
- Arrastar e soltar entre etapas (gerentes)
- Filtros por dev, cliente e prazo
- Alerta visual de SLA vencido
- Checklist inteligente por demanda

### ⏱️ Controle de Horas
- Apontamento por atividade e cliente
- Integração automática com checklists
- Suporte a apontamentos pausados (horas parciais)
- Exportação para Excel
- Histórico completo por desenvolvedor

### 💰 Horas Extras
- Registro de horas extras por qualquer colaborador
- Cálculo automático (dias úteis e fins de semana)
- Controle de pagamentos por dev (gerentes)
- Horas pagas destacadas em vermelho e excluídas da soma
- Exportação para planilha

### 👥 Gestão de Usuários
- Dois papéis: **Gerente** e **Funcionário**
- Gerentes criam e gerenciam contas
- Funcionários visualizam apenas seus próprios dados
- Troca de senha e papel pelo sistema

---

## Excel vs. Sistema

| Situação | Excel (Antes) | Sistema (Agora) |
|---|---|---|
| Visibilidade de projetos | Planilhas manuais | Kanban em tempo real |
| Controle de prazo (SLA) | Sem alertas | Alertas visuais automáticos |
| Apontamento de horas | Preenchimento manual | Integrado ao checklist |
| Cálculo de horas extras | Manual, sujeito a erros | Automático e auditável |
| Acesso à informação | Quem tem o arquivo | Qualquer navegador, qualquer lugar |
| Controle de acesso | Nenhum | Por papel (Gerente / Funcionário) |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS v4 |
| Backend / Banco | Supabase (PostgreSQL + Auth + RLS) |
| Drag & Drop | @hello-pangea/dnd |
| Exportação | xlsx (Excel) |
| Hospedagem | Vercel |

---

## Configuração Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 3. Inicializar banco (executar supabase_schema.sql no Supabase SQL Editor)

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

O servidor sobe em `http://localhost:3000`.

---

## Scripts

```bash
npm run dev       # Servidor de desenvolvimento
npm run build     # Build de produção → dist/
npm run preview   # Preview do build
npm run lint      # Verificação de tipos TypeScript
```

---

## Estrutura de Rotas

| Rota | Página | Acesso |
|---|---|---|
| `/` | Dashboard (Kanban) | Todos |
| `/timesheet` | Apontamentos de horas | Todos |
| `/overtime` | Horas extras | Todos |
| `/usuarios` | Gestão de usuários | Gerentes |

---

*[gestao-demandas-lyart.vercel.app](https://gestao-demandas-lyart.vercel.app)*
