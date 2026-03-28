# Living Prayer — Emails Automáticos de Confirmação de Candidatura

## Como configurar no Systeme.io

### Limitação do plano free
O plano free do Systeme.io **não permite criar tags adicionais** (já existe a tag `retiro-living-prayer`). Por isso, a automação usa **uma única tag** e um **condicional baseado no campo Idioma**.

### Passos de configuração

1. **Ir a Systeme.io → Automations → Criar nova automação**
2. **Trigger:** `Tag adicionada` → tag `retiro-living-prayer`
3. **Ação:** `Condition` → `Contact field` → `Idioma` `contains` `Português`
   - **Se SIM (PT):** Enviar email "Recebemos a tua candidatura (PT)"
   - **Se NÃO (EN):** Enviar email "We received your application (EN)"
4. Adicionar também: **Notificação por email** para `pedro_santos_morais@hotmail.com` com os dados do contacto

---

## Email PT — "Recebemos a tua candidatura"

**Assunto:** `Recebemos a tua candidatura ao Living Prayer`

**Pré-header:** `Obrigado pelo teu interesse — o Pedro irá ler a tua intenção pessoalmente.`

**Corpo do email:**

---

Caro(a) {{first_name}},

Recebemos a tua candidatura ao Living Prayer — e queremos agradecer-te.

Este não é um retiro qualquer, e sabemos que a tua candidatura também não foi. Partilhar a tua intenção é já um passo. Um ato de presença. E isso tem valor para nós.

O Pedro irá ler as tuas palavras pessoalmente. Não é um processo automático — é um encontro, ainda que à distância. Responderemos no prazo de 48 horas.

Entretanto, se tiveres alguma questão, podes escrever para pedro_santos_morais@hotmail.com ou enviar uma mensagem pelo WhatsApp.

Com gratidão,

Pedro Morais
Living Prayer
12 · 13 · 14 de Junho — Quinta das Broas, Sintra

---

## Email EN — "We received your application"

**Assunto:** `We received your application to Living Prayer`

**Pré-header:** `Thank you for your interest — Pedro will read your intention personally.`

**Corpo do email:**

---

Dear {{first_name}},

We received your application to Living Prayer — and we want to thank you.

This is not just any retreat, and we know your application wasn't either. Sharing your intention is already a step. An act of presence. And that matters to us.

Pedro will read your words personally. This is not an automated process — it is an encounter, even at a distance. We will respond within 48 hours.

In the meantime, if you have any questions, feel free to write to pedro_santos_morais@hotmail.com or send a message via WhatsApp.

With gratitude,

Pedro Morais
Living Prayer
June 12 · 13 · 14 — Quinta das Broas, Sintra

---

## Email de Notificação ao Pedro (interna)

**Assunto:** `Nova candidatura ao Living Prayer — {{first_name}} {{surname}}`

**Corpo:**

---

Nova candidatura recebida:

- **Nome:** {{first_name}} {{surname}}
- **Email:** {{email}}
- **Telefone:** {{phone_number}}
- **Idioma:** {{idioma}}
- **Alojamento:** {{alojamento}}
- **Motivação:** {{motivacao}}
- **Como soube:** {{como_soube}}

Rever e responder em até 48 horas.

---

## Dados que agora chegam ao CRM (validado)

| Campo no Systeme.io | Slug | Exemplo |
|---|---|---|
| Nome | `first_name` | Bilal |
| Sobrenome | `surname` | Machraa |
| Número de telefone | `phone_number` | +351912345678 |
| Alojamento | `alojamento` | Quarto suite / Private ensuite |
| Motivação | `motivacao` | Quero aprofundar a minha prática... |
| Como soube | `como_soube` | Instagram |
| Idioma | `idioma` | Português ou English |
| Tag | — | retiro-living-prayer |

## Variáveis do Systeme.io para usar nos emails

Use estas variáveis dinâmicas nos templates:

- `{{contact.first_name}}` — Nome próprio
- `{{contact.surname}}` — Sobrenome
- `{{contact.email}}` — Email
- `{{contact.phone_number}}` — Telefone
- `{{contact.alojamento}}` — Tipo de alojamento escolhido
- `{{contact.motivacao}}` — Motivação partilhada
- `{{contact.como_soube}}` — Como soube do retiro
- `{{contact.idioma}}` — Português ou English
