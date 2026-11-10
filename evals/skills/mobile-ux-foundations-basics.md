# Eval - Mobile UX Foundations: ergonomia, dark mode e percepção

## Objetivo
Validar que a skill 57 adapta ergonomia, cores e estados ao contexto, sem transformar preferências visuais em proibições universais.

## Entrada
- app mobile com navegação principal no topo (menu hambúrguer)
- tema escuro com `background: #000000` e texto `#FFFFFF`
- tela que faz fetch de 3s mostrando spinner centralizado
- tela de login pedindo e-mail + senha, com regra "8 caracteres, 1 símbolo, 1 número, 1 maiúscula"

## Esperado
- navegação é avaliada quanto a alcance, plataforma e frequência de uso; mudanças preservam fluxos
- superfície escura e texto são avaliados por contraste, legibilidade e identidade; preto puro pode ser adequado
- elevação e separação de superfícies são verificadas no tema usado
- estado de carregamento de 3s informa o progresso; skeleton é uma opção quando faz sentido
- regra de senha alinhada ao NIST: sem matriz rígida, sem "confirmar senha", colagem permitida
- passkey oferecida em primeiro plano, com caminho alternativo e bootstrap key

## Evidências Mínimas
- sinais de `node scripts/check-design-generic.mjs` são revistos no contexto, sem proibir uma cor isolada
- contraste dos pares relevantes é verificado em cada tema existente; limitações do checker são registradas
- decisão de posicionamento cita a zona ergonômica

## Reprova Se
- afirma que preto puro ou branco puro, por si só, tornam a interface ruim
- afirma que o contraste está adequado sem verificar os usos reais
- mostra loader em operação abaixo de 1s (flash é pior que ausência)
- usa progresso indeterminado acima de 10s
- exige "confirmar senha" ou bloqueia colagem
- dispara diálogo nativo de permissão na abertura do app, sem contexto

## Casos Limite
- **ação destrutiva no canto difícil**: correto de propósito — a dificuldade de alcance vira prevenção de erro
- **app com identidade escura**: preto puro pode ser mantido quando leitura, estados e separação de superfícies funcionam
- **usuário com fonte ampliada**: container precisa de `min-height`, nunca altura fixa
