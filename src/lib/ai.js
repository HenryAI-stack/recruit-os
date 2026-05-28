// src/lib/ai.js
// Shared OpenRouter AI utility — reusable across all views.

const KEY = import.meta.env.VITE_OPENROUTER_API_KEY

export async function improveText(text, lang) {
  if (!text || text.trim().length < 15) return null
  const systemPrompt = lang === 'de'
    ? 'Du bist ein HR-Profi. Formuliere die folgenden Gesprächsnotizen in ein klares, strukturiertes und professionelles Interviewfeedback um. Behalte alle Kernaussagen. Gib NUR den verbesserten Text zurück – keine Erklärung, kein Präambel.'
    : 'You are an HR professional. Rewrite the following interview notes into clear, structured, professional feedback. Keep all key points. Return ONLY the improved text – no explanation, no preamble.'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'RecruitOS',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: text },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}
