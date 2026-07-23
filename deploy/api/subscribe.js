import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VALID_LOCALES = new Set(['pt', 'en']);
const VALID_TIERS = new Set([
  'shared',
  'individual_double',
  'individual_suite',
  'couples',
  'couples_suite',
]);

const SOURCE_LABELS = {
  instagram: { pt: 'Instagram', en: 'Instagram' },
  whatsapp: { pt: 'WhatsApp / Comunidade Oração Viva', en: 'WhatsApp / Living Prayer Community' },
  newsletter: { pt: 'Newsletter / Substack', en: 'Newsletter / Substack' },
  friend: { pt: 'Amigo / Referência', en: 'Friend / Referral' },
  other: { pt: 'Outro', en: 'Other' },
};

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const payload = sanitizePayload(req.body || {});
  if (payload.honeypot) {
    return res.status(200).json({ success: true, ignored: true });
  }
  if (!payload.email) return res.status(400).json({ message: 'Email is required' });
  if (!payload.fullName) return res.status(400).json({ message: 'Full name is required' });
  if (!payload.tier) return res.status(400).json({ message: 'Tier is required' });
  if (!payload.consentPrivacy) {
    return res.status(400).json({ message: 'Consent is required' });
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.database_url;
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_api;
  const resendFromEmail =
    process.env.RESEND_FROM_EMAIL || process.env.resend_from_email || 'retreat@livingprayer.pt';

  const hasNewStackEnv = databaseUrl && resendApiKey && resendFromEmail;

  if (!hasNewStackEnv) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const sql = neon(databaseUrl);
  const resend = new Resend(resendApiKey);

  try {
    const turnstileSecret =
      process.env.TURNSTILE_SECRET_KEY || process.env.turnstile_secret_key || '';

    if (turnstileSecret) {
      const turnstileResult = await verifyTurnstile({
        secret: turnstileSecret,
        token: payload.turnstileToken,
        ip: getClientIp(req),
      });

      if (!turnstileResult) {
        return res.status(400).json({ message: 'Spam verification failed' });
      }
    }

    const [tierRows, configRows, activeRows, tierCapacityRows, participantCapacityRows] = await sql.transaction(
      [
        sql`
          SELECT
            tier,
            label_pt,
            label_en,
            price_early_cents,
            price_regular_cents,
            is_couples_tier
          FROM accommodation_capacity
          WHERE tier = ${payload.tier}
        `,
        sql`
          SELECT key, value
          FROM admin_config
          WHERE key IN (
            'early_bird_active',
            'deposit_amount_cents',
            'reply_to_email',
            'admin_app_url',
            'retreat_date_start',
            'retreat_date_end',
            'retreat_location'
          )
        `,
        sql`
          SELECT id, status
          FROM applications
          WHERE email = ${payload.email}
            AND is_duplicate = FALSE
            AND status NOT IN ('rejected', 'cancelled')
          ORDER BY submitted_at DESC
          LIMIT 1
        `,
        sql`
          SELECT slots_remaining
          FROM capacity_overview
          WHERE tier = ${payload.tier}
        `,
        sql`
          SELECT participants_remaining
          FROM participant_capacity_overview
        `,
      ],
      { readOnly: true },
    );

    const tierRow = tierRows[0];
    if (!tierRow) {
      return res.status(400).json({ message: 'Invalid tier' });
    }

    const config = Object.fromEntries(configRows.map((row) => [row.key, row.value]));
    const firstName = extractFirstName(payload.fullName, payload.locale);
    const participantCount = tierRow.is_couples_tier ? 2 : 1;
    const priceCents = toBoolean(config.early_bird_active)
      ? tierRow.price_early_cents
      : tierRow.price_regular_cents;
    const depositCents = parseInteger(config.deposit_amount_cents, 15000);
    const submittedAt = new Date();
    const submittedDate = formatSubmittedDate(submittedAt, payload.locale);
    const tierLabel = payload.locale === 'en' ? tierRow.label_en : tierRow.label_pt;
    const activeApplication = activeRows[0] || null;
    const tierSlotsRemaining = Number.parseInt(String(tierCapacityRows[0]?.slots_remaining ?? 0), 10);
    const participantsRemaining = Number.parseInt(
      String(participantCapacityRows[0]?.participants_remaining ?? 0),
      10,
    );
    const waitlisted = tierSlotsRemaining <= 0 || participantsRemaining < participantCount;
    const nextStatus = waitlisted ? 'waitlisted' : 'received';
    const attribution = buildAttribution(payload);

    if (activeApplication) {
      const duplicateId = crypto.randomUUID();

      await sql.transaction((txn) => [
        txn`
          INSERT INTO applications (
            id,
            full_name,
            first_name,
            email,
            phone,
            locale,
            tier,
            participant_count,
            motivation,
            source,
            status,
            total_price_cents,
            deposit_amount_cents,
            dietary_notes,
            partner_name,
            partner_dietary_notes,
            privacy_consent_at,
            attribution,
            duplicate_of,
            is_duplicate,
            submitted_at
          )
          VALUES (
            ${duplicateId},
            ${payload.fullName},
            ${firstName},
            ${payload.email},
            ${payload.phone},
            ${payload.locale},
            ${payload.tier},
            ${participantCount},
            ${payload.motivation},
            ${payload.source},
            'received',
            ${priceCents},
            ${depositCents},
            ${payload.dietaryNotes},
            ${payload.partnerName},
            ${payload.partnerDietaryNotes},
            ${submittedAt.toISOString()},
            ${JSON.stringify(attribution)}::jsonb,
            ${activeApplication.id},
            TRUE,
            ${submittedAt.toISOString()}
          )
        `,
        txn`
          INSERT INTO status_history (
            application_id,
            from_status,
            to_status,
            changed_by,
            reason
          )
          VALUES (
            ${duplicateId},
            NULL,
            'received',
            'system',
            'duplicate_public_submission'
          )
        `,
        txn`
          INSERT INTO activity_log (
            application_id,
            activity_type,
            summary,
            metadata
          )
          VALUES (
            ${duplicateId},
            'duplicate_flagged',
            'Submissão duplicada recebida no formulário público.',
            ${JSON.stringify({
              duplicateOf: activeApplication.id,
              source: payload.source || null,
              attribution,
            })}::jsonb
          )
        `,
        txn`
          INSERT INTO activity_log (
            application_id,
            activity_type,
            summary,
            metadata
          )
          VALUES (
            ${activeApplication.id},
            'duplicate_flagged',
            'Nova submissão duplicada associada a este email.',
            ${JSON.stringify({
              duplicateId,
            })}::jsonb
          )
        `,
      ]);

      return res.status(200).json({
        success: true,
        duplicate: true,
        id: duplicateId,
      });
    }

    const applicationId = crypto.randomUUID();

    try {
      await sql.transaction((txn) => [
        txn`
          INSERT INTO applications (
            id,
            full_name,
            first_name,
            email,
            phone,
            locale,
            tier,
            participant_count,
            motivation,
            source,
            status,
            total_price_cents,
            deposit_amount_cents,
            dietary_notes,
            partner_name,
            partner_dietary_notes,
            privacy_consent_at,
            attribution,
            submitted_at
          )
          VALUES (
            ${applicationId},
            ${payload.fullName},
            ${firstName},
            ${payload.email},
            ${payload.phone},
            ${payload.locale},
            ${payload.tier},
            ${participantCount},
            ${payload.motivation},
            ${payload.source},
            ${nextStatus},
            ${priceCents},
            ${depositCents},
            ${payload.dietaryNotes},
            ${payload.partnerName},
            ${payload.partnerDietaryNotes},
            ${submittedAt.toISOString()},
            ${JSON.stringify(attribution)}::jsonb,
            ${submittedAt.toISOString()}
          )
        `,
        txn`
          INSERT INTO status_history (
            application_id,
            from_status,
            to_status,
            changed_by,
            reason
          )
          VALUES (
            ${applicationId},
            NULL,
            ${nextStatus},
            'system',
            ${waitlisted ? 'public_waitlist_submission' : 'public_application_submission'}
          )
        `,
        txn`
          INSERT INTO activity_log (
            application_id,
            activity_type,
            summary,
            metadata
          )
          VALUES (
            ${applicationId},
            'application_received',
            ${waitlisted ? 'Nova candidatura recebida em lista de espera.' : 'Nova candidatura recebida via landing page.'},
            ${JSON.stringify({
              locale: payload.locale,
              tier: payload.tier,
              participantCount,
              source: payload.source || null,
              attribution,
              waitlisted,
            })}::jsonb
          )
        `,
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const conflictRows = await sql`
          SELECT id
          FROM applications
          WHERE email = ${payload.email}
            AND is_duplicate = FALSE
            AND status NOT IN ('rejected', 'cancelled')
          ORDER BY submitted_at DESC
          LIMIT 1
        `;

        const conflictId = conflictRows[0]?.id;
        if (conflictId) {
          const duplicateId = crypto.randomUUID();

          await sql.transaction((txn) => [
            txn`
              INSERT INTO applications (
                id,
                full_name,
                first_name,
                email,
                phone,
                locale,
                tier,
                participant_count,
                motivation,
                source,
                status,
                total_price_cents,
                deposit_amount_cents,
                dietary_notes,
                partner_name,
                partner_dietary_notes,
                privacy_consent_at,
                attribution,
                duplicate_of,
                is_duplicate,
                submitted_at
              )
              VALUES (
                ${duplicateId},
                ${payload.fullName},
                ${firstName},
                ${payload.email},
                ${payload.phone},
                ${payload.locale},
                ${payload.tier},
                ${participantCount},
                ${payload.motivation},
                ${payload.source},
                ${nextStatus},
                ${priceCents},
                ${depositCents},
                ${payload.dietaryNotes},
                ${payload.partnerName},
                ${payload.partnerDietaryNotes},
                ${submittedAt.toISOString()},
                ${JSON.stringify(attribution)}::jsonb,
                ${conflictId},
                TRUE,
                ${submittedAt.toISOString()}
              )
            `,
            txn`
              INSERT INTO status_history (
                application_id,
                from_status,
                to_status,
                changed_by,
                reason
              )
              VALUES (
                ${duplicateId},
                NULL,
                'received',
                'system',
                'duplicate_public_submission_race'
              )
            `,
            txn`
              INSERT INTO activity_log (
                application_id,
                activity_type,
                summary,
                metadata
              )
              VALUES (
                ${duplicateId},
                'duplicate_flagged',
                'Submissão duplicada recebida após conflito de concorrência.',
                ${JSON.stringify({
                  duplicateOf: conflictId,
                })}::jsonb
              )
            `,
          ]);

          return res.status(200).json({
            success: true,
            duplicate: true,
            id: duplicateId,
          });
        }
      }

      throw error;
    }

    const confirmationHtml = waitlisted
      ? renderWaitlistConfirmationEmail({
          firstName,
          tierLabel,
          submittedDate,
          locale: payload.locale,
        })
      : renderConfirmationEmail({
      firstName,
      tierLabel,
      submittedDate,
      locale: payload.locale,
        });

    const confirmationSubject =
      waitlisted
        ? payload.locale === 'en'
          ? `You are on the waitlist, ${safeFirstName(firstName, 'there')}`
          : `Ficaste em lista de espera, ${safeFirstName(firstName, 'olá')}`
        : payload.locale === 'en'
          ? `Your application has arrived, ${safeFirstName(firstName, 'there')}`
          : `A tua candidatura chegou, ${safeFirstName(firstName, 'olá')}`;

    const adminHtml = renderAdminNotificationEmail({
      applicationId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      locale: payload.locale,
      sourceLabel: localizeSource(payload.source, payload.locale),
      tierLabel,
      totalPriceCents: priceCents,
      depositCents,
      participantCount,
      motivation: payload.motivation,
      dietaryNotes: payload.dietaryNotes,
      partnerName: payload.partnerName,
      partnerDietaryNotes: payload.partnerDietaryNotes,
      attribution,
      submittedDate,
      waitlisted,
      adminAppUrl: config.admin_app_url || process.env.ADMIN_APP_URL || 'https://admin.livingprayer.pt',
    });

    const emailResults = await Promise.allSettled([
      sendAndLogEmail({
        sql,
        resend,
        applicationId,
        templateKey: waitlisted
          ? `application_waitlisted_${payload.locale}`
          : `application_confirmation_${payload.locale}`,
        subject: confirmationSubject,
        toEmail: payload.email,
        fromEmail: resendFromEmail,
        html: confirmationHtml,
        replyTo: config.reply_to_email || resendFromEmail,
        sentByAdmin: false,
        activitySummary: 'Email automático de confirmação enviado.',
      }),
      sendAndLogEmail({
        sql,
        resend,
        applicationId,
        templateKey: 'admin_notification',
        subject: `Nova candidatura Living Prayer — ${payload.fullName}`,
        toEmail:
          process.env.ADMIN_NOTIFY_EMAIL || process.env.admin_notify_email || 'sentutoke@gmail.com',
        fromEmail: resendFromEmail,
        html: adminHtml,
        replyTo: payload.email,
        sentByAdmin: false,
        activitySummary: 'Notificação interna enviada ao Pedro.',
      }),
    ]);

    for (const result of emailResults) {
      if (result.status === 'rejected') {
        console.error('Email dispatch failed:', result.reason);
      }
    }

    return res.status(200).json({
      success: true,
      duplicate: false,
      waitlisted,
      id: applicationId,
    });
  } catch (error) {
    console.error('Subscription handler failed:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}

function sanitizePayload(input) {
  return {
    fullName: sanitizeText(input.fullName, 120),
    email: sanitizeEmail(input.email),
    phone: sanitizeText(input.phone, 40),
    motivation: sanitizeMultilineText(input.motivation, 4000),
    dietaryNotes: sanitizeMultilineText(input.dietaryNotes, 1200),
    partnerName: sanitizeText(input.partnerName, 120),
    partnerDietaryNotes: sanitizeMultilineText(input.partnerDietaryNotes, 1200),
    tier: VALID_TIERS.has(input.tier) ? input.tier : '',
    source: Object.hasOwn(SOURCE_LABELS, input.q4) ? input.q4 : '',
    locale: VALID_LOCALES.has(input.locale) ? input.locale : 'pt',
    consentPrivacy: input.consentPrivacy === true || input.consentPrivacy === 'true' || input.consentPrivacy === 'on',
    turnstileToken: sanitizeText(input.turnstileToken, 2048),
    honeypot: sanitizeText(input.company, 120),
    utmSource: sanitizeText(input.utm_source, 120),
    utmMedium: sanitizeText(input.utm_medium, 120),
    utmCampaign: sanitizeText(input.utm_campaign, 120),
    utmContent: sanitizeText(input.utm_content, 120),
    referrer: sanitizeText(input.referrer, 300),
    landingPath: sanitizeText(input.landingPath, 300),
  };
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultilineText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, 254);
}

function extractFirstName(fullName, locale) {
  const fallback = locale === 'en' ? 'Friend' : 'Amigo';
  const parts = fullName.split(' ').filter(Boolean);
  return parts[0] || fallback;
}

function safeFirstName(value, fallback) {
  return sanitizeText(value, 40) || fallback;
}

function formatSubmittedDate(date, locale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatEuro(cents, locale) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function toBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localizeSource(source, locale) {
  if (!source || !SOURCE_LABELS[source]) {
    return locale === 'en' ? 'Direct / unknown' : 'Direto / desconhecido';
  }

  return SOURCE_LABELS[source][locale];
}

function buildAttribution(payload) {
  return {
    source: payload.source || null,
    utm_source: payload.utmSource || null,
    utm_medium: payload.utmMedium || null,
    utm_campaign: payload.utmCampaign || null,
    utm_content: payload.utmContent || null,
    referrer: payload.referrer || null,
    landingPath: payload.landingPath || null,
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function renderConfirmationEmail({ firstName, tierLabel, submittedDate, locale }) {
  const safeFirstName = escapeHtml(firstName);
  const safeTierLabel = escapeHtml(tierLabel);
  const safeSubmittedDate = escapeHtml(submittedDate);

  if (locale === 'en') {
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EDE8E2; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 16px 40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FEFCF9; border-radius: 2px;">
        <tr><td style="height: 3px; background-color: #4A5D4F; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr>
          <td align="center" style="padding: 52px 48px 40px 48px;">
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: #4A5D4F; line-height: 1;">LIVING PRAYER</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin: 10px auto;">
              <tr><td style="height: 1px; background-color: #C4B89A; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.20em; text-transform: uppercase; color: #8B7355; line-height: 1;">Pedro Morais</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 48px 48px 0 48px;">
            <p style="margin: 0 0 28px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #2D2D2D; line-height: 1.3;">${safeFirstName},</p>
            <p style="margin: 0 0 22px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; color: #2D2D2D; line-height: 1.7; font-style: italic;">Thank you for taking this step.</p>
            <p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Submitting an application for Living Prayer is not a trivial act &mdash; it is a declaration of intention. And that, in itself, says a great deal about your commitment to practice.</p>
            <p style="margin: 0 0 26px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Your application has been received. I will review it personally and be in touch within 48 hours.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;">
              <tr>
                <td style="padding: 18px 22px; border: 1px solid #E2D9CE; background-color: #F9F5F0;">
                  <p style="margin: 0 0 8px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8B7355; line-height: 1.5;">Application summary</p>
                  <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #3D3D3D; line-height: 1.8;">Accommodation preference: ${safeTierLabel}<br>Submitted on: ${safeSubmittedDate}</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 36px;">
              <tr>
                <td style="padding: 20px 24px; border-left: 2px solid #4A5D4F; background-color: #F5F0EB;">
                  <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #4A5D4F; line-height: 1.7;">In the meantime, if you have any questions, reply to this email &mdash; it will reach me directly.</p>
                </td>
              </tr>
            </table>
            <p style="margin: 0 0 6px 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #6B6B6B; line-height: 1.6;">With gratitude,</p>
            <p style="margin: 0 0 52px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2D2D2D; line-height: 1.3; font-style: italic;">Pedro</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 36px 48px 44px 48px;">
            <p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.20em; text-transform: uppercase; color: #4A5D4F; line-height: 1.6;">Living Prayer</p>
            <p style="margin: 0 0 16px 0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 0.08em; color: #8B7355; line-height: 1.6; text-transform: uppercase;">Asana as Sacred Practice</p>
            <p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">4&ndash;6 September 2026</p>
            <p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">Shamballah Yoga Retreats, Sintra Natural Park</p>
            <p style="margin: 0 0 20px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6;"><a href="https://livingprayer.pt" style="color: #4A5D4F; text-decoration: none;">livingprayer.pt</a></p>
          </td>
        </tr>
        <tr><td style="height: 3px; background-color: #8B7355; font-size: 0; line-height: 0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>`.trim();
  }

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EDE8E2; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 16px 40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FEFCF9; border-radius: 2px;">
        <tr><td style="height: 3px; background-color: #4A5D4F; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr>
          <td align="center" style="padding: 52px 48px 40px 48px;">
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: #4A5D4F; line-height: 1;">LIVING PRAYER</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin: 10px auto;">
              <tr><td style="height: 1px; background-color: #C4B89A; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.20em; text-transform: uppercase; color: #8B7355; line-height: 1;">Pedro Morais</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 48px 48px 0 48px;">
            <p style="margin: 0 0 28px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #2D2D2D; line-height: 1.3;">${safeFirstName},</p>
            <p style="margin: 0 0 22px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; color: #2D2D2D; line-height: 1.7; font-style: italic;">Obrigado por teres dado este passo.</p>
            <p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Submeter uma candidatura para o Living Prayer n&atilde;o &eacute; um acto trivial &mdash; &eacute; uma declara&ccedil;&atilde;o de inten&ccedil;&atilde;o. E isso, por si s&oacute;, j&aacute; diz muito sobre o teu compromisso com a pr&aacute;tica.</p>
            <p style="margin: 0 0 26px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">A tua candidatura foi recebida. Vou rev&ecirc;-la pessoalmente e entrarei em contacto contigo no prazo de 48 horas.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;">
              <tr>
                <td style="padding: 18px 22px; border: 1px solid #E2D9CE; background-color: #F9F5F0;">
                  <p style="margin: 0 0 8px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8B7355; line-height: 1.5;">Resumo da candidatura</p>
                  <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #3D3D3D; line-height: 1.8;">Alojamento pretendido: ${safeTierLabel}<br>Data de submiss&atilde;o: ${safeSubmittedDate}</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 36px;">
              <tr>
                <td style="padding: 20px 24px; border-left: 2px solid #4A5D4F; background-color: #F5F0EB;">
                  <p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #4A5D4F; line-height: 1.7;">Entretanto, se tiveres alguma quest&atilde;o, responde a este email &mdash; chegar&aacute; directamente a mim.</p>
                </td>
              </tr>
            </table>
            <p style="margin: 0 0 6px 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #6B6B6B; line-height: 1.6;">Com gratid&atilde;o,</p>
            <p style="margin: 0 0 52px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2D2D2D; line-height: 1.3; font-style: italic;">Pedro</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 36px 48px 44px 48px;">
            <p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.20em; text-transform: uppercase; color: #4A5D4F; line-height: 1.6;">Living Prayer</p>
            <p style="margin: 0 0 16px 0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 0.08em; color: #8B7355; line-height: 1.6; text-transform: uppercase;">Asana como Pr&aacute;tica Sagrada</p>
            <p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">4 a 6 de Setembro 2026</p>
            <p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">Shamballah Yoga Retreats, Parque Natural de Sintra</p>
            <p style="margin: 0 0 20px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6;"><a href="https://livingprayer.pt" style="color: #4A5D4F; text-decoration: none;">livingprayer.pt</a></p>
          </td>
        </tr>
        <tr><td style="height: 3px; background-color: #8B7355; font-size: 0; line-height: 0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function renderWaitlistConfirmationEmail({ firstName, tierLabel, submittedDate, locale }) {
  const safeFirstName = escapeHtml(firstName);
  const safeTierLabel = escapeHtml(tierLabel);
  const safeSubmittedDate = escapeHtml(submittedDate);

  if (locale === 'en') {
    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EDE8E2; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 16px 40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FEFCF9; border-radius: 2px;">
        <tr><td style="height: 3px; background-color: #4A5D4F; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr>
          <td align="center" style="padding: 52px 48px 40px 48px;">
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: #4A5D4F; line-height: 1;">LIVING PRAYER</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin: 10px auto;">
              <tr><td style="height: 1px; background-color: #C4B89A; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.20em; text-transform: uppercase; color: #8B7355; line-height: 1;">Pedro Morais</p>
          </td>
        </tr>
        <tr><td style="padding: 0 48px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr></table></td></tr>
        <tr>
          <td style="padding: 48px 48px 0 48px;">
            <p style="margin: 0 0 28px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #2D2D2D; line-height: 1.3;">${safeFirstName},</p>
            <p style="margin: 0 0 22px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; color: #2D2D2D; line-height: 1.7; font-style: italic;">Thank you for your application.</p>
            <p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Your preferred accommodation option is currently full, so I have placed your application on the waitlist for ${safeTierLabel}.</p>
            <p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">If a place opens, I will contact you personally before confirming anything.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;"><tr><td style="padding: 18px 22px; border: 1px solid #E2D9CE; background-color: #F9F5F0;"><p style="margin: 0 0 8px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8B7355; line-height: 1.5;">Waitlist summary</p><p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #3D3D3D; line-height: 1.8;">Accommodation preference: ${safeTierLabel}<br>Submitted on: ${safeSubmittedDate}</p></td></tr></table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 36px;"><tr><td style="padding: 20px 24px; border-left: 2px solid #4A5D4F; background-color: #F5F0EB;"><p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #4A5D4F; line-height: 1.7;">If you would like to switch to another accommodation category, reply to this email and I will adjust your application manually.</p></td></tr></table>
            <p style="margin: 0 0 6px 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #6B6B6B; line-height: 1.6;">With gratitude,</p>
            <p style="margin: 0 0 52px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2D2D2D; line-height: 1.3; font-style: italic;">Pedro</p>
          </td>
        </tr>
        <tr><td style="padding: 0 48px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding: 36px 48px 44px 48px;"><p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.20em; text-transform: uppercase; color: #4A5D4F; line-height: 1.6;">Living Prayer</p><p style="margin: 0 0 16px 0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 0.08em; color: #8B7355; line-height: 1.6; text-transform: uppercase;">Asana as Sacred Practice</p><p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">4&ndash;6 September 2026</p><p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">Shamballah Yoga Retreats, Sintra Natural Park</p><p style="margin: 0 0 20px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6;"><a href="https://livingprayer.pt" style="color: #4A5D4F; text-decoration: none;">livingprayer.pt</a></p></td></tr>
        <tr><td style="height: 3px; background-color: #8B7355; font-size: 0; line-height: 0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>`.trim();
  }

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EDE8E2; margin: 0; padding: 0;">
  <tr>
    <td align="center" style="padding: 40px 16px 40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FEFCF9; border-radius: 2px;">
        <tr><td style="height: 3px; background-color: #4A5D4F; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding: 52px 48px 40px 48px;"><p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: #4A5D4F; line-height: 1;">LIVING PRAYER</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin: 10px auto;"><tr><td style="height: 1px; background-color: #C4B89A; font-size: 0; line-height: 0;">&nbsp;</td></tr></table><p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.20em; text-transform: uppercase; color: #8B7355; line-height: 1;">Pedro Morais</p></td></tr>
        <tr><td style="padding: 0 48px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr></table></td></tr>
        <tr><td style="padding: 48px 48px 0 48px;"><p style="margin: 0 0 28px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #2D2D2D; line-height: 1.3;">${safeFirstName},</p><p style="margin: 0 0 22px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; color: #2D2D2D; line-height: 1.7; font-style: italic;">Obrigado pela tua candidatura.</p><p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">A op&ccedil;&atilde;o de alojamento que escolheste est&aacute; neste momento esgotada, por isso coloquei a tua candidatura em lista de espera para ${safeTierLabel}.</p><p style="margin: 0 0 22px 0; font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #3D3D3D; line-height: 1.8;">Se surgir uma vaga, entrarei em contacto contigo pessoalmente antes de confirmar qualquer coisa.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;"><tr><td style="padding: 18px 22px; border: 1px solid #E2D9CE; background-color: #F9F5F0;"><p style="margin: 0 0 8px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8B7355; line-height: 1.5;">Resumo da lista de espera</p><p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #3D3D3D; line-height: 1.8;">Alojamento pretendido: ${safeTierLabel}<br>Data de submiss&atilde;o: ${safeSubmittedDate}</p></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 36px;"><tr><td style="padding: 20px 24px; border-left: 2px solid #4A5D4F; background-color: #F5F0EB;"><p style="margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #4A5D4F; line-height: 1.7;">Se quiseres mudar para outra categoria de alojamento, responde a este email e ajusto a candidatura manualmente.</p></td></tr></table><p style="margin: 0 0 6px 0; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #6B6B6B; line-height: 1.6;">Com gratid&atilde;o,</p><p style="margin: 0 0 52px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2D2D2D; line-height: 1.3; font-style: italic;">Pedro</p></td></tr>
        <tr><td style="padding: 0 48px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height: 1px; background-color: #E2D9CE; font-size: 0; line-height: 0;">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding: 36px 48px 44px 48px;"><p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 11px; letter-spacing: 0.20em; text-transform: uppercase; color: #4A5D4F; line-height: 1.6;">Living Prayer</p><p style="margin: 0 0 16px 0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 0.08em; color: #8B7355; line-height: 1.6; text-transform: uppercase;">Asana como Pr&aacute;tica Sagrada</p><p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">4&ndash;6 September 2026</p><p style="margin: 0 0 4px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #9B9080; line-height: 1.6;">Shamballah Yoga Retreats, Parque Natural de Sintra</p><p style="margin: 0 0 20px 0; font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6;"><a href="https://livingprayer.pt" style="color: #4A5D4F; text-decoration: none;">livingprayer.pt</a></p></td></tr>
        <tr><td style="height: 3px; background-color: #8B7355; font-size: 0; line-height: 0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function renderAdminNotificationEmail({
  applicationId,
  fullName,
  email,
  phone,
  locale,
  sourceLabel,
  tierLabel,
  totalPriceCents,
  depositCents,
  participantCount,
  motivation,
  dietaryNotes,
  partnerName,
  partnerDietaryNotes,
  attribution,
  submittedDate,
  waitlisted,
  adminAppUrl,
}) {
  const detailLink = `${adminAppUrl.replace(/\/$/, '')}/applications/${applicationId}`;
  const safeMotivation = motivation ? nl2br(motivation) : '<em>Sem resposta</em>';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0EB; padding:24px; font-family:Helvetica, Arial, sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px; width:100%; background:#FEFCF9; border:1px solid #E2D9CE;">
        <tr>
          <td style="padding:24px 28px; border-bottom:1px solid #E2D9CE;">
            <p style="margin:0 0 6px 0; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#8B7355;">Living Prayer</p>
            <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:normal; color:#2D2D2D;">Nova candidatura</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr><td style="padding:8px 0; color:#8B7355; width:180px;">Nome</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(fullName)}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Email</td><td style="padding:8px 0; color:#2D2D2D;"><a href="mailto:${escapeHtml(email)}" style="color:#4A5D4F; text-decoration:none;">${escapeHtml(email)}</a></td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Telemóvel</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(phone || '—')}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Idioma</td><td style="padding:8px 0; color:#2D2D2D;">${locale === 'en' ? 'English' : 'Português'}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Tier</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(tierLabel)}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Participantes</td><td style="padding:8px 0; color:#2D2D2D;">${participantCount}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Preço total</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(formatEuro(totalPriceCents, locale))}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Sinal</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(formatEuro(depositCents, locale))}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Origem</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(sourceLabel)}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Estado inicial</td><td style="padding:8px 0; color:#2D2D2D;">${waitlisted ? 'Lista de espera' : 'Recebida'}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Submetida em</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(submittedDate)}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Notas alimentares</td><td style="padding:8px 0; color:#2D2D2D;">${dietaryNotes ? nl2br(dietaryNotes) : '—'}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Parceiro/a</td><td style="padding:8px 0; color:#2D2D2D;">${escapeHtml(partnerName || '—')}</td></tr>
              <tr><td style="padding:8px 0; color:#8B7355;">Notas parceiro/a</td><td style="padding:8px 0; color:#2D2D2D;">${partnerDietaryNotes ? nl2br(partnerDietaryNotes) : '—'}</td></tr>
            </table>
            <div style="margin:24px 0 0 0; padding:18px 20px; background:#F9F5F0; border-left:3px solid #4A5D4F;">
              <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#8B7355;">Motivação</p>
              <p style="margin:0; color:#2D2D2D; line-height:1.7;">${safeMotivation}</p>
            </div>
            <div style="margin:16px 0 0 0; padding:18px 20px; background:#F9F5F0; border-left:3px solid #8B7355;">
              <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#8B7355;">Attribution</p>
              <p style="margin:0; color:#2D2D2D; line-height:1.7;">${nl2br(JSON.stringify(attribution, null, 2))}</p>
            </div>
            <p style="margin:24px 0 0 0;"><a href="${escapeHtml(detailLink)}" style="display:inline-block; background:#4A5D4F; color:#FEFCF9; text-decoration:none; padding:12px 18px;">Abrir no CRM</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

async function verifyTurnstile({ secret, token, ip }) {
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (ip) {
      body.set('remoteip', ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    ''
  );
}

async function sendAndLogEmail({
  sql,
  resend,
  applicationId,
  templateKey,
  subject,
  toEmail,
  fromEmail,
  html,
  replyTo,
  sentByAdmin,
  activitySummary,
}) {
  const emailLogId = crypto.randomUUID();
  const message = {
    from: fromEmail,
    to: [toEmail],
    subject,
    html,
  };

  if (replyTo) {
    message.reply_to = replyTo;
  }

  const { data, error } = await resend.emails.send(message);

  if (error) {
    await sql`
      INSERT INTO email_log (
        id,
        application_id,
        resend_id,
        template_key,
        subject,
        to_email,
        from_email,
        status,
        html_snapshot,
        provider_payload,
        sent_by_admin
      )
      VALUES (
        ${emailLogId},
        ${applicationId},
        NULL,
        ${templateKey},
        ${subject},
        ${toEmail},
        ${fromEmail},
        'failed',
        ${html},
        ${JSON.stringify(error)}::jsonb,
        ${sentByAdmin}
      )
    `;

    throw new Error(error.message || 'Failed to send email');
  }

  await sql.transaction((txn) => [
    txn`
      INSERT INTO email_log (
        id,
        application_id,
        resend_id,
        template_key,
        subject,
        to_email,
        from_email,
        status,
        html_snapshot,
        provider_payload,
        sent_by_admin
      )
      VALUES (
        ${emailLogId},
        ${applicationId},
        ${data?.id || null},
        ${templateKey},
        ${subject},
        ${toEmail},
        ${fromEmail},
        'sent',
        ${html},
        ${JSON.stringify(data || {})}::jsonb,
        ${sentByAdmin}
      )
    `,
    txn`
      INSERT INTO activity_log (
        application_id,
        activity_type,
        summary,
        metadata
      )
      VALUES (
        ${applicationId},
        'email_sent',
        ${activitySummary},
        ${JSON.stringify({
          templateKey,
          emailLogId,
          resendId: data?.id || null,
          toEmail,
        })}::jsonb
      )
    `,
  ]);
}

function isUniqueViolation(error) {
  return error && error.code === '23505';
}
