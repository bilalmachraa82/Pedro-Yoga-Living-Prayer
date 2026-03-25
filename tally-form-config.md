# Living Prayer — Configuração do Formulário Tally.so

## Formulário de Candidatura ao Retiro

### Perguntas e Tipos de Campo

| # | Pergunta (PT) | Pergunta (EN) | Tipo de Campo | Obrigatório |
|---|---------------|---------------|---------------|-------------|
| 1 | Há quanto tempo praticas yoga? Descreve a tua relação com a prática. | How long have you been practising yoga? Describe your relationship with the practice. | Long text (textarea, min. 50 caracteres) | Sim |
| 2 | O que procuras especificamente neste retiro? | What are you specifically looking for in this retreat? | Long text (textarea, min. 30 caracteres) | Sim |
| 3 | Já participaste em retiros de meditação ou silêncio? | Have you participated in meditation or silence retreats? | Long text (textarea) | Sim |
| 4 | Como soubeste do Pedro / deste retiro? | How did you hear about Pedro / this retreat? | Dropdown (opções abaixo) + campo "Outro" | Sim |
| 5 | Alguma limitação física ou de saúde que devamos saber? | Any physical or health limitations we should know about? | Long text (textarea) | Não |

**Campos adicionais (no início do formulário):**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome completo | Short text | Sim |
| Email | Email | Sim |
| Telemóvel / WhatsApp | Phone | Sim |
| Preferência de alojamento | Dropdown: Partilhado / Individual / Premium + Shiatsu | Sim |
| Idioma preferido | Dropdown: Português / English | Sim |

**Opções para o dropdown da pergunta 4 (fonte de descoberta):**
- Instagram
- WhatsApp / Comunidade Oração Viva
- Newsletter / Substack
- Amigo ou colega
- Google / pesquisa online
- YouTube
- Outro (campo de texto livre)

---

## Instruções de Setup no Tally.so

### 1. Criar o formulário

1. Ir a [tally.so](https://tally.so) e criar conta (plano gratuito é suficiente)
2. Clicar em **Create a new form**
3. Escolher **Classic form** (não Conversational)
4. Título do formulário: **"Living Prayer — Candidatura ao Retiro"**
5. Descrição: *"Obrigado pelo teu interesse no Living Prayer. Este formulário ajuda-nos a conhecer-te e a garantir que a experiência serve verdadeiramente quem participa. Resposta em 48 horas."*

### 2. Configurar as perguntas

- Adicionar os campos na ordem indicada acima (campos pessoais primeiro, depois as 5 perguntas)
- Para cada campo Long text, activar **Min character count** onde indicado
- Para a pergunta 4, usar **Dropdown** com a opção "Add 'Other' option" activada
- Para a pergunta 5, marcar como **Not required** (único campo não obrigatório)

### 3. Design e branding

- Em **Design** (ícone de paleta):
  - Background color: `#FEFCF9`
  - Accent color: `#4A5D4F` (verde musgo)
  - Font: escolher a mais próxima de Cormorant Garamond / serifada
  - Remover branding Tally (disponível no plano Pro, 29€/mês — opcional)

### 4. Página de confirmação

Configurar a **Thank You page** com:
- Título: *"Obrigado pela tua candidatura"*
- Mensagem: *"Recebemos a tua candidatura para o Living Prayer. O Pedro irá analisá-la pessoalmente e entraremos em contacto no prazo de 48 horas. Se tiveres alguma questão entretanto, escreve para info@livingprayer.pt."*

### 5. Notificações

- Em **Settings → Notifications**:
  - Activar **Email notification** para o email do Pedro (recebe alerta a cada candidatura)
  - Activar **Respondent notification** (candidato recebe confirmação por email)

### 6. Publicar

- Em **Settings → Share**:
  - Copiar o **Embed URL**
  - Formato: `https://tally.so/embed/XXXXX`

---

## Configuração do Webhook para HubSpot

### Opção A: Integração nativa Tally → HubSpot (recomendada)

1. No Tally, ir a **Settings → Integrations → HubSpot**
2. Conectar a conta HubSpot
3. Mapear campos:
   - Nome completo → Contact: First Name + Last Name
   - Email → Contact: Email
   - Telemóvel → Contact: Phone
   - Preferência de alojamento → Contact Property: `tier_retiro`
   - Fonte de descoberta → Contact Property: `fonte_descoberta`
4. Activar **Create Deal** automaticamente no pipeline "Living Prayer Retiro"
   - Deal Stage: "Candidatura Recebida"
   - Deal Name: `Living Prayer — {Nome completo}`

### Opção B: Webhook manual (se a integração nativa não estiver disponível)

1. No Tally, ir a **Settings → Integrations → Webhooks**
2. URL do webhook: usar Zapier ou Make (Integromat) como intermediário
3. Configurar o Zap/Scenario:
   - Trigger: Tally New Submission
   - Action 1: HubSpot — Create Contact (mapear campos)
   - Action 2: HubSpot — Create Deal (pipeline "Living Prayer Retiro", stage "Candidatura Recebida")

---

## URL de Embed para a Landing Page

Após criar o formulário, substituir o placeholder na `living-prayer.html` pelo código de embed:

```html
<iframe data-tally-src="https://tally.so/embed/XXXXX?alignLeft=1&hideTitle=1&transparentBackground=1"
        loading="lazy"
        width="100%"
        height="800"
        frameborder="0"
        marginheight="0"
        marginwidth="0"
        title="Living Prayer — Candidatura">
</iframe>
<script>
var d=document,w="https://tally.so/widgets/embed.js",
v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};
if("undefined"!=typeof Tally)v();
else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s)}
</script>
```

Substituir `XXXXX` pelo ID real do formulário Tally.
