const http = require('http');
const net = require('net');

const hostname = '127.0.0.1';
const port = 3000;
const tcp_port = 4000;

const connection = new net.Socket();

connection.connect(tcp_port, hostname, () => {
    console.log('Connected to the TCP server');
});


const handlers = {
    '/workers': workers,
    '/workers/add': workersAdd,
    '/workers/remove': workersRemove
}


const server = http.createServer((req, res) => {
    parseBodyJson(req, (err, payload) => {
        if(err){
            res.writeHead(err.code, {'Content-Type' : 'application/json'});
            res.end( JSON.stringify(err) );
        }
        else{
            const handler = getHandler(req.url);
            handler(req, res, payload, (err, result) => {
                console.log(result);
                if (err) {
                    res.writeHead(err.code, {'Content-Type' : 'application/json'});
                    res.end( JSON.stringify(err) );
                }
                else{
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(result, null, "\t"));            }

            });
        }

    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function getHandler(url) {
    return handlers[url] || notFound;
}

function notFound(req, res, payload, cb) {
    cb({"code": 404, "message": 'Not found'});
}

function parseBodyJson(req, cb) {

    let body = [];
    req.on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
        body = Buffer.concat(body).toString();
        if (body !== "") {
            try {
                let params = JSON.parse(body);
                cb(null, params);
            }
            catch (e) {
                cb({"code": 404, "message": 'Incorrect json'}, null);
            }
        }
        else {
            cb(null, null);
        }
    });
}


function workers (req, res, payload, cb) {
    //console.log(payload);
    connection.write(JSON.stringify({
        "action": "getWorkers"
    }));
    connection.on("data", (data, err) => {
        if (!err) {
            data = JSON.parse(data);
            //console.log(data);
            if (data.action === 'getWorkers') {
                cb(null, data.workers)
            }
        }
        else console.log(err);
    })
}

function workersAdd(req, res, payload, cb)
{
    console.log(payload);
    if (payload.x !== undefined) {
        connection.write(JSON.stringify({
            "action": "add",
            "x": payload.x
        }));
        connection.on('data', (data, err) => {
            if (!err) {
                data = JSON.parse(data);
                console.log(data);
                if (data.action === "add") {
                    cb(null, {
                        "id": data.id,
                        "pid": data.pid,
                        "startedOn": data.date,
                    });
                }
                else cb({code: 406, message: 'Incorrect arg'});
            }
            else console.log(err);
        })
    }
    else cb({code: 405, message: 'Incorrect param'});
}

function workersRemove(req, res, payload, cb){
    console.log(payload);
    console.log(payload.id);

    if(payload.id !== undefined){
        connection.write(JSON.stringify({
            "action": "remove",
            "id": payload.id
        }));
        connection.on('data', (data, error) => {
            if (!error) {
                data = JSON.parse(data);
                console.log(data);
                if (data.action === "remove") {
                    cb(null, {
                        "id": data.id,
                        "startedOn": data.date,
                        "numbers": data.numbers,
                    });
                }
                else cb({ "code": 407, "message": 'Worker not found or Incorrect arg' });
            }
            else console.error(error);
        });
    }
    else cb({ "code": 405, "message": 'Worker not found' });
}