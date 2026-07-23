import * as React from "react";
import { render } from "@react-email/render";
import { Callout, EmailLayout, Paragraph } from "@/emails/email-layout";
import { formatDateOnly, formatEur } from "@/lib/utils";
import type { AdminConfigMap, ApplicationRow, EmailTemplateKey, Locale } from "@/types";

interface TemplateContext {
  application: ApplicationRow;
  config: AdminConfigMap;
  locale: Locale;
}

export async function buildEmailTemplate({
  templateKey,
  application,
  config,
  locale,
}: TemplateContext & { templateKey: EmailTemplateKey }) {
  const subject = buildSubject(templateKey, application.first_name, locale);
  const component = buildComponent(templateKey, { application, config, locale });
  const html = await render(component);

  return { subject, html };
}

function buildSubject(templateKey: EmailTemplateKey, firstName: string, locale: Locale) {
  const safeName = firstName || (locale === "en" ? "there" : "olá");
  const subjects: Record<EmailTemplateKey, Record<Locale, string>> = {
    application_accepted: {
      pt: `A tua candidatura foi aceite, ${safeName}`,
      en: `Your application has been accepted, ${safeName}`,
    },
    practical_info: {
      pt: "Informações práticas para o Living Prayer",
      en: "Practical information for Living Prayer",
    },
    what_to_expect: {
      pt: "O que esperar do retiro",
      en: "What to expect from the retreat",
    },
    one_week_reminder: {
      pt: "Falta uma semana para o Living Prayer",
      en: "One week to go until Living Prayer",
    },
    deposit_reminder: {
      pt: "Lembrete do sinal do Living Prayer",
      en: "Living Prayer deposit reminder",
    },
    balance_reminder: {
      pt: "Lembrete do valor em falta do Living Prayer",
      en: "Living Prayer balance reminder",
    },
  };

  return subjects[templateKey][locale];
}

function buildComponent(templateKey: EmailTemplateKey, context: TemplateContext) {
  const { application, config, locale } = context;
  const total = formatEur(application.total_price_cents, locale);
  const deposit = formatEur(application.deposit_amount_cents, locale);
  const paid = formatEur(application.deposit_paid_cents + application.balance_paid_cents, locale);
  const outstanding = formatEur(
    Math.max(application.total_price_cents - application.deposit_paid_cents - application.balance_paid_cents, 0),
    locale,
  );
  const retreatDates = `${formatDateOnly(config.retreat_date_start || "2026-06-12", locale)} – ${formatDateOnly(
    config.retreat_date_end || "2026-06-14",
    locale,
  )}`;

  const mbway = config.mbway_number || "919 304 201";
  const iban = config.iban || "PT50 0035 0686 0000 1588 7001 6";
  const location = config.retreat_location || "Shamballah Yoga Retreats, Parque Natural de Sintra";
  const firstName = application.first_name || (locale === "en" ? "Friend" : "Amigo");

  const copy = {
    application_accepted: locale === "en"
      ? {
          heading: `${firstName}, your application has been accepted.`,
          intro:
            "Thank you for the care and sincerity you brought to your application. I would be happy to welcome you into this small group.",
          callout: `To confirm your place, the next step is a fixed ${deposit} deposit. The total investment for your accommodation choice is ${total}.`,
          body: [
            `The retreat takes place on ${retreatDates}, at ${location}.`,
            `You can send the deposit by MB WAY (${mbway}) or bank transfer (${iban}). Please reply once the transfer is done so I can register it.`,
          ],
        }
      : {
          heading: `${firstName}, a tua candidatura foi aceite.`,
          intro:
            "Obrigado pelo cuidado e pela sinceridade com que chegaste a este processo. Terei muito gosto em acolher-te neste grupo.",
          callout: `Para confirmar o teu lugar, o próximo passo é o pagamento de um sinal fixo de ${deposit}. O valor total da tua opção de alojamento é ${total}.`,
          body: [
            `O retiro acontece entre ${retreatDates}, em ${location}.`,
            `Podes enviar o sinal por MB WAY (${mbway}) ou transferência bancária (${iban}). Quando o fizeres, responde a este email para eu registar o pagamento.`,
          ],
        },
    practical_info: locale === "en"
      ? {
          heading: "Practical information",
          intro: "Now that your place is underway, here are the practical anchors for the retreat.",
          callout: `${retreatDates} · ${location}`,
          body: [
            "Arrival details, exact timings, what to bring, and food notes will all be held inside the CRM so Pedro can update them without touching the code.",
            "If your dietary needs have changed, just reply to this email and I will update them directly.",
          ],
        }
      : {
          heading: "Informações práticas",
          intro: "Agora que o teu lugar está em curso, deixo-te os primeiros pontos práticos para o retiro.",
          callout: `${retreatDates} · ${location}`,
          body: [
            "Os detalhes finais de chegada, horários, o que trazer e notas logísticas ficam centralizados no CRM para poderem ser atualizados sem deploy.",
            "Se as tuas necessidades alimentares mudarem, basta responderes a este email e eu atualizo tudo diretamente.",
          ],
        },
    what_to_expect: locale === "en"
      ? {
          heading: "What to expect",
          intro: "Living Prayer is not organised around performance. It is organised around attention, sincerity, and depth.",
          callout: `So far you have paid ${paid}. Outstanding balance: ${outstanding}.`,
          body: [
            "Expect strong moments of silence, guided practice, shared meals, and a deliberately small group.",
            "The invitation is to arrive with availability rather than expectation.",
          ],
        }
      : {
          heading: "O que esperar",
          intro: "O Living Prayer não está organizado à volta de performance. Está organizado à volta de atenção, sinceridade e profundidade.",
          callout: `Até agora tens pago ${paid}. Valor em falta: ${outstanding}.`,
          body: [
            "Conta com momentos fortes de silêncio, prática guiada, refeições partilhadas e um grupo deliberadamente pequeno.",
            "O convite é chegares com disponibilidade, mais do que com expectativa.",
          ],
        },
    one_week_reminder: locale === "en"
      ? {
          heading: "One week to go",
          intro: "We are entering the final stretch before the retreat.",
          callout: `Retreat dates: ${retreatDates}. Location: ${location}.`,
          body: [
            "Take a quiet moment this week to simplify your schedule and begin to gather inwardly.",
            "If anything practical is unresolved, reply directly and I will help.",
          ],
        }
      : {
          heading: "Falta uma semana",
          intro: "Entramos agora na última semana antes do retiro.",
          callout: `Datas: ${retreatDates}. Local: ${location}.`,
          body: [
            "Reserva um momento de silêncio nesta semana para simplificar o teu ritmo e começar a recolher-te por dentro.",
            "Se houver alguma questão prática por resolver, responde diretamente e eu ajudo-te.",
          ],
        },
    deposit_reminder: locale === "en"
      ? {
          heading: "Deposit reminder",
          intro: "A gentle reminder in case the deposit is still pending on your side.",
          callout: `Deposit due now: ${deposit}. Total investment: ${total}.`,
          body: [
            `You can send the deposit by MB WAY (${mbway}) or bank transfer (${iban}).`,
            "Once it is sent, reply to this email so I can confirm your place in the system.",
          ],
        }
      : {
          heading: "Lembrete do sinal",
          intro: "Um lembrete simples, caso o pagamento do sinal ainda esteja pendente do teu lado.",
          callout: `Sinal em falta: ${deposit}. Valor total: ${total}.`,
          body: [
            `Podes enviar o sinal por MB WAY (${mbway}) ou transferência bancária (${iban}).`,
            "Assim que estiver feito, responde a este email para eu confirmar o teu lugar no sistema.",
          ],
        },
    balance_reminder: locale === "en"
      ? {
          heading: "Balance reminder",
          intro: "This is a reminder that there is still an outstanding amount before the retreat begins.",
          callout: `Outstanding balance: ${outstanding}. Already paid: ${paid}.`,
          body: [
            "If you have already transferred it, simply reply so I can reconcile the payment.",
            "If you need anything clarified around the payment, I can help directly.",
          ],
        }
      : {
          heading: "Lembrete do valor em falta",
          intro: "Este é um lembrete de que ainda existe um valor em aberto antes do início do retiro.",
          callout: `Valor em falta: ${outstanding}. Já pago: ${paid}.`,
          body: [
            "Se já fizeste a transferência, basta responderes para eu reconciliar o pagamento.",
            "Se precisares de esclarecer alguma coisa em relação ao pagamento, posso ajudar diretamente.",
          ],
        },
  }[templateKey];

  return (
    <EmailLayout preview={copy.heading} heading={copy.heading} intro={copy.intro}>
      <Callout>{copy.callout}</Callout>
      {copy.body.map((paragraph) => (
        <Paragraph key={paragraph}>{paragraph}</Paragraph>
      ))}
    </EmailLayout>
  );
}
