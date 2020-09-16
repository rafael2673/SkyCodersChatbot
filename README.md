# SkyCoders Chatbot

Chatbot do grupo SkyCoders - entrega final do programa Hiring Coders da Gama Academy de setembro de 2020.

O objetivo era criar um Chatbot para Acompanhamento de pedidos de uma loja genérica.
É uma solução Serverless, utilizando o Free-Tier da AWS (API Gateway, DynamoDB, Lambda) e integrado a uma loja VTEX de exemplo.
O bot em funcionamento pode ser testado em https://hiringcoders8.myvtex.com/.

#### Alguns códigos de pedidos cadastrados para testes na loja:
`1061711715426-01 1061711681625-01`  
`1061712315074-01 1061680455173-01`  
`1061370527979-01 1061343599333-01`  
`1061343490199-01 1061200352268-01`

## Backend (/AWSLambda)

### Pré-requisitos

Para utilizar o referido código, é preciso:
- Ter uma conta na AWS;
- Criar uma tabela no DynamoDB chamada 'chatbot_001', com 'ID' (string) como Primary Key e 'TS' (number) como Sort Key;
- Ter uma conta em alguma loja da VTEX com chave e token válidos para acessar a VTEX API.

### Instalação

Para hospedar o código na AWS:
- Crie uma função Lambda e cole o conteúdo de index.js.
- Associe uma nova policy ao role criado automaticamente para permitir 'Query' e 'PutItem' à tabela chatbot_001;
- Adicione as seguintes variáveis de ambiente:  
   `VTEX_KEY`	(Key para VTEX API)  
   `VTEX_TOKEN` (Token para VTEX API)  
   `VTEX_URL`	(URL da loja. Ex: https://hiringcoders8.vtexcommercestable.com.br)  
   `INFO`	(Mensagem padrão com informações de contato da loja)  
   `ATENDIMENTO` (Mensagem padrão para redirecionar para atendimento)  
- Crie um API gateway e associe à função lambda criada. A API deverá ter um método POST e passar as seguintes informações (não obrigatórias):  
   `user` (id criado para a conversa)  
   `message` (mensagem do usuário para o bot)  

### Uso e funcionamento

A função lambda recebe o ID da conversa (`user`) e a mensagem do usuário (`message`) e responde com o mesmo ID (`user`), a resposta do bot (`lex`) e o status da conversa. Caso não receba o campo `user` ou este esteja vazio, uma nova conversa é criada junto com um uuid gerado.

A cada mensagem que o bot recebe, ele avalia o status atual (obtido da tabela chatbot_001) junto com a intenção do usuário. Ele então envia as mensagens requeridas e decide se vai para um novo status de acordo com um fluxo pré-definido ou se tentará novamente o mesmo (de acordo com o número de tentativas determinado para cada estado). Esse status é novamente armazenado na tabela chatbot_001, junto com o número de tentativas, o TS atual (em ms), um TTL de 4h, as mensagens trocadas e as informações obtidas até o momento.


## Frontend (/StoreFrontend)

Código utilizado para integrar o robô à loja de exemplo (https://hiringcoders8.myvtex.com/).  
Para mais detalhes sobre instalação e utilização, consulte o readme do modelo original em /StoreFrontend/docs.


## Referências
[AWS](https://aws.amazon.com/)  
[VTEX API](https://developers.vtex.com/reference/orders)  
[Gama Academy](https://gama.academy/)
