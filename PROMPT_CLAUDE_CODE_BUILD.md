# PROMPT PARA CLAUDE CODE — Living Prayer Build

**Como usar:** Cola esta prompt no Claude Code juntamente com o ficheiro `Plano_Retiro_Pedro_Morais_2026.md`.

---

## PROMPT

```
Tens acesso ao ficheiro "Plano_Retiro_Pedro_Morais_2026.md" — o plano estratégico completo do retiro "Living Prayer" do Pedro Morais (yoga, Quinta das Broas, Sintra-Ericeira, Portugal).

A tua missão é CONSTRUIR tudo o que está descrito no plano. Segue estas instruções por ordem:

---

### 1. LANDING PAGE (HTML/CSS/JS — ficheiro único, pronto a deploy)

Cria um ficheiro `living-prayer.html` — uma landing page premium, mobile-first, bilingue (PT/EN toggle), com:

**Above the fold:**
- Título: "Living Prayer — Asana como Prática Sagrada"
- Subtítulo: "Um retiro de 3-4 dias com Pedro Morais na Quinta das Broas, entre Sintra e o mar"
- CTA: "Candidatar-me ao Retiro" (link para secção candidatura)
- Placeholder para hero image (com instruções para substituir)

**Secções (nesta ordem):**
1. **O Professor** — Bio condensada do Pedro (usa dados do plano: 4 tradições Krishnamacharya, 4 anos Vipassana, Vedanta na Índia, Shiatsu, 8 anos comunidade espiritual). Ângulo: "O que praticantes com 30 anos de experiência reconhecem como excecional." Testemunho de destaque.

2. **A Prática** — "Não é um retiro de relaxamento. É um laboratório de auto-conhecimento." Descrever integração corpo-respiração-mente, ajustes Shiatsu, filosofia Vedanta. Tom contemplativo, não comercial.

3. **O Espaço** — Quinta das Broas: entre Sintra e Ericeira. Galeria placeholder (6 imagens) com instruções para substituir. Ênfase: contentor para a prática, não atracção turística.

4. **Testemunhos** — 3 testemunhos reais do plano:
   - Alexandra (psicoterapeuta): "Sinto-me profundamente grata por ter encontrado um professor de yoga que considero excecional..."
   - Lotte (30 anos de prática): praticante mundial que reconhece o Pedro como raro
   - Kalyani: "With Pedro, every aspect of the class is carefully crafted..."
   Versões PT e EN.

5. **Detalhes Práticos** — Datas (placeholder "Setembro/Outubro 2026"), duração (3-4 dias), capacidade (12-15 lugares), o que inclui.

6. **Pricing** — 3 tiers em cards:
   - Partilhado: 650-900€ (early bird / regular)
   - Individual: 900-1.250€
   - Premium + Shiatsu: 1.200-1.550€
   Pagamento: 50% na aceitação + 50% um mês antes.

7. **Candidatura** — Formulário embutido (Tally.so embed placeholder) com as 5 perguntas do plano:
   - "Há quanto tempo praticas yoga? Descreve a tua relação com a prática."
   - "O que procuras especificamente neste retiro?"
   - "Já participaste em retiros de meditação ou silêncio?"
   - "Como soubeste do Pedro / deste retiro?"
   - "Alguma limitação física ou de saúde que devamos saber?"

8. **Footer** — Instagram @pedromoraisyoga, email placeholder, "Living Prayer © 2026"

**Design specs:**
- Paleta: tons terrosos e naturais (warm beige #F5F0EB, verde musgo #4A5D4F, castanho terra #8B7355, branco suave #FEFCF9, texto escuro #2D2D2D)
- Tipografia: serif para títulos (usar Google Font "Cormorant Garamond"), sans-serif para corpo (usar "Inter")
- Espaçamento generoso, minimal, contemplativo — NÃO parecer um site de wellness genérico
- Animações subtis de scroll (fade-in)
- Mobile-first responsive
- Sem emojis, sem exclamações, sem hype
- Tom: íntimo, contemplativo, confiante sem ser arrogante
- SEO: meta tags para "spiritual yoga retreat Portugal", "yoga retreat Sintra", "Living Prayer retreat"
- Open Graph tags para partilha social
- Schema.org markup (Event type)
- GA4 placeholder (gtag)
- Hotjar placeholder

---

### 2. FORMULÁRIO TALLY.SO — Estrutura

Cria um ficheiro `tally-form-config.md` com:
- As 5 perguntas exactas do formulário de candidatura
- Tipos de campo recomendados (long text, short text, etc.)
- Instruções de setup no Tally.so
- Configuração do webhook para HubSpot (Tally → HubSpot)
- URL de embed para a landing page

---

### 3. HUBSPOT CRM — Pipeline Setup

Cria um ficheiro `hubspot-setup-guide.md` com:
- Pipeline "Living Prayer Retiro" com stages:
  1. Lead (novo contacto via newsletter/comunidade)
  2. Candidatura Recebida (formulário preenchido)
  3. Candidatura Aceite (Pedro respondeu com mensagem de voz)
  4. Pagamento Parcial (50% recebido)
  5. Inscrito (100% pago)
  6. Alumni (participou no retiro)
- Propriedades custom a criar no HubSpot:
  - anos_pratica_yoga (number)
  - experiencia_retiros (dropdown: Nenhuma / 1-2 / 3-5 / 5+)
  - fonte_descoberta (dropdown: Instagram / WhatsApp / Newsletter / Amigo / Google / Outro)
  - tier_retiro (dropdown: Partilhado / Individual / Premium)
  - data_candidatura (date)
- Automações sugeridas (workflows):
  - Quando deal move para "Candidatura Aceite" → notificar Pedro por email
  - Quando deal move para "Pagamento Parcial" → enviar email de confirmação
  - Quando deal move para "Inscrito" → enviar email de preparação
  - Quando deal move para "Alumni" → enviar email de agradecimento + pedido de testemunho

---

### 4. EMAIL SEQUENCES (Kit/ConvertKit) — 2 sequências

Cria um ficheiro `email-sequences.md` com texto completo de:

**Sequência A — Boas-vindas Newsletter (6 emails):**
1. Dia 0: Bem-vindo/a + meditação guiada (lead magnet)
2. Dia 3: "O que aprendi em 4 anos de silêncio" (história pessoal do Pedro)
3. Dia 7: "Porque o Asana é uma Oração" (filosofia)
4. Dia 14: Testemunho de aluno (Alexandra, psicoterapeuta)
5. Dia 21: "A Quinta das Broas — um espaço entre o sagrado e o mar" (o local)
6. Dia 30: Soft CTA — "Estou a preparar algo especial..." (pre-anúncio do retiro)

**Sequência B — Pós-candidatura aceite (4 emails):**
1. Dia 0: "A tua candidatura foi aceite" + instruções de pagamento (Stripe link + MB WAY)
2. Dia 3: FAQ — o que trazer, como chegar, horários, dieta
3. Dia 7: "O que esperar do retiro" — descrição da experiência
4. Dia -7 (7 dias antes): "Estamos quase" — preparação final, grupo WhatsApp

Tom de todos os emails: contemplativo, pessoal, sem marketing language. Assinar como Pedro. PT e EN.

---

### 5. STRIPE + MB WAY — Setup Guide

Cria um ficheiro `payments-setup-guide.md` com:
- Instruções para criar conta Stripe em Portugal
- Como criar 3 produtos (tiers: Partilhado, Individual, Premium)
- Como criar preços early bird + regular para cada tier
- Como activar Stripe Payment Links (para enviar após candidatura aceite)
- Como configurar pagamento em 2 parcelas (50% + 50%)
- Instruções para integrar MB WAY via Stripe (SEPA/MB WAY está disponível no Stripe PT)
- Webhook Stripe → HubSpot para actualizar deals

---

### 6. CONTEÚDO INICIAL — 3 peças prontas a publicar

Cria um ficheiro `conteudo-inicial.md` com:

**a) Primeiro post Substack/Newsletter:**
Título: "O Que Aprendi em 4 Anos de Silêncio"
~800 palavras. Ensaio contemplativo em primeira pessoa (como Pedro). Sobre a experiência de 4 anos de retiros Vipassana de 10 dias. Tom íntimo, reflexivo, vulnerável. Soft CTA no final.

**b) Primeiro script YouTube (8-12 min):**
Título: "Porque o Asana Não é um Exercício — É uma Oração"
Guião detalhado com:
- Introdução (1 min): hook + contexto pessoal
- Desenvolvimento (6-8 min): 3 pontos chave sobre yoga como prática sagrada
- Demonstração (2-3 min): indicações para mostrar asana com intenção
- Fecho (1 min): convite para newsletter + comunidade WhatsApp

**c) Bio optimizada para Instagram (@pedromoraisyoga):**
~150 caracteres. Incluir "Living Prayer" + localização + link na bio.

---

### 7. ANALYTICS — Setup Guide

Cria um ficheiro `analytics-setup-guide.md` com:
- GA4: como instalar na landing page, eventos custom a configurar (scroll_depth, cta_click, form_start, form_submit)
- Hotjar: como instalar, heatmap na landing page
- UTM conventions para tracking de campanhas
- KPI dashboard simples (pode ser Google Sheets template)

---

### INSTRUÇÕES GERAIS:
- Todo o texto deve ser em Português de Portugal (PT-PT), excepto versões EN onde indicado
- Tom: contemplativo, autêntico, zero hype, zero buzzwords de marketing
- Usa SEMPRE o conceito "Living Prayer" / "Oração Viva" como marca central
- O Pedro é o professor, não um "guru" — linguagem humilde mas confiante
- Nunca uses linguagem de venda agressiva ("última oportunidade!", "não percas!", etc.)
- A palavra "candidatura" em vez de "reserva" ou "compra" — sempre
- Mobile-first em todo o código
- Código limpo, comentado, e fácil de customizar
- Todos os placeholders claramente marcados com <!-- PLACEHOLDER: descrição -->
```
