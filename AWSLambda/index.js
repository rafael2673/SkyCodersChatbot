var AWS = require('aws-sdk');
const https = require('https');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
    try {
        if (event.user) {
            const evUsr = event.user.toLowerCase().replace("@",":");
            const evMsg = event.message;
            const response = { statusCode: 200 };
            if (!event.message) {
                response.history = await obtemConversa(evUsr, "0");
                callback(null, response);
            } else {
                response.lex = await falaLex(evUsr, evMsg);
                if (event.busca) {
                    response.busca = await apiVTEX('/buscaautocomplete?productNameContains=' + event.busca, "");
                }
                gravaConversa(evUsr, evMsg, "user");
                gravaConversa(evUsr, response.lex, "LEX");
                callback(null, response);
            }
        } else {
            callback(new Error("Cannot process message without a body or user ID." + event.user));
        }
    } catch (e) {
        console.log(e);
        callback(e);
    }
};

<<<<<<< HEAD
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
||||||| fb992dc... bla
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
=======
async function gravaConversa(user, message, sender) {
>>>>>>> parent of fb992dc... bla
    await dynamo.put({
        "TableName": "conversas",
        "Item": {
            "ID": user,
            "TS": Date.now().toString(),
            "Message": message,
            "Sender": sender
        }
    }).promise();
}

async function obtemConversa(user, TS) {
    return await dynamo.scan({
        TableName: 'conversas',
        FilterExpression: 'ID = :a AND TS > :ts',
        ExpressionAttributeValues: {
            ':a': user,
            ':ts': TS
        }
    }).promise();
}

function apiVTEX(url, data) {
		const options = {
    	headers: {
        "accept": "application/json; charset=utf-8",
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
<<<<<<< HEAD
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
||||||| fb992dc... bla
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
=======
>>>>>>> parent of fb992dc... bla
}