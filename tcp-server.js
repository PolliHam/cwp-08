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
            case "getWorkers":
                console.log(dataJSON.action);
                let res = getWorkers();
                console.log(res);
                client.write(JSON.stringify(res));
                break;
            case "add": addWorkers(dataJSON, dataJSON.x, client);
                break;
            case "remove":
                let message = removeWorker(dataJSON.pid, client);
                client.write(JSON.stringify(message));
                break;
            default:


        }
    });
    client.on('end', () => console.log(`Client ${client.id} disconnected`));
});


server.listen(port, () => {
    console.log(`Server listening on localhost:${port}`);
});



function addWorkers(data, x , client) {
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
    if(isNaN(Number(interval)) || interval <= 0) {
        client.write(JSON.stringify({ "action": "exit" }));
        client.destroy();
        return false;
    }

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


function getWorkers() {
    let res = [];
    res.push({"action": "getWorkers"});
    let work = [];
    for (let i = 0; i < workers.length; i++) {
        getNumbers(workers[i], (data) => {
                work.push({
                    "id": workers[i].id,
                    "pid": workers[i].pid,
                    "startedOn": workers[i].startedOn,
                    "numbers": data
                });
        });
    }
    res.push({"workers": work})
    return res;
}

function getNumbers(worker, cb) {
    fs.readFile(worker.filename, (error, data) => {
        if (!error) {
            cb(data);
        }
        cb("readFile error");
    });
}

function removeWorker(pid, client) {
    let message;
    let index =-1;
    if(parseInt(pid) ||( index = workers.findIndex(worker => worker.pid === pid))=== -1) {
        client.write(JSON.stringify({ "action": "exit" }));
        client.destroy();
        return false;
    }
    getNumbers(workers[index], (data) => {
        message = {
            "action": "remove",
            "id": workers[index].pid,
            "date": workers[index].startedOn,
            "numbers": data
        };
        process.kill(workers[index].pid);
        fs.unlink(workers[index].filename, () => {
        });
        workers.splice(index, 1);
        return message;
    });
}