# Mobile UX Foundations Guide

Guia de referência da skill `57-mobile-ux-foundations`. Consultar quando precisar da tabela completa, do valor exato ou do fluxo detalhado que a SKILL.md só resume.

## Zona do polegar — números de referência

Distribuição de aderência observada em uso real (pesquisa de campo de Steven Hoober):

| Padrão de uso | Proporção aproximada |
| --- | --- |
| Navegam usando o polegar | ~75% |
| Operam com uma mão só | ~49% |
| Seguram com uma mão, tocam com a outra | ~36% |

Precisão de toque por zona:

| Zona | Área da tela | Precisão relativa |
| --- | --- | --- |
| Natural | Terço inferior (~25–40%) | Quase total |
| Confortável | Faixa central | ~84% |
| Alongamento | Terço superior e canto oposto | ~61% |

O canto superior **oposto à mão dominante** é o ponto mais caro da tela — exige reposicionar a pegada inteira. Reservar para o que é raro ou deve ter atrito.

### Limiares de gesto

| Parâmetro | Faixa |
| --- | --- |
| Distância mínima de swipe | 80–120px (conforme densidade) |
| Velocidade mínima | 200–250px/s |
| Tolerância de ângulo | até 25° do eixo |

Acima de 25° de desvio, o movimento é scroll impreciso — tratar como scroll, não como swipe, evita disparo acidental.

## Alvos de toque — comparativo entre normas

| Norma | Alvo mínimo | Espaçamento |
| --- | --- | --- |
| Material Design (Android) | 48×48dp (~9mm físicos) | 8dp |
| Apple HIG (iOS) | 44×44pt | ~8pt |
| WCAG 2.2 AA | 24×24px CSS | separação exigida |

O piso da WCAG é o mínimo legal, não a meta de qualidade: ponta de dedo adulta mede ~1,6–2cm, e a zona de impacto do polegar ~2,5cm. Projetar para 44–48 e tratar 24 como piso absoluto.

O alvo é a **área que escuta o toque**, não o desenho do ícone. Ícone de 24px dentro de um alvo de 48px é o padrão correto — expandir com padding ou pseudo-elemento.

## Grade de 8dp

| Grade | Uso |
| --- | --- |
| 8dp | Estrutura: margem, altura de barra, altura de item de lista |
| 4dp | Refino: espaçamento tipográfico, detalhe de ícone |

Referências comuns: barra de status 24dp, app bar 56dp, item de lista 88dp.

Usar unidade relativa (`rem`/`sp`) em vez de px fixo para que o espaçamento acompanhe o aumento de fonte do sistema — caso contrário, a UI sufoca quando o usuário amplia o texto por acessibilidade.

## Tipografia mobile

| Papel | Tamanho |
| --- | --- |
| Corpo de texto | 16sp mínimo (18sp em leitura longa) |
| Label / caption | 11–12sp, só para metadado secundário |

Microtipografia (W3C / Material):

| Propriedade | Valor |
| --- | --- |
| `line-height` | ≥ 1.5× o tamanho da fonte |
| Espaço entre parágrafos | ~2× o tamanho da fonte |
| `letter-spacing` | ~0.12× o tamanho da fonte |

Título acima de 3 linhas vira parede de texto e o olho pula. Usar *eyebrow* (categoria curta em caixa alta, ~10pt) acima do título para dar contexto sem alongá-lo.

**Fator de vislumbre:** cortar intencionalmente um card ou linha de texto na dobra inferior sinaliza que há mais conteúdo abaixo, induzindo o scroll sem precisar de seta indicativa.

## Dark mode — escala de superfície

```css
:root[data-theme="dark"] {
  --surface-0: #121212;  /* base da tela */
  --surface-1: #1e1e1e;  /* card, lista */
  --surface-2: #232323;  /* menu, dropdown */
  --surface-3: #282828;  /* modal, bottom sheet */

  --text-primary:   rgba(255, 255, 255, 0.87);
  --text-secondary: rgba(255, 255, 255, 0.60);
  --text-disabled:  rgba(255, 255, 255, 0.38);
}
```

Texto branco puro (`#FFFFFF`) em superfície escura causa halation. Usar branco com opacidade — 87% para primário é o padrão do Material — reduz o "sangramento" das letras sem perder contraste.

No claro, elevação = sombra. No escuro, sombra é invisível: **elevação = superfície mais clara**. Quanto mais alto na pilha Z, mais claro o fundo.

### Por que não `#000000`

| Problema | Efeito |
| --- | --- |
| Halation | Letra "sangra" contra ausência de luz; grave para astigmatismo |
| Smearing OLED | Pixel desligado demora a reacender no scroll, deixa rastro |
| Perda de elevação | Sem luz residual, sombra não existe — profundidade Z quebra |

Preto puro só em: economia extrema de bateria e consumo de mídia em tela cheia.

### Contraste

| Conteúdo | WCAG AA |
| --- | --- |
| Texto corpo | 4.5:1 |
| Texto ≥18pt (ou ≥14pt bold), ícone | 3:1 |
| Logo, decorativo | isento |

Verificar nos **dois** temas. Cor que passa no claro frequentemente falha no escuro, e vice-versa.

## Tempo e percepção

| Limiar | Percepção | Tratamento |
| --- | --- | --- |
| 100ms | Instantâneo | Feedback no próprio controle |
| 1s | Fluxo intacto | Nada, ou feedback embutido |
| 1–10s | Atenção vaza | Skeleton com a forma final |
| >10s | Abandono | Progresso determinado (%) + cancelar/segundo plano |

### Skeleton

```
Regras:
- espelha o layout final (mesmas dimensões) → sem layout shift na troca
- pulse suave; exibição mínima ~300ms para não piscar
- abaixo de 1s: não mostrar nada
- acima de 10s: skeleton não basta, precisa de percentual real
```

Refinamento: extrair a cor dominante da imagem que vai carregar e usar como tom base do bloco — a transição para o conteúdo real fica quase imperceptível.

Spinner permanece válido **localizado** (dentro de um botão processando), nunca como tela cheia de espera.

### Easing

| Situação | Curva |
| --- | --- |
| Entrando | `ease-out` |
| Saindo | `ease-in` |
| Loop de carregamento | `linear` |

`linear` em transição de UI parece mecânico porque nada no mundo físico se move sem aceleração.

### Haptics

| Evento | Padrão |
| --- | --- |
| Sucesso | Toque único curto |
| Alerta | Toque duplo |
| Erro | Padrão grave, mais longo |
| Scroll / navegação | Nenhum |

## Passkeys — fluxo e recuperação

```
Registro:
1. Usuário autentica pela via atual (senha, magic link, OTP)
2. Oferecer passkey com benefício concreto ("entre com a digital, sem senha")
3. Criar passkey (WebAuthn) → biometria do dispositivo
4. Incentivar bootstrap key: segundo dispositivo ou chave física
5. Manter a senha antiga ativa em segundo plano por ~30 dias (warm handover)

Login:
1. "Entrar com passkey" em primeiro plano
2. Fallback visível: magic link ou OTP
3. Nunca exigir digitar identificador antes de oferecer a passkey

Recuperação (o ponto de falha real):
- perdeu o dispositivo → bootstrap key ou magic link
- sem nenhum dos dois → fluxo de recuperação com verificação reforçada
- nunca deixar o usuário sem saída: lockout permanente é falha de design
```

O calcanhar de Aquiles de passkey não é a criação, é a **perda do dispositivo**. Todo fluxo precisa responder "e se o aparelho sumir hoje?" antes de ir para produção.

### Senha, quando existir (NIST SP 800-63B)

| Fazer | Não fazer |
| --- | --- |
| Mínimo 8, aceitar frase longa | Exigir símbolo + número + maiúscula |
| Checar contra lista de vazamento | Forçar troca periódica sem indício de comprometimento |
| Mostrar/ocultar + medidor de força | Campo "confirmar senha" |
| Permitir colar | Bloquear colagem |

Regra rígida empurra para senha previsível ou anotada — piora a segurança real que pretendia proteger.

## Formulário

```html
<!-- Label flutuante, não placeholder solto -->
<div class="relative">
  <input id="email" type="email" inputmode="email" autocomplete="email"
         class="peer w-full text-base" placeholder=" " />
  <label for="email"
         class="absolute left-3 top-3 transition-all
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
                peer-focus:top-0 peer-focus:text-xs">
    E-mail
  </label>
</div>
```

`placeholder=" "` (espaço) é o truque que faz `:placeholder-shown` funcionar como estado "vazio" para animar a label.

Validação inline: validar no **blur** do campo, não a cada tecla (validar enquanto digita acusa erro antes de terminar) nem só no submit (lista dispersa de erros no final gera abandono).

Erro precisa de ícone + texto, nunca só cor — daltonismo. E nunca limpar o que foi digitado.

## Permission priming

```
ERRADO:  abrir app → diálogo nativo de GPS → usuário nega → recurso morto

CERTO:   usuário toca "lojas perto de mim"
      →  tela explica o benefício concreto
      →  diálogo nativo do sistema
      →  se negar: busca por CEP continua funcionando
```

Negação de permissão no iOS/Android é praticamente definitiva — recuperar exige mandar o usuário às configurações do sistema, o que quase ninguém faz. Por isso o pedido só acontece depois do contexto, e o app continua útil sem a permissão.

## Referência rápida

```
Alvo de toque       44–48px  (piso WCAG: 24px)
Grade               8dp estrutura / 4dp refino
Corpo de texto      16sp mín. (18sp leitura longa)
Line-height         ≥ 1.5×
Contraste           4.5:1 corpo / 3:1 grande
Superfície escura   #121212 (nunca #000000)
Feedback de toque   ≤ 100ms
Skeleton            1s–10s
Progresso %         > 10s
Swipe               80–120px, 200–250px/s, ≤25°
Senha               ≥ 8 caracteres, sem matriz rígida
Warm handover       ~30 dias
```
