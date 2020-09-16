var AWS = require('aws-sdk');
const https = require('https');
const dynamo = new AWS.DynamoDB.DocumentClient();
const frases = {
    'default': ["Me desculpe! Não sei mais o que dizer, ainda estou em construção!"],
    'deuBom':  ["Foi um prazer poder te ajudar! Tenha um excelente dia! \nEm caso de dúvidas, acesse https://help.vtex.com/ ou ligue para 0800 4242 e fale com um de nossos atendentes."],
    'deuRuim': ["Acho que infelizmente não consegui te ajudar desta vez. \nSe tiver mais dúvidas, acesse https://help.vtex.com/ ou ligue para 0800 4242 e fale com um de nossos atendentes."],
    'inicio':  ["Olá! Eu sou a Sky. Estou aqui para te ajudar a acompanhar seu pedido. \n Por favor, digite o código de identificação.", 
                 "Eu preciso do código do pedido. Ex: 1061711715426-01.",
                 "Não consegui localizar este pedido, tente digitar o código mais uma vez!"],
    'maisInfo': ["Deseja mais alguma informação sobre este pedido?",
                 "Desculpe-me, não entendi a sua resposta. Deseja mais alguma informação?",
                 "Responda sim ou não, por favor."],
    'qualInfo': ["O que mais você deseja saber sobre o seu pedido? (data de compra, prazo de entrega, itens comprados, valor pago, endereço de entrega etc)",
                 "Desculpe-me, não entendi. Qual informação você quer?"],
    'outroPedido': ["Deseja informação sobre algum outro pedido?",
                 "Desculpe-me, não entendi a sua resposta. Deseja informação sobre algum outro pedido?",
                 "Responda sim ou não, por favor."],
    'qualPedido': ["Qual pedido?"],
    'ajudei':     ["Eu consegui te ajudar?"],
    'listaPedidos': ["Você quer informação sobre qual desses pedidos?","Não entendi! Sobre qual pedido você quer informação?"],
    'essePedido':   ["Quer informação sobre este pedido?","Não entendi."],
    'requisicao':   ["Deseja fazer alterações no pedido, cancelar ou registrar alguma ocorrência?", "Responda 'sim' ou 'não', por favor."]
};
const statusDoPedido = {
    'pronto para o manuseio': ["liberado e sendo preparado para a entrega"],
    'aguardando confirmação do seller': ["pendente (aguardando confirmação do seller)"],
    'processando': ["pendente (processando)"],
    'pagamento pendente': ["em aprovação (pagamento pendente)"],
    'aguardando autorização do pedido': ["em aprovação (aguardando autorização do pedido)"],
    'pagamento aprovado': ["com pagamento aprovado."],
    'pagamento negado': ["pendente (pagamento negado)"],
    'solicitar cancelamento': ["pendente (solicitação de cancelamento)"],
    'aguardando decisão do seller': ["pendente (aguardando decisão do seller)"],
    'aguardando autorização para despachar': ["pendente (aguardando autorização para despachar)"],
    'erro na criação do pedido': ["pendente (erro na criação do pedido)"],
    'carência para cancelamento': ["pendente"],
    'iniciar manuseio': ["liberado e sendo preparado para a entrega."],
    'preparando entrega': ["liberado e sendo preparado para a entrega"],
    'cancelamento solicitado': ["pendente (cancelamento solicitado)"],
    'fatura pós-cancelamento negada': ["pendente (em cancelamento)"],
    'verificando envio': ["liberado para a entrega"],
    'faturado': ["aprovado e faturado"],
    'cancelar': ["pendente (em cancelamento)"],
    'cancelado': ["cancelado"]
};

//funções auxiliares simples
const giveUp = (info) => info.attempt>frases[info.status].length;
const zPad = (num, places) => String(num).padStart(places, '0');
const jsUcfirst = (nome) =>  nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();

/** Lida com a requisição do API gateway **/
exports.handler = async (event, context, callback) => {
    try {
        var info = await obtemStatus((event.user && event.user!="") ? event.user : uuidv4());
        info.message = event.message ? event.message.toLowerCase() : "";
        info.attempt+=1;
        info.response = "";
        let newStatus = await proxEstado(info);
        if (newStatus!==info.status) info.attempt=0;
        if (!(newStatus in frases) || info.attempt>=frases[newStatus].length)  {
            newStatus = 'deuRuim';
            info.attempt=0;
        }
        info.status = newStatus;
        info.response += frases[newStatus][info.attempt];
        gravaStatus(info);
        const response = { statusCode: 200,
                            user: info.ID,
                            status: info.status, 
                            lex: info.response };
        callback(null, response);
    } catch (e) {
        console.log(e);
        callback(e);
    }
};

/** Define qual é o próximo estado da conversa **/
async function proxEstado(info) {
    
    //Se o ultimo chat estiver finalizado, reinicia o processo
    if (info.status === 'deuBom' || info.status === 'deuRuim' || info.status === '') {
        return 'inicio';
    }
    
    //Independente o estado, ele procura um código de pedido válido. Se existir esse código, vai direto para maisInfo
    let codigo = info.message.match(/[a-z0-9]{11,15}-[0-9]{2}/g);
    let order = await apiVTEX('/api/oms/pvt/orders/'+codigo, "");
    if (infoBasica(order,info))  return 'maisInfo';
    
    //Avalia a intenção do usuário de acordo com o estado atual e redireciona para o próximo estado 
    if (info.status === 'inicio') {
        if (giveUp(info)) return 'deuRuim';
    }
    
    else if (info.status === 'maisInfo') {
        let intent = entendeMensagem(info.message);
        if (intent==="não") return 'outroPedido';
        if (intent==="sim") return 'qualInfo';
        if (intent==="atendimento") return 'requisicao';
        infoPedido(intent, info);
        if (giveUp(info)) return 'outroPedido';
    }
    
    else if (info.status === 'qualInfo') {
        let intent = entendeMensagem(info.message);
        if (intent==="atendimento") return 'requisicao';
        infoPedido(intent, info);
        if (giveUp(info)) return 'maisInfo';
    }
    
    else if (info.status === 'requisicao') {
        let intent = entendeMensagem(info.message);
         if (intent==="sim") {
            info.response = "Não tenho autorização para fazer este tipo de operação.\n"+
                            "Favor contatar a nossa loja pelo telefone 0800-4242.\n";
            return 'maisInfo';
        }
        if (intent==="não" || giveUp(info)) return 'maisInfo';
    }
   
    else if (info.status === 'outroPedido') {
        let intent = entendeMensagem(info.message);
        if (intent==="sim") return 'qualPedido';
        if (intent==="não" || giveUp(info)) return 'ajudei';
    }
    
    else if (info.status === 'ajudei') {
        let intent = entendeMensagem(info.message);
        if (intent==="sim") return 'deuBom';
        if (intent==="não" || giveUp(info)) return 'deuRuim';
    }
    
    else if (info.status === 'qualPedido') {
        //procura todos os pedidos com o nome do cliente e mostra uma lista com até 15 deles
        let allOrders = await apiVTEX('/api/oms/pvt/orders?orderBy=creationDate,desc', "");
        info.pedidos = [];
        for (let ord of allOrders.list) {
            if (ord.clientName!==info.info.clientProfileData.firstName+" "+info.info.clientProfileData.lastName) continue;
            info.response += ord.orderId+"\n("+formataDataHora(ord.creationDate)+")\n\n";
            info.pedidos.push(ord.orderId);
            if (info.pedidos.length===15) break;
        }
        
        //Adapta a mensagem de acordo com o número de pedidos encontrados
        if (info.pedidos.length===1) {
            info.response = "Encontrei este pedido: \n\n"+info.response;
            return 'essePedido';
        } else if (info.pedidos.length>1) {
            info.response = "Localizei os seguintes pedidos em seu nome: \n\n"+info.response;
            return 'listaPedidos';
        }
        if (giveUp(info)) return 'listaPedidos';
    }
  
    else if (info.status === 'listaPedidos') {
        //TODO: verificar a intenção do usuário (talvez ele esteja se referindo a algum pedido da lista)
        if (giveUp(info)) return 'ajudei';
    }
  
    else if (info.status === 'essePedido') {
        let intent = entendeMensagem(info.message);
        if (intent==="sim") {
            let order = await apiVTEX('/api/oms/pvt/orders/'+info.pedidos[0], "");
            if (infoBasica(order,info))  return 'maisInfo';
        }
        if (intent==="não") return 'qualPedido';
        if (giveUp(info)) return 'ajudei';
    }
    
    return info.status;
}

/** Apresenta as informações básicas do pedido, caso ele exista **/
function infoBasica(order,info) {
    //verifica se o código é válido
    if (!order.statusDescription) return false;
    
    //adapta o status do pedido para o usuário
    let statusPedido = order.statusDescription.toLowerCase();
    if (statusPedido in statusDoPedido) statusPedido = statusDoPedido[statusPedido];
    
    //e cria a resposta de acordo como que foi encontrado
    info.response = "Localizei o seu pedido. Ele está "+statusPedido+".\n";
    if (order.clientProfileData && order.clientProfileData.firstName)
        info.response = "Perfeito, "+jsUcfirst(order.clientProfileData.firstName)+" "+jsUcfirst(order.clientProfileData.lastName)+"!\n"+info.response;
    if(order.shippingData.logisticsInfo && order.shippingData.logisticsInfo[0].shippingEstimateDate)
        info.response += dataPrevista(order.shippingData.logisticsInfo[0].shippingEstimateDate);
            
    //grava informacao obtida e reinicia as tentativas
    info.info = order;
    info.attempt = 0;
    return true;
}

/** Apresenta as informações detalhadas do pedido, de acordo com a intenção do cliente **/
function infoPedido(intent, info) {
    info.response = "";
    if (intent==="valor") {
        info.response = "O valor total da compra foi R$"+info.info.totals[0].value+".\n";
    } else if (intent==="data de compra") {
        info.response = "O pedido "+info.info.orderId+" foi feito em "+formataDataHora(info.info.creationDate)+
                        " e aprovado no dia "+formataDataHora(info.info.authorizedDate)+".\n";
    } else if (intent==="prazo") {
        info.response = dataPrevista(info.info.shippingData.logisticsInfo[0].shippingEstimateDate)+"\n";
    } else if (intent==="itens") {
        let itens = [];
        for (let it of info.info.items) itens.push(it.quantity+" x "+it.name);
        info.response = "O pedido "+info.info.orderId+" contém os seguintes itens: \n"+itens.join("\n")+".\n";
    } else if (intent==="endereço") {
        let endereco = info.info.shippingData.selectedAddresses[0];
        info.response = "O endereço de entrega registrado é:\n"+endereco.street+", "+endereco.number+","+endereco.neighborhood+"\n"+
                        endereco.city+" - "+endereco.state+" ("+endereco.country+")\n"+
                        endereco.postalCode+"\n";
    }
    if (info.response !== "") {
        info.attempt=0;
        info.status = 'maisInfo';
    }
}

/** Tenta entender a mensagem do cliente e transformar em uma intenção **/
function entendeMensagem(msg) {
    msg = msg.trim();
    let palavras = msg.split(" ");
    if (palavras.includes("sim") || ["s","yep","yes","aham","bora","claro","isso","com certeza","agora","desejo","quero","quero sim","ja","oui","agora quero"].includes(msg)) return "sim";
    if (palavras.includes("não") || palavras.includes("nao") || 
        ["não","nao","ñ","nopz","no","nops","nope","nn","n","nah","neh","n~","nein","non"].includes(msg)) 
            return "não";
    if (palavras.includes("data") && palavras.includes("compra")) return "data de compra";
    if (palavras.includes("endereço")) return "endereço";
    if (palavras.includes("prazo") || palavras.includes("entrega") || 
        (palavras.includes("quando") && (palavras.includes("chega") || palavras.includes("chegar")))) 
            return "prazo";
    if (palavras.includes("itens") || (palavras.includes("que") && palavras.includes("comprei"))) return "itens";
    if (palavras.includes("valor")) return "valor";
    if (palavras.includes("ruim")||palavras.includes("cancelar")||palavras.includes("insatisfeito")) return "atendimento";
    return msg;
}

/** Grava estado atual da conversa no DynamoDB **/
async function gravaStatus(info) {
    info.TS = Date.now();
    info.TTL = parseInt(Date.now()/1000,10)+60*60*4;      //Fica armazenado por 4 horas
    await dynamo.put({
        "TableName": "chatbot_001",
        "Item": info
    }).promise();
}

/** Consulta DynamoDB e obtém último estado da conversa **/
async function obtemStatus(id) {
    let reg = await dynamo.query({
        TableName: 'chatbot_001',
        KeyConditionExpression: "ID = :id",
        ExpressionAttributeValues: {
            ':id': id
        },
        ScanIndexForward: false,
        Limit: 1
    }).promise();
    if (!reg.Items || reg.Items.length==0) {
        return {
            ID: id,
            message: "",
            response: "",
            status: '',
            attempt: 0
        };
    }
    return reg.Items[0];
}

/** Faz requisições na API da VTEX, para obter informações sobre os pedidos **/
function apiVTEX(url, data) {
		const options = {
    	    headers: {
            "accept": "application/json; charset=utf-8",
            "content-type": "application/json;",
            "x-vtex-api-appkey": process.env.VTEX_KEY,
            "x-vtex-api-apptoken": process.env.VTEX_TOKEN
    	    }
		};

    return new Promise((resolve, reject) => {
        const req = https.request(process.env.VTEX_URL + url, options, (res) => {
            res.setEncoding('utf8');
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(responseBody));
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

/** Não utilizada. Servia para se comunicar com Amazon Lex. Continua aqui para possíveis melhorias futuras. **/
async function falaLex(usuario, mensagem) {
    return new Promise((resolve, reject) => {
        AWS.config.region = 'us-east-1';
        var lexruntime = new AWS.LexRuntime();
        var params = {
            botAlias: process.env.BOT_ALIAS,
            botName: process.env.BOT_NAME,
            inputText: mensagem,
            userId: usuario,
            sessionAttributes: {}
        };
        lexruntime.postText(params, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data.message);
            }
        });
    });
}

/** Função auxiliar de formatação da data de entrega prevista **/
function dataPrevista(dt){
    let ndt = new Date(dt);
    let e_stava = (ndt > new Date(Date.now())) ? "é": "estava";
    let DD = zPad(ndt.getDate(),2), MM = zPad((ndt.getMonth()+1),2);
    return "A entrega "+e_stava+" prevista para o dia "+DD+"/"+MM+"/"+ndt.getFullYear()+".\n";
}

/** Função auxiliar de formatação de data e hora **/
function formataDataHora(dt){
    let ndt = new Date(dt);
    let DD = zPad(ndt.getDate(),2),  MM = zPad((ndt.getMonth()+1),2);
    let Hh = zPad(ndt.getHours(),2), Mm = zPad(ndt.getMinutes(),2);
    return DD+"/"+MM+"/"+ndt.getFullYear() + " às "+Hh+":"+Mm;
}

/** Função para gerar IDs (praticamente) únicos **/
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}