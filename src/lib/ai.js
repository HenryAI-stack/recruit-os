// src/lib/ai.js
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
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
    }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[ai.js] OpenRouter error response:', res.status, errBody)
    throw new Error(`OpenRouter ${res.status}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    console.error('[ai.js] Unexpected OpenRouter response shape:', data)
    return null
  }
  return content.trim() || null
}

export async function improveText(text, lang) {
  if (!text || text.trim().length < 15) return null
  const system = lang === 'de'
    ? 'Du bist ein HR-Profi. Formuliere die folgenden Notizen in klares, professionelles Feedback um. Behalte alle Kernaussagen. Gib NUR den verbesserten Text zurück.'
    : 'You are an HR professional. Rewrite the following notes into clear, professional feedback. Keep all key points. Return ONLY the improved text.'
  return callAI(system, text)
}

export async function extractResumeInfo(resumeText, lang) {
  if (!resumeText || resumeText.trim().length < 50) return null
  const system = lang === 'de'
    ? 'Lies den Lebenslauf und schreibe einen prägnanten Ersteindruck (4–6 Sätze): Kernkompetenzen, Erfahrung, Ausbildung, Stärken. Nur Fließtext, kein Präambel.'
    : 'Read this resume and write a concise first impression (4–6 sentences): core skills, experience, education, standout qualities. Plain text only, no preamble.'
  return callAI(system, resumeText.slice(0, 6000))
}

export async function extractCandidateInfo(resumeText, lang) {
  if (!resumeText || resumeText.trim().length < 50) return null
  const tpl = '{"firstName":"","lastName":"","email":"","phone":"","mobile":"","address":"","birthday":"","notes":""}'
  const system = lang === 'de'
    ? `Extrahiere Infos aus dem Lebenslauf. Gib NUR dieses JSON zurück (kein Markdown, keine Erklärung): ${tpl}. Geburtstag: YYYY-MM-DD. notes = professioneller Ersteindruck 3-4 Sätze.`
    : `Extract info from this resume. Return ONLY this JSON (no markdown, no explanation): ${tpl}. Birthday: YYYY-MM-DD. notes = professional first impression 3-4 sentences.`
  const raw = await callAI(system, resumeText.slice(0, 6000))
  if (!raw) return null

  let parsed = null
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g,'').trim())
  } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error('[ai.js] extractCandidateInfo: AI did not return a valid object. Raw response:', raw)
    return null
  }
  return parsed
}

export async function generateInterviewQuestions(jobTitle, jobDesc, candidateNotes, lang) {
  const system = lang === 'de'
    ? `HR-Interviewer: Erstelle 9 Interviewfragen für die Position. Mix: 3 fachlich, 3 Verhalten (STAR), 2 Motivation, 1 Kultur. NUR nummerierte Liste – keine Einleitung, keine Kategorie-Überschriften.`
    : `HR interviewer: Create 9 interview questions for this position. Mix: 3 technical, 3 behavioral (STAR), 2 motivation, 1 culture fit. Return ONLY a numbered list – no introduction, no category headers.`
  const ctx = [`Position: ${jobTitle}`, jobDesc ? `Description: ${jobDesc.slice(0,500)}` : '', candidateNotes ? `Candidate: ${candidateNotes.slice(0,400)}` : ''].filter(Boolean).join('\n\n')
  return callAI(system, ctx)
}
