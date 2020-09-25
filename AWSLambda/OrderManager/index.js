var AWS = require('aws-sdk');
const https = require('https');
const dynamo = new AWS.DynamoDB.DocumentClient();



//----------------Funções auxiliares simples
//const giveUp = (info) => info.attempt>frases[info.status].length;
const zPad = (num, places) => String(num).padStart(places, '0');
const jsUcfirst = (nome) =>  nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();

//----------- Função para enviar mensagens para o lex
function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
} 

//-----------event 
function dispatch(info, intentRequest, callback) {
    //console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const sessionAttributes = intentRequest.sessionAttributes;
    const slots = intentRequest.currentIntent.slots;
    let productType = slots.ProductType;
    let orderID = slots.OrderID;
    let intentName = intentRequest.currentIntent.name;
    const userName = "Ben";
    if(intentName == 'Greetings'){
        if(slots.WhichOrder.toLowerCase()=='most recent'|| slots.WhichOrder.toLowerCase()=='last one' ){
            //show the last order
            callback(close(sessionAttributes, 'Fulfilled',
            {'contentType': 'PlainText', 'content': `Your last order was ... `}));
        }
        else if(slots.WhichOrder.toLowerCase()=='all'){
            //show the last order
            callback(close(sessionAttributes, 'Fulfilled',
            {'contentType': 'PlainText', 'content': `List all of the orders (limit of 15)`}));
        }
        else if(slots.WhichOrder.toLowerCase()=='i have the code'){
            //show the last order
            return {
                dialogAction:{
                type: "ElicitSlot",
                intentName: intentRequest.currentIntent.name,
                slotToElicit: "OrderNumber",
                slots
                }
            };
        }   
    }
        
    else if(intentName == 'ArrivalDate'){
        let dataEntrega = dataPrevista(info.info.shippingData.logisticsInfo[0].shippingEstimateDate)+"\n";
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Your order number ${userName} should arrive on ${dataEntrega} `}));
    }
    else if(intentName == 'CheckStatus'){
         
         let orderStatus = infoBasica('1061711715426-01', info);
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Your order status is ${orderStatus} `}));
    }
    else if(intentName == 'ConfirmAddress'){
        let endereco = info.info.shippingData.selectedAddresses[0];
        let rua =endereco.street;
        let numeroCasa= endereco.number;
        let bairro = endereco.neighborhood;
        let cidade = endereco.city;
        let estado = endereco.state;
        let pais = endereco.country;
        let zipCode = endereco.postalCode;
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Your order will arrive at ${rua} ${numeroCasa}, ${bairro} - ${cidade} / ${estado}- ${pais} - ${zipCode}`}));
    }
    else if(intentName == 'ListOrders'){
    
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `I found these orders: ${userName} `}));
    }
    
    else if(intentName == 'LocateOrder'){
    
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Your order number ${orderID} is at  ${userName} `}));
    }
    else if(intentName == 'PaymentActions'){
    
        callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Sorry, ${userName}, I'm not authorized to do it yet `}));
    }
    callback(close(sessionAttributes, 'Fulfilled',
    {'contentType': 'PlainText', 'content': `Okay , I have ordered your ${productType}`}));
    
}
//-----------------------------Main Handler
exports.handler = async (event, context, callback) => {
    try {
       
       var info = await obtemStatus((event.user && event.user!="") ? event.user : uuidv4());
       info.message = event.message ? event.message.toLowerCase() : "";
        let newStatus = await proxEstado(info);
        if (newStatus!==info.status) info.attempt=0;
        //if (!(newStatus in frases) || info.attempt>=frases[newStatus].length)  {
        //    newStatus = 'deuRuim';
         //   info.attempt=0;
        //}
        //gravaStatus(info);
        /*const response = { statusCode: 200,
                            user: info.ID, 
                            message: info.message,
                            lex: info.response };*/
        //console.log(response);
        //info.response = await falaLex(info.ID, info.message);
        dispatch(info, event,
            (response) => {
                callback(null, response);
            });
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
    let codigo = '1061711715426-01';
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
        //infoPedido(intent, info);
        if (giveUp(info)) return 'outroPedido';
    }
    
    else if (info.status === 'qualInfo') {
        let intent = entendeMensagem(info.message);
        if (intent==="atendimento") return 'requisicao';
        //infoPedido(intent, info);
        if (giveUp(info)) return 'maisInfo';
    }
    
    else if (info.status === 'requisicao') {
        let intent = entendeMensagem(info.message);
         if (intent==="sim") {
            info.response = "Não tenho autorização para fazer este tipo de operação.\n"+
                            process.env.ATENDIMENTO+"\n";
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
            info.response = "I found these orders in your account: \n\n"+info.response;
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
    //if (!order.statusDescription) return false;
    
    //adapta o status do pedido para o usuário
    let statusPedido = order.statusDescription.toLowerCase();
    if (statusPedido in statusDoPedido) statusPedido = statusDoPedido[statusPedido];
    
    //e cria a resposta de acordo como que foi encontrado
    info.response = "I found your order and it is "+statusPedido+".\n";
    if (order.clientProfileData && order.clientProfileData.firstName)
        info.response = "Hello, "+jsUcfirst(order.clientProfileData.firstName)+" "+jsUcfirst(order.clientProfileData.lastName)+"TESTE AQUI"+"!\n"+info.response;
    //if(order.shippingData.logisticsInfo && order.shippingData.logisticsInfo[0].shippingEstimateDate)
    //    info.response += dataPrevista(order.shippingData.logisticsInfo[0].shippingEstimateDate);
            
    //grava informacao obtida e reinicia as tentativas
    info.info = order;
    info.attempt = 0;
    return statusPedido;
}

//  /api/oms/pvt/orders?orderBy=items,asc

/** Apresenta as informações detalhadas do pedido, de acordo com a intenção do cliente **/
/*function infoPedido(intent, info) {
    info.response = "";
    if (intent==="valor") {
        info.response = "O valor total da compra foi R$"+info.info.totals[0].value+".\n";
    } else if (intent==="data de compra") {
        info.response = "O pedido "+info.info.orderId+" foi feito em "+formataDataHora(info.info.creationDate)+
                        " e aprovado no dia "+formataDataHora(info.info.authorizedDate)+".\n";
    } else if (intent==="ArrivalDate") {
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
}*/

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

async function gravaStatus(info) {
    info.TS = Date.now();
    info.TTL = parseInt(Date.now()/1000,10)+60*60*4;      //Fica armazenado por 4 horas
    await dynamo.put({
        "TableName": "chatbotOrders",
        "Item": info
    }).promise();
}

async function obtemStatus(id) {
    let reg = await dynamo.query({
        TableName: 'chatbotOrders',
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
            status: -1,
            attempt: 0
        };
    }
    return reg.Items[0];
}


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

function dataPrevista(dt){
    let ndt = new Date(dt);
   // let e_stava = (ndt > new Date(Date.now())) ? "é": "estava";
    let DD = zPad(ndt.getDate(),2), MM = zPad((ndt.getMonth()+1),2);
    return MM+"/"+DD+"/"+ndt.getFullYear()+".\n";
}

/** Função auxiliar de formatação de data e hora **/
function formataDataHora(dt){
    let ndt = new Date(dt);
    let DD = zPad(ndt.getDate(),2),  MM = zPad((ndt.getMonth()+1),2);
    let Hh = zPad(ndt.getHours(),2), Mm = zPad(ndt.getMinutes(),2);
    return DD+"/"+MM+"/"+ndt.getFullYear() + " às "+Hh+":"+Mm;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function validateOrderId(orderId) {
    const re = /^(\d{13}-\d{2})$/;
    return re.test(orderId);
}

