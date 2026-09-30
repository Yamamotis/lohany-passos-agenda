# Lohany Passos

Sistema de agendamento para salão de beleza. React + Vite + Tailwind CSS no
front-end, Supabase (Postgres + Auth) no back-end — autenticação real, banco
compartilhado entre todos os usuários e regras de negócio (disponibilidade de
horários, transição de status do agendamento, antecedência mínima/máxima)
aplicadas no próprio banco via funções e triggers.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173 (ou a porta indicada no terminal).

Precisa de um arquivo `.env` na raiz com as credenciais do projeto Supabase
(ver `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Banco de dados (Supabase)

O schema, as políticas de RLS e as funções do banco vivem em
`supabase/migrations/`. Para aplicar em um projeto Supabase novo:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

Depois de aplicado, é preciso criar manualmente (fora do app) as contas de
admin e profissional — o cadastro público sempre cria um cliente (`CLIENTE`);
promover alguém a admin/profissional exige acesso direto ao banco ou à
service role key (nunca client-side).

## Contas de teste

| Papel | E-mail | Senha |
| --- | --- | --- |
| Admin | admin@lohanypassos.com | admin123 |
| Profissional (cabelos) | ana@lohanypassos.com | 123456 |
| Profissional (unhas/sobrancelhas) | camila@lohanypassos.com | 123456 |

Clientes se cadastram pela própria tela de "Criar conta".

## Estrutura

- `src/pages` — telas por papel: público (`Landing`, `Login`, `Register`, `Profile`), `client/`, `professional/`, `admin/`.
- `src/lib/api/*.js` — camada de acesso a dados: fala com o Supabase, mas devolve para as telas sempre um formato de campos em inglês, isolando o resto do app do nome das tabelas/colunas em português.
- `src/lib/supabaseClient.js` — cliente único do Supabase (usa as variáveis de ambiente).
- `src/context` — autenticação (`AuthContext`, sincronizado com a sessão do Supabase), tema (`ThemeContext`, escuro por padrão) e notificações (`ToastContext`).
- `supabase/migrations/` — histórico do schema do banco.

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção.
- `npm run lint` — lint com Oxlint.
- `npm run preview` — preview do build de produção.

## Próximos passos

Deploy no Vercel.
