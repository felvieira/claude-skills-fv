# Inventário de CLI e Skills Já Conectadas

Cruzar aqui antes de marcar uma ferramenta como "oportunidade de escrever skill nova". Se já existe CLI oficial ou skill do dev-team-kit-fv que cobre a ferramenta, marcar como "já conectado" em vez de propor trabalho novo.

| Ferramenta | Já coberto? | Como |
|---|---|---|
| GitHub | sim | CLI oficial `gh`, já usado em várias skills do kit (18, 48) |
| Shopify | parcial | tem API REST/GraphQL oficial; sem CLI first-party robusto — normalmente vale uma skill/wrapper dedicado |
| Stripe | parcial | tem CLI oficial (`stripe`) pra webhook/teste, API completa pra dado |
| Geração de imagem | sim | `D:\Repos\GERAL\image-generation` (CLI `img`) já cobre isso no ambiente do usuário — não reinventar |
| Geração de vídeo | sim | `D:\Repos\GERAL\video-generation` já cobre — não reinventar |
| Edição de vídeo local | sim | skill 75 (ffmpeg-media) do dev-team-kit-fv |
| Diagrama técnico | sim | skill 76 (diagram-validated) do dev-team-kit-fv |
| Apresentação/deck | sim | skill 77 (frontend-slides) do dev-team-kit-fv |
| WhatsApp Business | não | normalmente exige integração via API oficial da Meta ou provedor terceiro — candidato real a skill nova |
| TikTok Marketing API | não | sem CLI oficial amplamente adotado — candidato a skill nova, ~150 linhas de wrapper de API |
| Prontuário eletrônico | não | geralmente proprietário por fornecedor, sem padrão — avaliar caso a caso, frequentemente exige conector customizado |

## Regra de decisão

Antes de listar algo em `OPORTUNIDADES.md` como "skill a escrever", checar esta tabela e as skills do kit (`skills/`). Só listar como trabalho novo se não houver cobertura nenhuma — caso contrário, apontar pra ferramenta/skill já existente.
