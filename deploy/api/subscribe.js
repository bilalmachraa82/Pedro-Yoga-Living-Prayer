export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { fullName, email, phone, motivation, tier, q4, locale } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const names = fullName ? fullName.trim().split(' ') : [];
  const firstName = names.length > 0 ? names[0] : '';
  const surname = names.length > 1 ? names.slice(1).join(' ') : '';

  const TIER_LABELS = {
    shared: 'Partilhado / Shared',
    individual_double: 'Quarto cama casal / Private double',
    individual_suite: 'Quarto suite / Private ensuite',
    couples: 'Casal / Couples',
    couples_suite: 'Casal com suite / Couples ensuite'
  };

  const SOURCE_LABELS = {
    instagram: 'Instagram',
    whatsapp: 'WhatsApp / Comunidade Oração Viva',
    newsletter: 'Newsletter / Substack',
    friend: 'Amigo / Friend',
    other: 'Outro / Other'
  };

  const API_KEY = process.env.SYSTEME_IO_API_KEY;
  const TAG_ID = process.env.SYSTEME_IO_TAG_ID || '1937942';

  if (!API_KEY) {
    console.error('SYSTEME_IO_API_KEY is not defined');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'Accept': 'application/json'
  };

  try {
    const contactPayload = {
      email,
      fields: [
        { slug: 'first_name', value: firstName },
        { slug: 'surname', value: surname },
        { slug: 'phone_number', value: phone || '' },
        { slug: 'alojamento', value: TIER_LABELS[tier] || tier || '' },
        { slug: 'motivacao', value: motivation || '' },
        { slug: 'como_soube', value: SOURCE_LABELS[q4] || q4 || '' },
        { slug: 'idioma', value: locale === 'en' ? 'English' : 'Português' }
      ]
    };

    const createRes = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload)
    });

    let contactId;

    if (createRes.status === 422) {
      const searchRes = await fetch(
        `https://api.systeme.io/api/contacts?email=${encodeURIComponent(email)}`,
        { headers }
      );
      const searchData = await searchRes.json();
      if (searchData.items && searchData.items.length > 0) {
        contactId = searchData.items[0].id;

        await fetch(`https://api.systeme.io/api/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/merge-patch+json' },
          body: JSON.stringify(contactPayload)
        });
      } else {
        const errText = await createRes.text();
        return res.status(422).json({ message: 'Erro ao registar', details: errText });
      }
    } else if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('Systeme.io API error:', errorText);
      return res.status(createRes.status).json({ message: 'Erro ao registar contacto', details: errorText });
    } else {
      const contactData = await createRes.json();
      contactId = contactData.id;
    }

    try {
      await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tagId: parseInt(TAG_ID) })
      });
    } catch (tagErr) {
      console.error('Tag assignment failed (non-blocking):', tagErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Inscrição registada com sucesso!',
      contactId
    });

  } catch (error) {
    console.error('Falhou o envio para Systeme.io:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
