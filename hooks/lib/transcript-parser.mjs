/**
 * transcript-parser.mjs
 * Utilitário para extrair turnos estruturados do transcript Claude Code.
 *
 * Adaptado de addozhang/mem9 (Apache-2.0):
 * https://github.com/addozhang/mem9/blob/main/claude-plugin/hooks/lib/transcript-parser.mjs
 *
 * Uso:
 *   import { parseTranscript, getLastNTurns, getLastUserPrompt } from './transcript-parser.mjs';
 *
 *   const turns = parseTranscript(transcriptJson);
 *   const recent = getLastNTurns(turns, 3);
 *   const lastPrompt = getLastUserPrompt(turns);
 */

/**
 * Parseia o JSON do transcript Claude Code e retorna array de turnos.
 * Cada turno: { role: 'user'|'assistant', content: string, timestamp?: string }
 *
 * @param {string|object} transcriptData - JSON string ou objeto já parseado
 * @returns {Array<{role: string, content: string, timestamp?: string}>}
 */
export function parseTranscript(transcriptData) {
  try {
    const data = typeof transcriptData === 'string'
      ? JSON.parse(transcriptData)
      : transcriptData;

    // Formato Claude Code: array de mensagens com role + content
    if (Array.isArray(data)) {
      return data
        .filter(msg => msg && msg.role && msg.content)
        .map(msg => ({
          role: msg.role,
          content: extractTextContent(msg.content),
          timestamp: msg.timestamp || null,
        }))
        .filter(turn => turn.content.trim().length > 0);
    }

    // Formato alternativo: { messages: [...] }
    if (data && Array.isArray(data.messages)) {
      return parseTranscript(data.messages);
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Extrai texto puro de content que pode ser string ou array de blocos.
 * Blocos do tipo 'tool_result' e 'tool_use' são ignorados (ruído).
 *
 * @param {string|Array} content
 * @returns {string}
 */
function extractTextContent(content) {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join('\n')
      .trim();
  }

  return '';
}

/**
 * Retorna os últimos N turnos do transcript.
 *
 * @param {Array} turns - output de parseTranscript()
 * @param {number} n - número de turnos a retornar
 * @returns {Array}
 */
export function getLastNTurns(turns, n = 5) {
  return turns.slice(-n);
}

/**
 * Retorna o conteúdo do último prompt do usuário.
 *
 * @param {Array} turns - output de parseTranscript()
 * @returns {string|null}
 */
export function getLastUserPrompt(turns) {
  const userTurns = turns.filter(t => t.role === 'user');
  return userTurns.length > 0 ? userTurns[userTurns.length - 1].content : null;
}

/**
 * Formata turnos para ingestão em sistema de memória externo.
 * Produz array de { role, content } limpo, sem timestamps ou metadados.
 *
 * @param {Array} turns - output de parseTranscript() ou getLastNTurns()
 * @returns {Array<{role: string, content: string}>}
 */
export function formatForMemoryIngestion(turns) {
  return turns.map(({ role, content }) => ({ role, content }));
}

/**
 * Extrai pares pergunta-resposta completos (user + assistant consecutivos).
 * Útil para ingestão estruturada em sistemas Q&A de memória.
 *
 * @param {Array} turns - output de parseTranscript()
 * @returns {Array<{question: string, answer: string}>}
 */
export function extractQAPairs(turns) {
  const pairs = [];
  for (let i = 0; i < turns.length - 1; i++) {
    if (turns[i].role === 'user' && turns[i + 1].role === 'assistant') {
      pairs.push({
        question: turns[i].content,
        answer: turns[i + 1].content,
      });
      i++; // pular o assistant já processado
    }
  }
  return pairs;
}
