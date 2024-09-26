import {exec} from 'child_process';
import Modbus from './modbusAPI/modbus.controller.js';

let slaves = {};

let slavesModbusData = {};

function getCurrentTime(time, n){
    const currentTime = new Date(time.getTime() + n * 60000);

    return currentTime;
}

function getRandomModbusData(range, base){
    return Math.floor(Math.random() * range)+base;
}

function getRandomModbusDataArray(size, range, base){
    let randomModbusDataArray = [];
    for ( let i = 0; i< size; i++){
        randomModbusDataArray.push(getRandomModbusData(range, base));
    }
    return randomModbusDataArray;
}

function getHistoryTimeArray(){
    const time = new Date();
    let historyTimeArray = []
    for ( let historyTime = -190; historyTime < 0; historyTime += 10){
        historyTimeArray.push(getCurrentTime(time, historyTime));
    }

    return historyTimeArray;
}

function updateSlavesCurrentData(host, currentData){
    return new Promise((resolve, reject) => {
        if (slaves[host].isConnect) {

            // modbus_request( transaction, startAddr, len, functionCode, data)
            let promise = slaves[host].modbus_request(++tran, 0, 2, 1, [])
                .then((recv) => {
                    currentData['power'] = (recv[9] >> 1) & 1;
                    currentData['maintenance'] = (recv[9] >> 0) & 1;
                    if ( currentData['power']){
                        currentData['rotationalSpeed'] = getRandomModbusData(1000, 2500);
                        currentData['electricProduction'] = getRandomModbusData(1000, 2000);
                        currentData['frequency'] = getRandomModbusData(2, 49);
                        currentData['fuelConsumption'] = getRandomModbusData(2, 1);
                        currentData['efficiency'] = currentData['electricProduction'] / 3000;
                        currentData['runningTime'] = currentData['runningTime'] + 5;
                    }
                    else{
                        currentData['rotationalSpeed'] = 0;
                        currentData['electricProduction'] = 0;
                        currentData['frequency'] = 0;
                        currentData['fuelConsumption'] = 0;
                        currentData['efficiency'] = 0;
                        currentData['runningTime'] = 0;
                    }
                    
                    resolve(currentData);
                })
                .catch(err => {
                    reject('Error in modbus_request:', err);
                });
        }
        else {
            resolve ({
                power: 0,
                maintenance: 0,
                rotationalSpeed: 0,
                electricProduction: 0,
                frequency: 0,
                fuelConsumption: 0,
                efficiency: 0,
                runningTime: 0
            });
        }
    })
}

function updateSlavesHistoryData(historyDataArray, currentData){
    historyDataArray.shift();
    historyDataArray.push(currentData);

    return historyDataArray;
}

function updateSlavesHistoryDatas(currentData, historyDataArray){

    updateSlavesHistoryData(historyDataArray['timestamp'], getCurrentTime(historyDataArray['timestamp'][historyDataArray['timestamp'].length -1], 10));
    updateSlavesHistoryData(historyDataArray['power'], currentData['power']);
    updateSlavesHistoryData(historyDataArray['maintenance'], currentData['maintenance']);
    if ( currentData['power'] && !currentData['maintenance']){
        updateSlavesHistoryData(historyDataArray['rotationalSpeed'], getRandomModbusData(1000, 2500));
        updateSlavesHistoryData(historyDataArray['electricProduction'], getRandomModbusData(1000, 2000));
        updateSlavesHistoryData(historyDataArray['frequency'], getRandomModbusData(2, 49));
        updateSlavesHistoryData(historyDataArray['fuelConsumption'], getRandomModbusData(2, 1));
    }
    else{
        updateSlavesHistoryData(historyDataArray['rotationalSpeed'], 0);
        updateSlavesHistoryData(historyDataArray['electricProduction'], 0);
        updateSlavesHistoryData(historyDataArray['frequency'], 0);
        updateSlavesHistoryData(historyDataArray['fuelConsumption'], 0);
    }
    
    return historyDataArray;
}

function slavesDataInit(){
    let init = {
        currentData: {
            power: 0,
            maintenance: 0,
            rotationalSpeed: 0,
            electricProduction: 0,
            frequency: 0,
            fuelConsumption: 0,
            efficiency: 0,
            runningTime: 0
        },
        historyData: {
            timestamp: getHistoryTimeArray(),
            power: getRandomModbusDataArray(20, 1, 1),
            maintenance: getRandomModbusDataArray(20, 0, 0),
            rotationalSpeed: getRandomModbusDataArray(20, 1000, 2500),
            electricProduction: getRandomModbusDataArray(20, 1000, 2000),
            frequency: getRandomModbusDataArray(20, 2, 49),
            fuelConsumption: getRandomModbusDataArray(20, 2, 1)
        }
        
    };
    return init;
}

setTimeout(() =>{
    fetch("http://127.0.0.1:5020/plc_config")
        .then(function (response) {
            return response.json();
        })
        .then(function (configData) {
            const slavesData = configData['PLCConfiguration']['DataAcquisition']['Channels']['Channel'];
            slavesData.forEach((slave) => {
                slaves[`${slave['IPAddress']}:${slave['Port']}`] = new Modbus(slave['IPAddress'], slave['Port']);
                slavesModbusData[`${slave['IPAddress']}:${slave['Port']}`] = slavesDataInit();
            });

            setInterval(() => {
                const currentTime = (new Date()).getTime();
                slavesData.forEach((slave) => {
                    const host = `${slave['IPAddress']}:${slave['Port']}`;
                    const currentData = slavesModbusData[host]['currentData'];
                    const historyData = slavesModbusData[host]['historyData'];
                    updateSlavesCurrentData(host, currentData)
                        .then(recv => {
                            slavesModbusData[host]['currentData'] = recv;
                        });
                    if ( currentTime - (historyData['timestamp'][historyData['timestamp'].length - 1]) >= 600000-100){
                        slavesModbusData[host]['historyData'] = updateSlavesHistoryDatas(currentData, historyData);
                    }
                });

            }, 5000)
        });
}, 1000);

let tran = 0;
const curr_passwd = 'ABCDEF123456';

export default {

    setModbus(req, res){
        const buffer = req.body;
        console.log(buffer);
        return new Promise((resolve, reject) => {
            let promise = slaves[buffer['host']].modbus_request(++tran, buffer['startAddr'], buffer['len'], buffer['functioncode'], buffer['data'])
                .then((recv) =>{
                    resolve(recv);
                });
        })
        .then(recv => {
            res.send();
        })
        .catch(err => {
            console.error('Unexpected error:', err);
            res.status(500).send('Unexpected error occurred');
        });
    },

    getModbus(req, res){
        let html = '';

        const host = req.query.host;
        let plc_access = req.cookies['plc_access'];
        const currentData = slavesModbusData[host]['currentData'];

        const power = (currentData['power']);
        const maintenance = (currentData['maintenance']);
        const electricProduction = (currentData['electricProduction']);
        const frequency = (currentData['frequency']);
        const fuelConsumption = (currentData['fuelConsumption']);
        const runningTime = (currentData['runningTime']);
        const rotationalSpeed = currentData['rotationalSpeed'];
        const efficiency = currentData['efficiency'];

        if (plc_access != undefined && plc_access.includes(host)) {
            console.log(power);
        
            html += `<div class="slave-box">`;
            html += `<div class="host">${host=="127.0.0.1:5000" ? "Electric machine 1" : "Electric machine 2"}</div>`
            html += `<div class="toggle-group">`;
            html += `<label class="switch">`;
            html += `<input id="power_input" type="checkbox" ${power ? 'checked' : ''} ${maintenance == 1 ? 'disabled' : ''} onclick="setModbus('${host}', ${0x01}, ${0x01}, ${0x05}, ${!(power & 1)}, this)">`;
            html += `<span class="slider"></span>`;
            html += `<br><br><p id="power_status_${host}">${maintenance ? 'Maintaining' : power ? 'on' : 'off'}</p>`
            html += `</label><br>`;
            html += `<label>`;
            html += `<p>electricProduction: <input type="text" disabled value="${electricProduction}"></p>`
            html += `<p>frequency: <input type="text" disabled value="${frequency}"></p>`
            html += `</label>`;
            html += `<label>`;
            html += `<p>fuelConsumption: <input type="text" disabled value="${fuelConsumption}"></p>`
            html += `<p>runningTime: <input type="text" disabled value="${runningTime}"></p>`
            html += `</label>`;
            html += `<label>`;
            html += `<p>rotationalSpeed: <input type="text" disabled value="${rotationalSpeed}"></p>`
            html += `<p>efficiency: <input type="text" disabled value="${efficiency}"></p>`
            html += `</label>`;
            html += `</div>`;
            html += `</div>`;

            res.send(html);
        }
        else{
            html += `<div class="slave-box">`
            html += `<div class="host">${host=="127.0.0.1:5000" ? "Electric machine 1" : "Electric machine 2"}</div>`
            html += `<div class="login" id='login'>`;
            html += `<button class="login-btn" onclick="signIn('${host}')">Login</button>`;
            html += `</div>`;
            html += `</div>`;

            res.send(html);
        }
    },

    getSlaves(req, res){
        let slavesData = [];
        Object.keys(slaves).forEach(slave =>{
            slavesData.push(slave);
        });

        res.send(slavesData);
    },

    getChartData(req, res){
        res.json(slavesModbusData);
    },

    signIn(req, res){
        const host = req.body['host'];
        const passwd = req.body['passwd'];

        // res.clearCookie('plc_access');

        let plc_access = req.cookies['plc_access'];
        if ( plc_access == undefined){
            plc_access = [];
        }


        return new Promise((resolve, reject) => {
            // Use modbus function code ?? get PLC password 
            // let promise = slaves[host].modbus_request(++tran, 0, 2, 1, [])
            //     .then((plc_passwd) => {
            //         resolve(plc_passwd);
            //     })
            //     .catch(err => {
            //         console.error('Error in modbus_request:', err);
            //         html += `<td>Error: ${err.message}</td> </tr>`;
            //     });

            resolve();
        })
        .then(recv => {
            if ( recv == passwd || curr_passwd == passwd){
                plc_access.push(host);
                res.cookie('plc_access', plc_access, { maxAge: 24 * 60 * 60 * 1000 });
                res.send();
            }
            else{
                res.send();
            }
            
        })
        .catch(err => {
            console.error('Unexpected error:', err);
            res.status(500).send('Unexpected error occurred');
        });
    },

    connectTest(req, res){
        let host = 'google.com';
        if ( req.body['host']){
            host = req.body['host'];
        }

        console.log(host);
        
        exec(`ping -c 10 ${host}`, (error, stdout, stderr) => {
            if ( error){
                console.error(error);
                return;
            }

            const time = parseInt(stdout.split('/')[4]);

            res.send(stdout);

            // res.send((time < 100) ? 'Exellent' : ((time < 500) ? 'Midium' : 'Bad'));
        });
    }
};

