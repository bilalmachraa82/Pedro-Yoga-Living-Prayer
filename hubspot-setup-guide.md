# Living Prayer — Configuração do HubSpot CRM

## 1. Pipeline "Living Prayer Retiro"

### Criar o Pipeline

1. No HubSpot, ir a **Settings → Objects → Deals → Pipelines**
2. Clicar em **Create pipeline**
3. Nome: **Living Prayer Retiro**
4. Moeda: EUR (€)

### Stages do Pipeline

Configurar as seguintes fases, pela ordem indicada:

| # | Stage Name | Probabilidade | Descrição |
|---|-----------|---------------|-----------|
| 1 | **Lead** | 10% | Novo contacto via newsletter, Instagram, comunidade WhatsApp. Ainda não se candidatou. |
| 2 | **Candidatura Recebida** | 30% | Formulário de candidatura preenchido. Aguarda análise do Pedro. |
| 3 | **Candidatura Aceite** | 60% | Pedro respondeu com mensagem de voz personalizada. Candidato aceite, aguarda pagamento. |
| 4 | **Pagamento Parcial** | 80% | Primeira parcela (50%) recebida via Stripe ou MB WAY. |
| 5 | **Inscrito** | 100% | Pagamento completo (100%). Participação confirmada. |
| 6 | **Alumni** | Won (Closed) | Participou no retiro. Membro da comunidade alumni. |

**Stage adicional (perdido):**
- **Candidatura Recusada / Desistência** — Deal stage "Lost" com motivos: "Perfil não adequado", "Desistiu", "Sem resposta", "Preço", "Datas incompatíveis"

---

## 2. Propriedades Custom a Criar

### No HubSpot: Settings → Properties → Create property

**Propriedades de Contacto:**

| Nome Interno | Label (PT) | Tipo | Opções |
|-------------|-----------|------|--------|
| `anos_pratica_yoga` | Anos de Prática de Yoga | Number | — |
| `experiencia_retiros` | Experiência em Retiros | Dropdown | Nenhuma / 1-2 retiros / 3-5 retiros / 5+ retiros |
| `fonte_descoberta` | Como Descobriu o Retiro | Dropdown | Instagram / WhatsApp / Newsletter / Amigo / Google / YouTube / Outro |
| `idioma_preferido` | Idioma Preferido | Dropdown | Português / English |
| `limitacoes_saude` | Limitações Físicas/Saúde | Multi-line text | — |
| `comunidade_whatsapp` | Membro da Comunidade WhatsApp | Checkbox | Sim/Não |

**Propriedades de Deal:**

| Nome Interno | Label (PT) | Tipo | Opções |
|-------------|-----------|------|--------|
| `tier_retiro` | Tier do Retiro | Dropdown | Partilhado / Individual / Premium + Shiatsu |
| `data_candidatura` | Data da Candidatura | Date | — |
| `data_aceitacao` | Data de Aceitação | Date | — |
| `data_pagamento_parcial` | Data do Pagamento Parcial | Date | — |
| `data_pagamento_completo` | Data do Pagamento Completo | Date | — |
| `valor_parcela_1` | Valor Parcela 1 (50%) | Number (currency) | — |
| `valor_parcela_2` | Valor Parcela 2 (50%) | Number (currency) | — |
| `metodo_pagamento` | Método de Pagamento | Dropdown | Stripe (Cartão) / MB WAY / Transferência |
| `edicao_retiro` | Edição do Retiro | Dropdown | Set/Out 2026 (1.ª edição) |
| `notas_pedro` | Notas do Pedro | Multi-line text | — |

---

## 3. Vistas (Views) Recomendadas

### Criar as seguintes vistas em Contacts:

1. **Leads Newsletter** — Filtro: fonte_descoberta = Newsletter AND deal stage = Lead
2. **Candidaturas Pendentes** — Filtro: deal stage = Candidatura Recebida
3. **Aguardam Pagamento** — Filtro: deal stage = Candidatura Aceite
4. **Inscritos Confirmados** — Filtro: deal stage = Inscrito
5. **Alumni** — Filtro: deal stage = Alumni

### Vista do Pipeline (Board View):

No menu Deals, configurar a vista Kanban com as 6 colunas do pipeline. Ordenar por data_candidatura (mais recente primeiro).

---

## 4. Automações (Workflows)

### Criar os seguintes workflows em HubSpot:

**Os workflows gratuitos do HubSpot têm limitações. Se necessário, usar o plano Starter (20€/mês) para automações mais completas.**

---

### Workflow 1: Notificação ao Pedro — Candidatura Aceite

**Trigger:** Deal moves to stage "Candidatura Aceite"

**Acções:**
1. Enviar email interno ao Pedro:
   - Assunto: "Nova candidatura aceite — {Contact: First Name} {Contact: Last Name}"
   - Corpo: "A candidatura de {Contact: First Name} foi aceite. Envia a mensagem de voz personalizada. Detalhes: {Deal: tier_retiro}, {Contact Property: anos_pratica_yoga} anos de prática."
2. Criar tarefa no HubSpot: "Enviar mensagem de voz a {Contact: First Name}" — prazo: 24 horas

---

### Workflow 2: Confirmação de Pagamento Parcial

**Trigger:** Deal moves to stage "Pagamento Parcial"

**Acções:**
1. Enviar email ao contacto (template "Confirmação de Pagamento Parcial"):
   - Assunto: "Living Prayer — Confirmação de pagamento recebido"
   - Corpo: Confirmar recepção do pagamento de 50%, informar que o restante é devido um mês antes do retiro, e partilhar data limite para o segundo pagamento.
2. Actualizar propriedade `data_pagamento_parcial` com data actual
3. Enviar notificação interna ao Pedro

---

### Workflow 3: Inscrição Completa

**Trigger:** Deal moves to stage "Inscrito"

**Acções:**
1. Enviar email ao contacto (template "Bem-vindo ao Living Prayer"):
   - Assunto: "Living Prayer — A tua inscrição está confirmada"
   - Corpo: Confirmação, o que esperar, o que trazer, como chegar, link para grupo WhatsApp dos participantes
2. Actualizar propriedade `data_pagamento_completo` com data actual
3. Enviar notificação interna ao Pedro

---

### Workflow 4: Pós-Retiro — Alumni

**Trigger:** Deal moves to stage "Alumni"

**Acções:**
1. Esperar 3 dias
2. Enviar email ao contacto (template "Obrigado — Living Prayer"):
   - Assunto: "Com gratidão — Living Prayer"
   - Corpo: Agradecimento, partilha de fotos do retiro, link para testemunho (Google Form ou Tally simples), convite para comunidade alumni WhatsApp
3. Esperar 7 dias
4. Enviar email com pedido de testemunho formal + informação sobre o programa de embaixadores (15% desconto por referência)

---

### Workflow 5: Follow-up Candidatura sem Resposta

**Trigger:** Deal in stage "Candidatura Recebida" há mais de 48 horas

**Acções:**
1. Criar tarefa para o Pedro: "Analisar candidatura de {Contact: First Name} — sem resposta há 48h"
2. Se deal in stage "Candidatura Recebida" há mais de 7 dias → enviar email automático:
   - Assunto: "Sobre a tua candidatura — Living Prayer"
   - Corpo: "Recebemos a tua candidatura e estamos a analisá-la. Entrarei em contacto em breve. Pedro"

---

## 5. Integrações

### Tally.so → HubSpot
- Ver `tally-form-config.md` para instruções detalhadas
- Cada submissão cria contacto + deal no stage "Candidatura Recebida"

### Stripe → HubSpot
- Ver `payments-setup-guide.md` para instruções detalhadas
- Webhook Stripe actualiza deal stage quando pagamento é processado

### Kit (ConvertKit) → HubSpot
- Usar Zapier/Make para sincronizar novos subscritores do Kit com contactos HubSpot
- Tag no Kit: "newsletter_subscriber" → cria deal no stage "Lead" no HubSpot

---

## 6. Dashboard de Métricas

### Criar um dashboard "Living Prayer — Overview" com:

1. **Deal funnel** — Visualização do pipeline (quantos deals em cada stage)
2. **Revenue forecast** — Valor total previsto por stage
3. **Conversion rates** — Taxa de conversão entre stages
4. **Source breakdown** — Gráfico de pie com fonte_descoberta
5. **Recent activity** — Feed dos últimos deals movidos

### KPIs a monitorizar:

| Métrica | Alvo Conservador | Alvo Ambicioso |
|---------|-----------------|----------------|
| Candidaturas recebidas | 20 | 40+ |
| Taxa candidatura → inscrição | 50% | 65%+ |
| Inscrições confirmadas | 10-12 | 15-18 |
| Revenue bruto | 8.000-12.000€ | 15.000-25.000€ |
| Tempo médio candidatura → pagamento | < 7 dias | < 3 dias |
