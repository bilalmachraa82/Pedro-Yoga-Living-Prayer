export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { fullName, email, phone, motivation, tier, q4 } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Extrair o primeiro nome e o apelido
  const names = fullName ? fullName.trim().split(' ') : [];
  const firstName = names.length > 0 ? names[0] : '';
  const surname = names.length > 1 ? names.slice(1).join(' ') : '';

  // Chave de API do Systeme.io via variável de ambiente do Vercel
  const API_KEY = process.env.SYSTEME_IO_API_KEY;

  if (!API_KEY) {
    console.error('SYSTEME_IO_API_KEY is not defined in environment variables');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    // Comunicação com a API do Systeme.io
    const response = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Accept': 'application/json'
      },
      // De acordo com a documentação do systeme.io, campos adicionais costumam ser num array ou em slug.
      // O email é mandatório e os atributos standard são first_name, surname, phone_number
      body: JSON.stringify({
        email: email,
        fields: [
          { slug: 'first_name', value: firstName },
          { slug: 'surname', value: surname },
          { slug: 'phone_number', value: phone }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Systeme.io API error:', errorText);
      return res.status(response.status).json({ message: 'Erro ao registar contacto', details: errorText });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Falhou o envio para Systeme.io:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
