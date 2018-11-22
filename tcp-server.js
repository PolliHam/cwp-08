const net = require('net');
const fs = require('fs');
const child_process = require('child_process');

const port = 4000;
let workers = [];


const server = net.createServer((client) => {
    console.log('Http-server connected');

    client.on('data', (data) => {
        let  dataJSON = JSON.parse(data);
        console.log(dataJSON);
        switch (dataJSON.action) {
            case "getWorkers": get(client);
                break;
            case "add": addWorkers(dataJSON.x, client);
                break;
            case "remove": remove(dataJSON.id, client);
                break;
            default:


        }
    });
    client.on('end', () => console.log(`Client ${client.id} disconnected`));
});


server.listen(port, () => {
    console.log(`Server listening on localhost:${port}`);
});



function addWorkers(x , client) {
    if(runWorker(x, client)){
        client.write(JSON.stringify({
            "action": "add",
            "id": workers[workers.length - 1].id,
            "pid": workers[workers.length - 1].pid,
            "date": workers[workers.length - 1].startedOn
        }));
    }
}

function runWorker(interval, client) {

    if( isNaN(++interval) || interval <= 0) {
        client.write(JSON.stringify({ "action": "exit" }));
        return false;
    }
    --interval;
    let worker = {};
    const date = new Date();
    worker.id = Date.now();
    let pathToClient ="Workers/" + worker.id + ".json";

    let myChildProcess = child_process.spawn("node", [ "worker.js", pathToClient, interval]);
    console.log(`Spawned child pid: ${myChildProcess.pid}`);
    console.log('--------------- Connected client: ' + (worker.id) + ' ---------------');

    worker.startedOn=  date.toString();
    worker.filename = pathToClient;
    worker.pid = myChildProcess.pid;
    workers.push(worker);

    return true;
}



const get = async (client) => {
    let res = await getWorkers();
    client.write(JSON.stringify(res));
}

async function getWorkers() {
    return new Promise(async (resolve) => {
        let work = [];
        for (let i = 0; i < workers.length; i++) {
            let numbers = await getNumbers(workers[i]);
            work.push({
                "id" : workers[i].id,
                "pid": workers[i].pid,
                "startedOn" : workers[i].startedOn,
                "numbers" : numbers,
            });
        }
        console.log(work);
        resolve({"action": "getWorkers", "workers": work});
    })
}

function getNumbers(worker) {
    return new Promise((resolve, reject) => {
        fs.readFile(worker.filename, (error, data) => {
            if (!error) {
                resolve(JSON.parse(data));
            }
            else {
                reject("Not found content");
            }
        })
    })
}


const remove = async (id, client) => {
    let res = await removeWorker(id);
    client.write(JSON.stringify(res));
}

async function removeWorker(id) {
    return new Promise(async (resolve) => {
        let message;
        let i = -1;
        if (isNaN(++id) || (i = workers.findIndex(worker => worker.id === id)) === -1) {
            console.log(i);
            message = {"action": "exit"};
            return message;
        }
        process.kill(workers[i].pid);
        let numbers = await getNumbers(workers[i]);
        message = {
            "action": "remove",
            "id": workers[i].id,
            "date": workers[i].startedOn,
            "numbers": numbers
        };
        fs.unlink(workers[i].filename, () => {
        });
        workers.splice(i, 1);
        resolve(message);
    })
}