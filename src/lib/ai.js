// src/lib/ai.js
// Shared OpenRouter AI utility — reusable across all views.

const KEY = import.meta.env.VITE_OPENROUTER_API_KEY

async function callAI(systemPrompt, userContent) {
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
        { role: 'user',   content: userContent  },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

/** Improve wording of interview notes / candidate comments. */
export async function improveText(text, lang) {
  if (!text || text.trim().length < 15) return null
  const system = lang === 'de'
    ? 'Du bist ein HR-Profi. Formuliere die folgenden Gesprächsnotizen in ein klares, strukturiertes und professionelles Interviewfeedback um. Behalte alle Kernaussagen. Gib NUR den verbesserten Text zurück – keine Erklärung, kein Präambel.'
    : 'You are an HR professional. Rewrite the following interview notes into clear, structured, professional feedback. Keep all key points. Return ONLY the improved text – no explanation, no preamble.'
  return callAI(system, text)
}

/** Extract key resume information into a first-impression paragraph. */
export async function extractResumeInfo(resumeText, lang) {
  if (!resumeText || resumeText.trim().length < 50) return null
  const system = lang === 'de'
    ? 'Du bist ein erfahrener HR-Recruiter. Lies den folgenden Lebenslauf und schreibe einen prägnanten ersten Eindruck (4–6 Sätze). Erwähne: wichtigste Fähigkeiten, Berufserfahrung (Jahre), Ausbildung, besondere Stärken oder Auffälligkeiten. Professioneller, objektiver Ton. Gib NUR den Fließtext zurück – keine Aufzählungen, keine Überschriften, kein Präambel.'
    : 'You are an experienced HR recruiter. Read the following resume and write a concise first impression (4–6 sentences). Cover: key skills, years of experience, education, standout strengths or concerns. Professional, objective tone. Return ONLY the paragraph – no bullet points, no headings, no preamble.'
  // Trim to ~6000 chars to stay within context limits of free model
  return callAI(system, resumeText.slice(0, 6000))
}
