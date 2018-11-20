const fs = require("fs");
let lock = 15;

function writeToFile(path, x){
    setInterval(function() {
        if(lock!==0){
            fs.appendFile(path, Math.floor(Math.random()*15+12)+",  ", ()=>{});
            lock--;
        }
    }, x);
}

writeToFile(process.argv[2], process.argv[3]);