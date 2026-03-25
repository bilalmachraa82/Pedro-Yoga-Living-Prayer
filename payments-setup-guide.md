# Living Prayer — Guia de Configuração de Pagamentos (Stripe + MB WAY)

## 1. Criar Conta Stripe em Portugal

### Passos iniciais

1. Ir a [stripe.com](https://stripe.com) e clicar em **Start now**
2. Criar conta com o email do Pedro (ou email do negócio)
3. Durante o onboarding:
   - País: **Portugal**
   - Tipo de negócio: **Individual / Sole proprietorship** (ou Lda se já existir)
   - Moeda principal: **EUR**
4. Completar a verificação de identidade (NIF, documento de identidade, comprovativo de morada)
5. Adicionar conta bancária portuguesa para receber os pagamentos (IBAN)

### Configurações importantes

- **Settings → Branding**: Adicionar logo "Living Prayer", cor `#4A5D4F`
- **Settings → Customer emails**: Activar recibos automáticos por email
- **Settings → Payment methods**: Activar:
  - Cards (Visa, Mastercard, Amex)
  - SEPA Direct Debit
  - MB WAY (ver secção 4)
  - Apple Pay / Google Pay (automático com Stripe)

---

## 2. Criar os 3 Produtos (Tiers)

### No Stripe Dashboard: Products → Add product

**Produto 1: Living Prayer — Quarto Partilhado**
- Nome: `Living Prayer — Partilhado`
- Descrição: "Retiro Living Prayer na Quinta das Broas. Quarto partilhado, todas as práticas, meditações e refeições."
- Imagem: foto do retiro/quinta
- Metadata: `tier: shared`, `edition: 2026-1`

**Produto 2: Living Prayer — Quarto Individual**
- Nome: `Living Prayer — Individual`
- Descrição: "Retiro Living Prayer na Quinta das Broas. Quarto individual, todas as práticas, meditações e refeições."
- Metadata: `tier: individual`, `edition: 2026-1`

**Produto 3: Living Prayer — Premium + Shiatsu**
- Nome: `Living Prayer — Premium + Shiatsu`
- Descrição: "Retiro Living Prayer na Quinta das Broas. Quarto individual, todas as práticas, meditações, refeições e sessão privada de Shiatsu (60 min)."
- Metadata: `tier: premium`, `edition: 2026-1`

---

## 3. Criar Preços (Early Bird + Regular)

### Para cada produto, criar 2 preços:

**Quarto Partilhado:**
| Preço | Valor | Tipo |
|-------|-------|------|
| Early Bird | 650,00 € | One-time |
| Regular | 900,00 € | One-time |

**Quarto Individual:**
| Preço | Valor | Tipo |
|-------|-------|------|
| Early Bird | 900,00 € | One-time |
| Regular | 1.250,00 € | One-time |

**Premium + Shiatsu:**
| Preço | Valor | Tipo |
|-------|-------|------|
| Early Bird | 1.200,00 € | One-time |
| Regular | 1.550,00 € | One-time |

**Nota:** Os preços early bird serão desactivados manualmente quando o período early bird terminar (após os primeiros 30% de inscrições).

---

## 4. Configurar Pagamento em 2 Parcelas (50% + 50%)

### Opção A: Payment Links com valor parcial (recomendada para simplicidade)

Criar **2 Payment Links** por tier — um para cada parcela:

**Exemplo para Quarto Individual (Early Bird: 900€):**

1. **Parcela 1 (50%):**
   - Products → criar preço adicional: "Living Prayer Individual — Parcela 1" = 450,00€
   - Payment Links → Create: seleccionar este preço
   - Configurar: "After payment" → redirect para página de confirmação
   - Label: `LP-IND-EB-P1`

2. **Parcela 2 (50%):**
   - Products → criar preço: "Living Prayer Individual — Parcela 2" = 450,00€
   - Payment Links → Create: seleccionar este preço
   - Label: `LP-IND-EB-P2`

Repetir para cada tier e cada nível de preço (early bird / regular).

**Total de Payment Links a criar: 12** (3 tiers × 2 preços × 2 parcelas)

### Opção B: Stripe Invoicing (mais profissional)

1. Após candidatura aceite, criar **Invoice** no Stripe para o candidato
2. Invoice 1: 50% do valor total — due date: imediato
3. Invoice 2: 50% do valor total — due date: 1 mês antes do retiro
4. O Stripe envia os invoices automaticamente por email
5. O candidato paga online (cartão, SEPA, MB WAY)

**Vantagem:** mais profissional, tracking automático, lembretes de pagamento

### Opção C: Stripe Subscriptions com schedule (avançado)

Para automação completa, criar uma Subscription Schedule:
- Phase 1: cobrar 50% imediatamente
- Phase 2: cobrar 50% na data definida (1 mês antes do retiro)

Requer API — usar apenas se houver suporte técnico disponível.

---

## 5. Activar Stripe Payment Links

### Para cada parcela/tier:

1. Ir a **Payment Links** no dashboard Stripe
2. Clicar **Create payment link**
3. Seleccionar o produto/preço correcto
4. Configurações:
   - **Collect customer info**: Nome, Email (obrigatório)
   - **Collect phone number**: Sim
   - **After payment**: Custom URL → redirecionar para página de agradecimento
   - **Confirmation page**: Mensagem personalizada
5. Copiar o URL do Payment Link
6. Enviar ao candidato aceite via email (template no HubSpot)

**Convenção de nomes para Payment Links:**
```
LP-PAR-EB-P1  = Partilhado, Early Bird, Parcela 1
LP-PAR-EB-P2  = Partilhado, Early Bird, Parcela 2
LP-PAR-REG-P1 = Partilhado, Regular, Parcela 1
LP-IND-EB-P1  = Individual, Early Bird, Parcela 1
LP-PRE-REG-P2 = Premium, Regular, Parcela 2
(etc.)
```

---

## 6. Integrar MB WAY via Stripe

### MB WAY no Stripe Portugal

O Stripe em Portugal suporta MB WAY nativamente desde 2024. Para activar:

1. No dashboard Stripe, ir a **Settings → Payment methods**
2. Procurar **MB WAY** na lista de métodos
3. Clicar **Turn on**
4. MB WAY ficará automaticamente disponível em todos os Payment Links e Checkout Sessions

### Como funciona para o cliente:

1. Cliente clica no Payment Link
2. Na página de checkout Stripe, escolhe **MB WAY** como método de pagamento
3. Insere o número de telemóvel português
4. Recebe notificação push na app MB WAY
5. Confirma o pagamento na app
6. Stripe confirma o pagamento e envia recibo

### Notas importantes:

- MB WAY só está disponível para números de telemóvel portugueses (+351)
- Para clientes internacionais, os métodos disponíveis serão: cartão, Apple Pay, Google Pay, SEPA
- Comissão Stripe para MB WAY: mesma dos cartões (1,4% + 0,25€ para cartões EU)

### Alternativa: MB WAY directo (sem Stripe)

Se algum participante preferir pagar por MB WAY fora do Stripe:
1. O Pedro pode receber diretamente no MB WAY pessoal/business
2. Registar o pagamento manualmente no HubSpot (mover deal para stage seguinte)
3. Enviar recibo manualmente
4. **Nota:** esta opção perde o tracking automático — usar apenas como excepção

---

## 7. Webhook Stripe → HubSpot

### Configuração para actualização automática dos deals

**Opção A: Via Zapier/Make (recomendada — sem código)**

1. **Zapier:**
   - Trigger: Stripe → Payment Intent Succeeded
   - Filter: metadata.tier contains "shared" OR "individual" OR "premium"
   - Action: HubSpot → Update Deal
     - Encontrar deal pelo email do cliente
     - Se valor = 50% do total → mover para "Pagamento Parcial"
     - Se valor = 100% do total → mover para "Inscrito"

2. **Make (Integromat):**
   - Trigger: Stripe → Watch Events (payment_intent.succeeded)
   - Router: verificar valor do pagamento
   - Action: HubSpot → Update Deal stage

**Opção B: Webhook directo (requer servidor)**

1. No Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: endpoint do servidor (pode ser serverless — Vercel, Netlify Functions, etc.)
3. Eventos a ouvir:
   - `payment_intent.succeeded`
   - `invoice.paid`
   - `payment_intent.payment_failed`
4. O endpoint recebe o evento e actualiza o HubSpot via API

---

## 8. Checklist Final

- [ ] Conta Stripe criada e verificada em Portugal
- [ ] 3 Produtos criados (Partilhado, Individual, Premium)
- [ ] 6 Preços criados (2 por produto: early bird + regular)
- [ ] 12 Payment Links criados (2 parcelas × 6 preços)
- [ ] MB WAY activado
- [ ] Emails de recibo configurados com branding Living Prayer
- [ ] Webhook Stripe → HubSpot configurado (via Zapier ou directo)
- [ ] Teste de pagamento realizado em modo test (Stripe test mode)
- [ ] Payment Links testados (usar cartão de teste 4242 4242 4242 4242)

---

## 9. Comissões e Custos

| Método | Comissão por transação | Exemplo (900€) |
|--------|----------------------|----------------|
| Cartão EU (Visa/MC) | 1,4% + 0,25€ | 12,85€ |
| Cartão non-EU | 2,9% + 0,25€ | 26,35€ |
| MB WAY | 1,4% + 0,25€ | 12,85€ |
| SEPA Direct Debit | 0,35€ | 0,35€ |

**Estimativa de custos Stripe para 12 inscrições a 1.000€ médio:**
~155€ em comissões (cartões EU) — ~1,3% do revenue total.
