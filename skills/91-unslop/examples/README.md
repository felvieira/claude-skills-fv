# Exemplo local de diagnóstico

Os arquivos `antes.html` e `depois.html` são fixtures sintéticas autocontidas para comparar hierarquia, leitura de dados e apresentação de ações. São materiais de ensino, não capturas de um produto real nem uma identidade visual recomendada para todos os produtos.

Abra ambos no mesmo navegador, tema e viewport. Veja se a ação principal, o período do dado e a lista de tarefas são identificáveis; depois navegue por teclado. Experimente também uma largura estreita. Os botões de demonstração não enviam dados ou executam operações: esse exemplo não valida fluxos de negócio.

As imagens PNG correspondentes são capturas reais desses próprios HTMLs na mesma largura e no mesmo estado. Use-as para exercitar leitura visual, e consulte os arquivos para verificar a estrutura e os limites.

O par ilustra um caso específico: a mudança de paleta não é requisito de qualidade e não justifica substituir uma marca existente. O exemplo evidencia dados sem contexto; em um produto real, não atribua significado ou estado sem fonte.

Para capturar dois HTMLs locais com Playwright e Chromium já disponíveis no projeto, escolha uma pasta sem `antes.png` ou `depois.png`:

```bash
node skills/91-unslop/scripts/capture-local.mjs caminho/antes.html caminho/depois.html pasta-de-evidencias 1100 850
```

O script não sobrescreve as imagens e bloqueia requisições de rede. Documentos HTML continuam sendo conteúdo ativo: use apenas arquivos confiáveis, sem dados sensíveis. Como recursos remotos são bloqueados, a captura pode divergir de um site real; para aplicações dinâmicas ou URLs, use o navegador do ambiente e registre o que foi observado.
