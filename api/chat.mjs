// Inky AI proxy — Vercel serverless function.
// Keeps the Groq API key on the server (env GROQ_API_KEY) so it never ships to the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    return res.status(400).json({ error: { message: 'Invalid JSON body' } });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(501).json({
      error: { message: 'AI is not configured yet — the server needs a GROQ_API_KEY environment variable.' }
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = typeof body.model === 'string' && body.model ? body.model : 'llama-3.3-70b-versatile';

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 700 })
    });
    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        error: { message: data?.error?.message ?? `Groq ${groqRes.status}` }
      });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: { message: 'Upstream AI request failed.' } });
  }
}
