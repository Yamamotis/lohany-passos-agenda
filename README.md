# Lohany Passos

Sistema de agendamento pro salão da Lohany. Feito em React (Vite + Tailwind),
com Supabase cuidando do banco e do login de verdade — sem mock, sem
localStorage, é tudo compartilhado entre quem acessa.

Tá no ar aqui: https://lohany-passos-agenda.vercel.app

## Rodando na sua máquina

```bash
npm install
npm run dev
```

Abre em http://localhost:5173 (ou a porta que o terminal mostrar).

Só que antes disso você precisa de um `.env` na raiz com as chaves do
Supabase (copia o `.env.example` e preenche):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Sem isso o app builda mas nenhuma tela que depende de dados vai funcionar.

## O banco

O schema inteiro (tabelas, RLS, funções de disponibilidade e criação de
agendamento) está versionado em `supabase/migrations/`. Pra jogar num projeto
Supabase do zero:

```bash
npx supabase link --project-ref <ref-do-seu-projeto>
npx supabase db push
```

Uma coisa importante: o cadastro público sempre cria cliente. Não tem como
virar admin ou profissional se cadastrando — isso é proposital (senão
qualquer um se promovia sozinho). Pra criar essas contas é preciso mexer
direto no banco ou usar a service role key, nunca pelo app.

## Como as coisas estão organizadas

`src/pages` tem uma pasta por papel de usuário (`client/`, `professional/`,
`admin/`), mais as telas públicas soltas ali dentro (login, cadastro, perfil).

`src/lib/api/*.js` é a ponte com o Supabase. As tabelas e colunas lá no banco
são em português, mas essa camada traduz tudo pra inglês antes de devolver
pro resto do app — assim as telas não precisam saber que embaixo tem
`usuarios`, `servicos`, `agendamentos` etc.

`src/context` tem os três contextos globais: autenticação (sincronizada com
a sessão do Supabase), tema (escuro por padrão, dá pra trocar) e os toasts de
feedback.

## Scripts

- `npm run dev` — sobe o servidor local
- `npm run build` — gera o build de produção
- `npm run lint` — roda o Oxlint
- `npm run preview` — serve o build localmente pra conferir antes de publicar
