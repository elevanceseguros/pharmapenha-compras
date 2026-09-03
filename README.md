# Pharmapenha Compras

Aplicação Vite para comparar cotações, respeitar pedidos mínimos e gerar um pedido PDF por fornecedor. Publicação prevista na Vercel a partir deste repositório. Não contém cotações reais nem dados de clientes.

## Usar

1. Informe produtos, especificações, unidades e quantidades necessárias.
2. Lance ofertas manualmente, cole mensagens ou importe PDFs com camada de texto.
3. Confira a extração: embalagem, quantidade, preço sem e com impostos, fornecedor, equivalência . PDF digitalizado exige entrada manual; não há OCR ou integração de IA nesta versão.
4. Confira o mínimo e o frete de cada fornecedor. Os 21 mínimos iniciais foram cadastrados, incluindo Nutrifarm (R$ 650).
5. Calcule os pedidos, revise as redistribuições e aprove a geração dos arquivos.
6. Baixe um PDF por fornecedor ou um ZIP com todos. O sistema não envia pedidos automaticamente.

## Regras

- Valores monetários calculados em centavos. Preço da embalagem é convertido para preço por g, ml ou unidade.
- Não considera apresentações, concentrações ou unidades diferentes como equivalentes automaticamente. A confirmação é humana.
- Um fornecedor por item, embalagens inteiras. Arredondar a quantidade só é permitido quando habilitado no item. Não compra unidades extras só para completar o mínimo.
- Pedido mínimo incide em produtos sem impostos e sem frete por padrão. Pode ser alterado para produtos com impostos. Frete nunca entra no mínimo.
- Frete fixo por fornecedor entra uma vez no custo. Valor desconhecido é sinalizado e tratado como zero, sem presumir gratuidade.
- Ofertas indisponíveis ou não conferidas são excluídas. Datas de cotação são apenas informativas e não bloqueiam comparações ou pedidos.
- Busca combinatória limitada a 1,5 milhão de nós / aproximadamente 2,5 segundos em um Web Worker. Só declara menor custo quando a busca termina; se o limite for atingido, informa solução válida sem garantia de ótimo ou busca inconclusiva.
- Itens obrigatórios sem oferta e planos que não satisfazem mínimos bloqueiam PDFs. Não produz pedidos parciais silenciosamente.

## Armazenamento e privacidade

Esta versão funciona no navegador, sem banco compartilhado, login próprio ou armazenamento de PDFs no servidor. O uso em equipe exige configurar autenticação e persistência de servidor antes de tratar a aplicação como sistema centralizado.

Os dados ficam na sessão. É possível optar explicitamente por salvar neste aparelho ou baixar/abrir um arquivo JSON da rodada. Backups contêm dados comerciais e devem ser guardados com segurança. Os PDFs originais não integram o backup. Não envie backups, cotações ou credenciais a este repositório público.

## Desenvolvimento e Vercel

Node 22 ou superior. Execute `npm ci`, `npm test` e `npm run build`. Na Vercel: framework Vite, build `npm run build`, saída `dist`, diretório raiz do repositório. Não exige variáveis de ambiente nesta versão.

`npm run dev` abre o ambiente local. `node tests/render-pdf.js` gera um pedido fictício multipágina em `tmp/` para inspeção visual; não usa dados reais.
