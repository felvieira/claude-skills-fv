# End-to-End Example - Video Feature

## Caso

Adicionar geracao de video curto promocional a partir de imagem de produto e prompt.

## Fluxo

1. definir objetivo, duracao e formato do video
2. montar prompt cinematografico com sujeito, acao, camera e estilo
3. adapter chama provider de video
4. frontend acompanha status e mostra resultado assinado ou salvo
5. observabilidade registra custo, latencia e falhas

## Componentes

- provider: `fal.ai`
- adapter: `generateVideo()`
- hook: `useVideoGeneration`
- prompt: narrativa curta com camera e audio quando suportado

## Regra

Video so deve entrar quando o valor da feature justificar custo e latencia maiores.
