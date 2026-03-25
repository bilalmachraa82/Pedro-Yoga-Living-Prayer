# Living Prayer — Guia de Configuração de Analytics

## 1. Google Analytics 4 (GA4)

### Criar propriedade GA4

1. Ir a [analytics.google.com](https://analytics.google.com)
2. Admin → Create Property
3. Nome: **Living Prayer**
4. Fuso: **Portugal (GMT+0/+1)**
5. Moeda: **EUR**
6. Criar Web Stream:
   - URL do website: `https://www.livingprayer.pt` (substituir pelo domínio real)
   - Nome: **Living Prayer Website**
7. Copiar o **Measurement ID** (formato: `G-XXXXXXXXXX`)

### Instalar na Landing Page

Na `living-prayer.html`, descomentar o bloco GA4 no `<head>` e substituir `G-XXXXXXXXXX` pelo ID real:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Eventos Custom a Configurar

Descomentar o bloco de eventos custom no JavaScript da landing page. Os seguintes eventos estão já preparados:

| Evento | Trigger | Parâmetros |
|--------|---------|------------|
| `scroll_depth` | Utilizador atinge 25%, 50%, 75%, 100% da página | `percent` |
| `cta_click` | Clique em qualquer CTA (hero, pricing, nav) | `event_label` (ID da secção) |

**Eventos adicionais a configurar manualmente no GA4 ou via GTM:**

| Evento | Trigger | Como configurar |
|--------|---------|-----------------|
| `form_start` | Utilizador começa a preencher o formulário Tally | Tally envia evento ao iframe — capturar via postMessage ou GTM |
| `form_submit` | Formulário Tally submetido com sucesso | Tally redirect → página de confirmação com evento GA4 |
| `language_switch` | Utilizador muda idioma PT/EN | Adicionar `gtag('event', 'language_switch', { 'language': lang })` na função `setLang()` |
| `pricing_view` | Secção pricing entra no viewport | Via IntersectionObserver (já implementado com fade-in) |

### Configurar Conversões

No GA4, ir a **Admin → Events → Mark as conversion:**
- `form_submit` — conversão principal
- `cta_click` — conversão secundária

### Relatórios Recomendados

1. **Acquisition → Traffic acquisition** — de onde vêm os visitantes
2. **Engagement → Events** — quais eventos disparam mais
3. **Engagement → Pages and screens** — tempo na página
4. **Custom funnel:** página visitada → scroll 50% → cta_click → form_start → form_submit

---

## 2. Hotjar

### Criar conta e instalar

1. Ir a [hotjar.com](https://hotjar.com) — plano Basic é gratuito (até 35 sessões/dia)
2. Criar conta e novo site: `www.livingprayer.pt`
3. Copiar o **Site ID** (número)
4. Na `living-prayer.html`, descomentar o bloco Hotjar no `<head>` e substituir `XXXXXXX` pelo Site ID

### Configurar Heatmaps

1. No Hotjar dashboard, ir a **Heatmaps → New heatmap**
2. Nome: **Landing Page — Living Prayer**
3. URL: `/` (ou a URL exacta da landing page)
4. Tipo: **Continuous** (recolhe dados continuamente)
5. Pageviews target: **1000** (para dados estatisticamente significativos)

### O que analisar nos Heatmaps:

- **Click heatmap:** onde as pessoas clicam mais? Os CTAs recebem cliques?
- **Move heatmap:** onde o cursor passa mais tempo?
- **Scroll heatmap:** até onde as pessoas scrollam? Qual a percentagem que chega à secção de candidatura?

### Configurar Recordings

1. **Recordings → Settings**
2. Activar gravação automática
3. Filtrar por: sessões com duração > 30 segundos
4. Rever semanalmente as primeiras 20-30 gravações para identificar pontos de fricção

### Configurar Feedback Widget (opcional)

1. **Feedback → New widget**
2. Posição: canto inferior direito
3. Pergunta: "Encontraste a informação que procuravas?"
4. Activar apenas depois do soft launch (não durante testes)

---

## 3. Convenções UTM para Tracking de Campanhas

### Formato UTM Standard

```
https://www.livingprayer.pt/?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=CONTENT
```

### Tabela de UTMs por Canal

| Canal | utm_source | utm_medium | utm_campaign | utm_content |
|-------|-----------|-----------|-------------|-------------|
| Newsletter / Substack | `substack` | `email` | `newsletter_semanal` | `ensaio_silencio` / `ensaio_oracao` / etc. |
| Email sequence boas-vindas | `kit` | `email` | `welcome_sequence` | `email_1` / `email_2` / etc. |
| Email pós-candidatura | `kit` | `email` | `post_application` | `aceite` / `faq` / `preparacao` |
| Instagram bio | `instagram` | `social` | `bio_link` | — |
| Instagram stories | `instagram` | `social` | `stories` | `{data}` |
| Instagram reels | `instagram` | `social` | `reels` | `{titulo}` |
| WhatsApp Community | `whatsapp` | `social` | `comunidade_oracao_viva` | `{data}` |
| YouTube description | `youtube` | `video` | `{titulo_video}` | `descricao` |
| Meta Ads | `meta` | `paid_social` | `retiro_2026` | `{ad_set}` |
| Google Ads | `google` | `paid_search` | `retiro_2026` | `{keyword}` |
| Pinterest | `pinterest` | `paid_social` | `retiro_2026` | `{pin}` |
| Referral — Amigo | `referral` | `word_of_mouth` | `ambassador` | `{nome_ambassador}` |

### Regras:

- Usar sempre **minúsculas** e **underscores** (não hífens ou espaços)
- Nunca usar UTMs em links internos (dentro do site)
- Criar UTMs com o [Campaign URL Builder](https://ga-dev-tools.google/campaign-url-builder/) do Google
- Registar todos os UTMs criados numa folha de tracking (ver secção 4)

---

## 4. KPI Dashboard (Google Sheets Template)

### Criar uma folha Google Sheets com as seguintes tabs:

---

### Tab 1: "KPIs Semanais"

| Semana | Visitantes LP | Scroll >50% | CTA Clicks | Form Starts | Candidaturas | Taxa Conversão | Fonte Top |
|--------|--------------|-------------|------------|-------------|-------------|----------------|-----------|
| Sem 1 | — | — | — | — | — | — | — |
| Sem 2 | — | — | — | — | — | — | — |
| ... | | | | | | | |

**Fórmulas sugeridas:**
- Taxa Conversão = Candidaturas / Visitantes LP
- Tendência semanal = (Semana actual - Semana anterior) / Semana anterior

---

### Tab 2: "Pipeline HubSpot"

| Data | Leads | Candidaturas | Aceites | Pag. Parcial | Inscritos | Alumni | Revenue Total |
|------|-------|-------------|---------|-------------|----------|--------|---------------|
| — | — | — | — | — | — | — | — |

Actualizar semanalmente com dados do HubSpot dashboard.

---

### Tab 3: "Canais de Aquisição"

| Canal | Visitantes | Candidaturas | Conversão | Custo | CPA |
|-------|-----------|-------------|-----------|-------|-----|
| Orgânico (Instagram) | — | — | — | 0€ | — |
| Newsletter | — | — | — | 0€ | — |
| WhatsApp | — | — | — | 0€ | — |
| YouTube | — | — | — | 0€ | — |
| Meta Ads | — | — | — | €— | — |
| Google Ads | — | — | — | €— | — |
| Referral | — | — | — | 0€ | — |

---

### Tab 4: "UTM Tracking Log"

| Data Criação | URL Completo | Canal | Campanha | Conteúdo | Notas |
|-------------|-------------|-------|----------|----------|-------|
| — | — | — | — | — | — |

---

### Tab 5: "Decision Triggers"

| Momento | Sinal de Alerta | Acção | Status |
|---------|----------------|-------|--------|
| Mês 3 | < 30 membros WhatsApp | Intensificar conteúdo YouTube | — |
| Mês 4 | < 8 candidaturas na 1.ª semana | Rever copy LP, pedir referências | — |
| Mês 5 | < 6 inscrições | Activar ads, 3x pagamento, "bring a friend" 10% | — |
| Pós-retiro | NPS < 70 | Entrevistas individuais | — |

---

## 5. Checklist de Implementação

- [ ] GA4 criado e instalado na landing page
- [ ] Eventos custom configurados (scroll_depth, cta_click, form_start, form_submit)
- [ ] Conversões marcadas no GA4 (form_submit, cta_click)
- [ ] Hotjar instalado e heatmap configurado
- [ ] Recordings activadas no Hotjar
- [ ] Google Sheets KPI dashboard criado com 5 tabs
- [ ] UTM conventions documentadas e partilhadas
- [ ] Primeiro URL com UTMs criado e testado
- [ ] Rotina semanal definida: actualizar KPIs toda a segunda-feira
