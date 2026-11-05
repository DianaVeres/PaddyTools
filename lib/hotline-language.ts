const SPANISH_OUTPUT_INSTRUCTION = `
INSTRUCCIÓN OBLIGATORIA DE IDIOMA:
- Analiza siempre el mensaje recibido y redacta reply, summary, next_step, category y procedure_reference en castellano.
- Si el mensaje recibido está en inglés, reply debe contener exactamente estos dos bloques:
TRADUCCIÓN AL CASTELLANO:
[traducción completa y fiel]

RESPUESTA EN CASTELLANO:
[respuesta para el cliente]
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
    /^TRADUCCI[ÓO]N AL CASTELLANO:\s*([\s\S]*?)\s*RESPUESTA EN CASTELLANO:\s*([\s\S]+)$/i,
  );
  if (!match) return { translation: '', reply: text };
  return {
    translation: match[1].trim(),
    reply: match[2].trim(),
  };
}

export function storedHotlineIncoming(original: string, translation: string) {
  const source = original.trim();
  const translated = translation.trim();
  if (!translated) return source;
  return `${source}\n\nTRADUCCIÓN AL CASTELLANO:\n${translated}`;
}
