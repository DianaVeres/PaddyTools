const SPANISH_OUTPUT_INSTRUCTION = `
INSTRUCCIÓN OBLIGATORIA DE IDIOMA:
- Analiza siempre el mensaje recibido y redacta reply, summary, next_step, category y procedure_reference en castellano.
- Si el mensaje recibido está en inglés, reply debe contener exactamente estos tres bloques:
TRADUCCIÓN AL CASTELLANO:
[traducción completa y fiel]

RESPUESTA EN CASTELLANO:
[respuesta para el cliente]

RESPONSE IN ENGLISH:
[traducción fiel al inglés de la respuesta anterior, lista para enviar al cliente]
- Si el mensaje ya está en castellano, reply debe contener únicamente la respuesta, sin esos encabezados.
- No omitas datos, números, referencias, fechas ni enlaces al traducir.
`.trim();

export function withSpanishHotlineInstruction(guidance: string) {
  return [guidance.trim(), SPANISH_OUTPUT_INSTRUCTION]
    .filter(Boolean)
    .join('\n\n');
}

export function splitSpanishHotlineReply(value: string) {
  const text = value.trim();
  const match = text.match(
    /^TRADUCCI[ÓO]N AL CASTELLANO:\s*([\s\S]*?)\s*RESPUESTA EN CASTELLANO:\s*([\s\S]*?)\s*RESPONSE IN ENGLISH:\s*([\s\S]+)$/i,
  );
  if (!match) return { translation: '', reply: text, englishReply: '' };
  return {
    translation: match[1].trim(),
    reply: match[2].trim(),
    englishReply: match[3].trim(),
  };
}

export function storedHotlineIncoming(original: string, translation: string) {
  const source = original.trim();
  const translated = translation.trim();
  if (!translated) return source;
  return `${source}\n\nTRADUCCIÓN AL CASTELLANO:\n${translated}`;
}

export function storedHotlineReply(spanish: string, english: string) {
  const spanishReply = spanish.trim();
  const englishReply = english.trim();
  if (!englishReply) return spanishReply;
  return `RESPUESTA EN CASTELLANO:\n${spanishReply}\n\nRESPONSE IN ENGLISH:\n${englishReply}`;
}
