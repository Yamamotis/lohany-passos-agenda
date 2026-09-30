# Salão Agenda

Sistema de agendamento para salão de beleza. React + Vite + Tailwind CSS, rodando localmente com os dados em `localStorage` — preparado para migrar para Supabase (auth + banco) e deploy no Vercel nas próximas etapas.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173 (ou a porta indicada no terminal).

## Contas de teste (dados de seed)

| Papel | E-mail | Senha |
| --- | --- | --- |
| Admin | admin@salao.com | admin123 |
| Profissional (cabelo) | ana@salao.com | 123456 |
| Profissional (cabelo) | bruno@salao.com | 123456 |
| Profissional (tatuagem) | camila@salao.com | 123456 |

Clientes se cadastram pela própria tela de "Criar conta".

## Estrutura

- `src/pages` — telas por papel: público (`Landing`, `Login`, `Register`, `Profile`), `client/`, `professional/`, `admin/`.
- `src/lib/api/*.js` — camada de acesso a dados (hoje `localStorage`, isolada para ser trocada por chamadas ao Supabase sem alterar as telas).
- `src/lib/slots.js` — cálculo de horários disponíveis (expediente, intervalo de almoço, folgas e agendamentos existentes).
- `src/context` — autenticação (`AuthContext`) e notificações (`ToastContext`).

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção.
- `npm run lint` — lint com Oxlint.
- `npm run test` — testes automatizados (Vitest), hoje cobrindo `src/lib/slots.js`.
- `npm run preview` — preview do build de produção.

## Próximos passos

Integração com Supabase (autenticação e banco real, multiusuário) e deploy no Vercel.
