# RPA

Leitura estática de treze arquivos: nove arquivos de código do núcleo MCP, proteção de ferramentas e entrypoint, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

1 comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.

## RPA-01 — O serviço de browser prepara instruções, não executa o processo

Domínio: Integração com automação de navegador. Natureza: operational. Evidência: observed.

**Quando:** O cliente solicita instrução de screenshot, extração de imagens ou scraping.

**O que acontece:** O serviço retorna URL e parâmetros descritivos. Screenshot assume página inteira; imagens usam seletor img e limite configurado. A execução depende de um consumidor externo.

**Exceções e limites:** Não há lançamento de browser, login, retry, idempotência ou fila de exceções nestas funções. Nenhum processo de RPA operacional foi comprovado neste recorte.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/services/playwright.ts:14-55]

```text
export function buildScreenshotInstruction(
  url: string,
  fullPage: boolean = true,
  viewport?: { width: number; height: number },
): ScreenshotInstruction {
  return {
    url,
    fullPage,
    viewport: viewport || DEFAULTS.screenshotViewport,
    description: `Navigate to ${url} and take a ${fullPage ? "full-page" : "viewport"} screenshot`,
  };
}

export interface ImageExtractionInstruction {
  url: string;
  selector: string;
  limit: number;
  description: string;
}

export function buildImageExtractionInstruction(
  url: string,
  selector: string = "img",
  limit: number = DEFAULTS.maxImages,
): ImageExtractionInstruction {
  return {
    url,
    selector,
    limit,
    description: `Navigate to ${url}, query all '${selector}' elements, extract src and alt attributes (limit ${limit})`,
  };
}

export function buildScrapeInstruction(url: string): {
  url: string;
  description: string;
} {
  return {
    url,
    description: `Navigate to ${url}, extract page title and main text content as markdown`,
  };
}
```
