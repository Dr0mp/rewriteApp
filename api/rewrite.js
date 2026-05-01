export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { text, openness, conscientiousness, extraversion, agreeableness, neuroticism } = body;

  if (!text) {
    return new Response('Missing required field: text', { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response('Server misconfiguration: API key not set', { status: 500 });
  }

  const prompt =
`### Editorial Instructions:
Rewrite the following text adapting it according to the specified Big Five personality traits:
- Openness: ${openness}/5
- Conscientiousness: ${conscientiousness}/5
- Extraversion: ${extraversion}/5
- Agreeableness: ${agreeableness}/5
- Neuroticism: ${neuroticism}/5

### Original Text:
${text}

### Requirement:
Rewrite the text in maximum 3 sentences. Respond directly and exclusively with the rewritten text, without additional explanations.`;

  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': new URL(req.url).origin,
      'X-Title': 'Big Five Article Rewriter'
    },
    body: JSON.stringify({
      model: 'google/gemma-3-4b-it',
      messages: [
        {
          role: 'system',
          content: 'You are an editorial assistant who rewrites texts strictly according to the Big Five personality trait instructions provided. Respond only with the rewritten text — no explanations, no preamble. Slightly propagandistic.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true,
      max_tokens: 256
    })
  });

  if (!openRouterRes.ok) {
    const errorText = await openRouterRes.text();
    return new Response(`OpenRouter error: ${errorText}`, { status: openRouterRes.status });
  }

  return new Response(openRouterRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no'
    }
  });
}
