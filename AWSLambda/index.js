var AWS = require('aws-sdk');
const https = require('https');
const dynamo = new AWS.DynamoDB.DocumentClient();
const frases = {
    'default': ["Me desculpe! Não sei mais o que dizer, ainda estou em construção!"],
    '-2': ["Espero ter ajudado!"],
    '-1': ["Me desculpe! Não consegui te ajudar desta vez! Ainda estou em construção! Tente novamente mais tarde!"],
    0: ["Olá! Eu sou a Sky. Por favor, digite o código do seu pedido.", 
        "Consulte o número do seu pedido no e-mail e digite aqui. É algo como 1061680455173-01.",
        "Não consegui localizar este pedido, tente mais uma vez!"],
    1: ["Deseja mais alguma informação?","Desculpe-me, não entendi a sua resposta. Deseja mais alguma informação?","Responda sim ou não, por favor."]}


exports.handler = async (event, context, callback) => {
    try {
        var info = await obtemStatus((event.user && event.user!="") ? event.user : uuidv4());
        info.message = event.message ? event.message.toLowerCase() : "";
        info.attempt+=1;
        info. response = "";
        let newStatus = await decifraResposta(info.status, info.message, info);
        if (newStatus!==info.status) info.attempt=0;
        if (!(newStatus in frases)) newStatus='-1';
        if (info.attempt>=frases[newStatus].length) {
            newStatus = -1;
            info.attempt = 0;
        }
        info.status = newStatus;
        info.response += frases[newStatus][info.attempt];
        gravaStatus(info);
        const response = { statusCode: 200,
                            user: info.ID, status: info.status, 
                            lex: info.response };
        callback(null, response);
    } catch (e) {
        console.log(e);
        callback(e);
    }
};

async function decifraResposta(sts, msg, info) {
    if (sts < 0 ) {
        return 0;
    }
    else if (sts === -2) {
        return 0;
    }
    else if (sts === 0) {
        info.info = await apiVTEX('/api/oms/pvt/orders/'+msg, "");
        if (info.info && info.info.statusDescription) { 
            info.response = "Localizei o seu pedido. Ele está "+info.info.statusDescription.toLowerCase()+".<br>";
            if (info.info && info.info.clientProfileData && info.info.clientProfileData.firstName)
                info.response = "Olá, "+jsUcfirst(info.info.clientProfileData.firstName)+" "+jsUcfirst(info.info.clientProfileData.lastName)+". "+info.response;
            return 1;
        }
    }
    else if (sts === 1) {
        if (msg==="não") return -2;
        if (msg==="sim") return 2;
    }
    return sts;
}

async function gravaStatus(info) {
    info.TS = Date.now();
    info.TTL = parseInt(Date.now()/1000,10)+60*60*4;      //Fica armazenado por 4 horas
    await dynamo.put({
        "TableName": "chatbot_001",
        "Item": info
    }).promise();
}

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
            status: -1,
            attempt: 0
        }
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

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


function jsUcfirst(string) 
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}