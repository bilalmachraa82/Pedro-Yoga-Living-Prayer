# CLAUDE_CODE_SPRINT.md

Ficheiro de contexto para sessões de Claude Code focadas no sprint técnico da campanha Living Prayer 12-14 Junho 2026.

Complementa, não substitui, `CLAUDE.md` (arquitectura, tom, regras de conteúdo) e `living-prayer-campaign-hub.html` (plano de campanha visual).

---

## 1. Divisão de responsabilidades

**Bilal (técnico, Claude Code):** infra, analytics, automações, serverless, Neon, emails transaccionais, SEO técnico, performance, segurança, pagamentos.

**Pedro (orgânico, humano):** contactos 1:1 dos 50 da rede, áudios WhatsApp, emails à lista existente, Instagram orgânico, parcerias com estúdios, comunidade WhatsApp, conversa de aceitação, onboarding humano pré-retiro.

**Interface crítica entre os dois:** quando um lead submete candidatura, o Pedro tem de saber em minutos. Quando o Pedro aceita um candidato, o sistema tem de disparar onboarding. Esta ponte é onde perdemos pessoas se falhar.

## 2. Prompt de arranque para Claude Code

Copiar e colar no início de cada sessão de Claude Code dedicada a este sprint:

```
Contexto: Estou a executar o Sprint Técnico 48h da campanha Living Prayer
(retiro de yoga 12-14 Junho 2026, Quinta das Broas, Sintra).

Ler primeiro, por esta ordem:
1. CLAUDE.md (arquitectura + tom + regras de conteúdo)
2. CLAUDE_CODE_SPRINT.md (este ficheiro: tarefas e DoD)
3. PLANO_CAMPANHA_LIVING_PRAYER_JUNHO_2026.md (estratégia completa)
4. living-prayer-campaign-hub.html §02 Sprint Técnico (checklist visual)

Constraints absolutos:
- PT-PT em todo o conteúdo user-facing. Código em inglês.
- Zero emojis, zero pontos de exclamação, tom contemplativo.
- "Candidatura" nunca "reserva". "O professor" nunca "guru".
- Nunca commitar secrets. Usar .env.local e Vercel env vars.
- Alterações em living-prayer.html têm de ser copiadas para deploy/index.html.

Eu sou Bilal. Faço a parte técnica. O Pedro faz a parte orgânica.
Não assumas que posso fazer tarefas orgânicas, e não proponhas soluções
que dependam de acção humana do Pedro sem sinalizar handoff explícito.

Trabalha tarefa a tarefa, pela ordem da secção 3 deste ficheiro.
Para cada tarefa: (1) mostra diff antes de escrever, (2) corre smoke test
da secção 5, (3) marca done e passa à seguinte. Se uma tarefa falhar ou
ficar em bloqueio, para e escala.
```

## 3. Sprint 48h — 10 tarefas com Definition of Done

Pela ordem. Cada tarefa só está done quando o smoke test passa.

### T1 — Meta Pixel no site
**Onde:** `deploy/index.html` head + eventos no form handler  
**DoD:** Pixel ID em Vercel env var `NEXT_PUBLIC_META_PIXEL_ID`. Eventos disparados: `PageView`, `ViewContent` (secção preço), `Lead` (submit form). Validar com [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc).  
**Não fazer:** retargeting frio de gente que não visitou. Só retarget quem viu secção preço ou ficou >30s.

### T2 — GA4 conversion events
**Onde:** `deploy/index.html` gtag snippet  
**DoD:** eventos customizados `application_start`, `application_submit`, `faq_expand`, `bio_modal_open`. Marcar `application_submit` como conversão em GA4. Measurement ID em env var.  
**Teste:** DebugView GA4 mostra eventos em tempo real durante submit de teste.

### T3 — Schema.org Event + LocalBusiness validados
**Onde:** `deploy/index.html` head JSON-LD  
**DoD:** Event schema com `startDate`, `endDate`, `location.address`, `offers.price`, `offers.availability`, `performer`. LocalBusiness para a Quinta das Broas com `geo`, `address`, `telephone`. [Rich Results Test](https://search.google.com/test/rich-results) passa sem erros críticos.

### T4 — UTMs consistentes no deep-linking
**Onde:** templates do hub de campanha + living-prayer.html internal links  
**DoD:** convenção documentada: `utm_source={canal}&utm_medium={formato}&utm_campaign=lp-junho-2026&utm_content={peça}`. Deep links nos templates da webapp hub actualizados. Form submit guarda last-touch UTM em metadata da candidatura no Neon.

### T5 — OG image 1200×630 real
**Onde:** `deploy/img/og-living-prayer.jpg` + meta tags  
**DoD:** imagem 1200×630, <300KB, com título + local + data sobrepostos. `<meta property="og:image">` absoluto (https://livingprayer.pt/img/og-living-prayer.jpg). [OpenGraph Preview](https://www.opengraph.xyz/) renderiza correcto para LinkedIn, Facebook, WhatsApp, iMessage.

### T6 — Resend domain authentication
**Onde:** DNS Cloudflare + Resend dashboard  
**DoD:** SPF + DKIM + DMARC configurados para `livingprayer.pt` (ou subdominio dedicado `mail.livingprayer.pt`). Teste em [mail-tester.com](https://www.mail-tester.com/) com score ≥9/10. From address final decidido (recomendo `pedro@livingprayer.pt`, nunca `noreply@`).

### T7 — PageSpeed ≥90 mobile
**Onde:** `deploy/index.html` + `deploy/img/`  
**DoD:** [PageSpeed Insights](https://pagespeed.web.dev/) mobile ≥90 performance, ≥95 accessibility, ≥100 best practices, ≥95 SEO. Imagens convertidas para WebP com fallback JPG, lazy loading em tudo abaixo do fold, preconnect para fonts.googleapis.com.

### T8 — Sitemap + robots.txt finais
**Onde:** `deploy/sitemap.xml` + `deploy/robots.txt`  
**DoD:** sitemap com a homepage PT e EN (hreflang alternate), lastmod actual. Robots permite tudo excepto `/admin/` e `/api/`. Ambos submetidos na [Google Search Console](https://search.google.com/search-console).

### T9 — Favicon + touch icons
**Onde:** `deploy/` raiz  
**DoD:** `favicon.ico` (32×32), `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, `manifest.webmanifest` com theme color `#4A5D4F`. Todos referenciados no head.

### T10 — Search Console + Analytics live
**Onde:** verificação de propriedade  
**DoD:** Search Console verifica livingprayer.pt via DNS TXT. GA4 ligado à property do Search Console. Primeira crawl submetida. Alerta email activo para "coverage issues".

### T11 — Página de privacidade RGPD-compliant
**Onde:** `deploy/privacidade.html` (PT) + `deploy/privacy.html` (EN), link no footer
**DoD:** cobre os seis itens obrigatórios RGPD: (1) identidade do responsável pelo tratamento (Pedro Morais + NIF + morada profissional + email), (2) finalidades do tratamento (comunicação sobre candidatura + onboarding retiro + newsletter opcional), (3) base legal por finalidade (consentimento para marketing, execução de contrato para operacional), (4) destinatários dos dados (Resend, Neon, Vercel, Google Analytics — referidos nominalmente), (5) prazo de retenção (candidaturas não aceites: 12 meses; participantes: 5 anos fiscais; newsletter: até opt-out), (6) direitos do titular (acesso, rectificação, apagamento, portabilidade, oposição) com email de contacto para exercício. Linguagem acessível, nada de legalês copiado de template. Data da última actualização no topo.

### T12 — Página de termos e política de reembolso
**Onde:** `deploy/termos.html` (PT) + `deploy/terms.html` (EN), link no footer e no passo 2 do form
**DoD:** cobre três blocos claros:
(a) **Natureza da candidatura:** submissão do formulário não garante lugar; aceitação formal via email do Pedro é que cria o contrato.
(b) **Pagamento:** depósito não reembolsável de X€ para garantir lugar (definir valor com Pedro; recomendo 30% do valor total), saldo devido até 21 dias antes do retiro. Formas de pagamento aceites (Stripe, transferência, MB WAY).
(c) **Política de reembolso escalonada:**
- Cancelamento >60 dias antes: reembolso de 100% menos depósito.
- 30-60 dias antes: reembolso de 50% menos depósito.
- <30 dias antes: sem reembolso, mas lugar transferível para terceiro aceite pelo Pedro.
- Cancelamento pelo Pedro/força maior (doença, catástrofe): reembolso integral OU transferência para edição seguinte, à escolha do participante.
Lei aplicável Portuguesa. Foro de Lisboa. Resolução alternativa de litígios (Centro Nacional de Informação e Arbitragem de Conflitos de Consumo). Confirmar os valores com o Pedro antes de publicar.

### T13 — Consentimentos explícitos no formulário
**Onde:** `deploy/index.html` step 2 do form + `deploy/api/subscribe.js`
**DoD:** duas checkboxes separadas, ambas obrigatórias para a primeira, opcional para a segunda:
- `[x] Li e aceito a política de privacidade e os termos de candidatura.` (obrigatório, bloqueia submit)
- `[ ] Quero receber comunicações sobre futuros retiros e reflexões mensais do Pedro.` (opcional, alimenta lista de marketing)
Backend guarda ambos os flags e o timestamp em `applications` (adicionar colunas `consent_terms_at TIMESTAMP`, `consent_marketing_at TIMESTAMP NULL`). Links dentro das labels abrem em nova aba sem perder progresso do form.

### T14 — Cookie banner com consent real
**Onde:** `deploy/index.html`
**DoD:** banner minimalista aparece só no primeiro acesso, três opções: `Aceitar`, `Recusar`, `Preferências`. Recusar bloqueia GA4 e Meta Pixel até consent explícito (usar Google Consent Mode v2). Preferência guardada em cookie `lp-consent` com validade 6 meses. Link "Gerir consentimento" no footer para revisitar. Testar com [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) que Pixel só dispara após aceitar.

## 4. O que o plano atual NÃO cobre — pontos cegos críticos

Auditoria honesta. Classificados por prioridade antes de 15 Maio.

### P0 — Bloqueadores legais e financeiros (esta semana)

**RGPD + política de reembolso:** endereçados nas tarefas T11-T14 do sprint acima (páginas no próprio site, consentimento no form, cookie banner). Não são um ponto cego — são trabalho do Bilal nesta semana.

**Pagamentos e fatura.** Decidir com o Pedro: Stripe com multibanco PT e MB WAY vs transferência manual? Valor do depósito não reembolsável (recomendo 30%)? Factura/recibo com NIF? Regime de IVA para actividades desportivas e culturais tem regras específicas em PT — confirmar com contabilista do Pedro. O valor do depósito e as regras escalonadas têm de estar decididas antes do Bilal publicar `deploy/termos.html`. **Owner: Pedro decisão + Bilal implementação, 7 dias.**

**Seguros.** Seguro de responsabilidade civil do Pedro como professor de yoga em actividade paga? Cobertura da Quinta das Broas para participantes? Cláusula de cancelamento por força maior (Pedro adoece, pandemia, meteorologia)? **Owner: Pedro, 14 dias.**

### P1 — Experiência de candidatura end-to-end (antes de 1 Maio)

**Fluxo pós-submit.** Quando candidatura entra no Neon, o Pedro sabe como? Notificação email imediata funciona? Há um dashboard admin (já existe em `admin/`) onde ele vê fila de candidaturas? SLA de resposta definido (recomendo 24h úteis)? Template de aceitação vs recusa preparado?

**CRM leve.** Os 50 contactos 1:1 do Pedro vivem em folha de cálculo ou num sistema? Sugestão pragmática: tabela em Notion ou Airtable com colunas `nome`, `canal_contacto`, `data_primeiro_contacto`, `status` (primeiro_contacto → follow_up → candidatura_submetida → aceite → pago → confirmado), `notas`. Evita perder leads mornos entre a conversa do Pedro e o formulário.

**Onboarding pós-aceitação.** Email #1 dias após pagamento: o que trazer, como chegar, estacionamento, check-in. Formulário de saúde pedido aqui (contraindicações, alergias alimentares, lesões). Grupo WhatsApp só para confirmados criado 14 dias antes. Consentimento de imagem para fotos/vídeo assinado antes do retiro. **Owner: Bilal template + Pedro conteúdo, 14 dias.**

### P2 — Qualidade e edições futuras (antes ou durante o retiro)

**Mensuração qualitativa.** NPS + survey qualitativo nas 72h pós-retiro. Três perguntas abertas para depoimentos que alimentam a edição #2. Consentimento explícito para usar respostas em marketing.

**Pipeline edição #2.** Data proposta para próximo retiro definida e comunicada internamente. Waitlist da edição Junho 2026 convertida em lista preferencial para edição seguinte (acesso 72h antes do público).

**Oferta "entre retiros".** Como mantém o Pedro a relação com participantes entre edições? Aulas regulares presenciais? Curso online? Audio practice mensal? Sem isto, o LTV fica preso a uma única edição anual.

**Backup operacional.** Backup automático do Neon activo? Export mensal de candidaturas para ficheiro offline? Se a Quinta das Broas partir (incêndio, conflito de agenda do proprietário) quem é o plano B físico? Pelo menos um local alternativo identificado e contactado como cortesia.

**Acessibilidade do site.** WCAG AA mínimo: imagens com alt descritivo, contraste ≥4.5:1 em todo o texto, navegação completa por teclado, form labels explícitos. Teste rápido com [axe DevTools](https://www.deque.com/axe/devtools/).

## 5. Smoke test pós-deploy (correr após qualquer merge para produção)

```
1. Abrir https://livingprayer.pt em incógnito. Página renderiza sem erro de consola.
2. Toggle PT/EN funciona. Toggle persiste em reload.
3. Scroll até form. Abre o step 1. Campos obrigatórios validados.
4. Submeter candidatura de teste com email bilal+test@.... Redirect para thank-you.
5. Verificar email de confirmação em bilal@. Verificar email admin em pedro@.
6. Verificar row no Neon em `applications` com UTMs e timestamp correctos.
7. Meta Pixel Helper mostra evento Lead disparado.
8. GA4 DebugView mostra application_submit como conversão.
9. Lighthouse mobile ≥90 perf. Nenhum erro crítico de accessibility.
10. Search Console sem novos erros de indexing.
```

Se qualquer passo falhar: rollback do deploy via Vercel, abrir issue com screenshot e log, corrigir, repetir smoke test completo.

## 6. Regras de escalation

**Blocker técnico >30 min:** para, documenta o que tentaste, e abre a conversa comigo com logs exactos e hipóteses ordenadas por probabilidade. Nunca repitas a mesma abordagem três vezes sem mudar de estratégia.

**Alteração de copy no site:** obrigatoriamente revisão dupla com o Pedro antes de deploy. Tom é o activo mais frágil.

**Secret exposto por engano:** rotação imediata do credencial (Vercel, Neon, Resend, Stripe), git filter-repo ou BFG Repo-Cleaner, force-push, notificar-me. Zero tolerância.

**Decisão que envolve dinheiro do participante:** bloqueia, consulta Pedro, só avança com confirmação explícita por escrito.

## 7. Não confundir Claude Code com Pedro

Se uma sugestão minha presume que o Pedro vai escrever um áudio WhatsApp, rever copy, aceitar uma candidatura ou ligar a um contacto, isso é trabalho humano dele, não técnico. Claude Code executa infra, dados, código, integrações. Pedro executa relações, tom, curadoria humana. A diferença é o que mantém a campanha autêntica.
