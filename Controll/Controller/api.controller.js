import {exec} from 'child_process';
import Modbus from './modbusAPI/modbus.controller.js';

let slaves = {};
let slavesHistoryData = {};

function getCurrentTime(time, n){
    const currentTime = new Date(time.getTime() + n * 60000);

    return currentTime;
}

function getHistoryTimeArray(){
    const time = new Date();
    let historyTimeArray = []
    for ( let historyTime = -190; historyTime < 0; historyTime += 10){
        historyTimeArray.push(getCurrentTime(time, historyTime));
    }

    return historyTimeArray;
}

function getModbusData(host){

    return new Promise((resolve, reject) => {
        if (slaves[host].isConnect) {

            // modbus_request( transaction, startAddr, len, functionCode, data)
            let promise = slaves[host].modbus_request(++tran, 0, 2, 1, [])
                .then((recv) => {
                    resolve([(recv[9] >> 1), (recv[9] >> 0)]);
                })
                .catch(err => {
                    reject('Error in modbus_request:', err);
                });
        }
        else {
            resolve([-1, -1]);
        }
    })
}

function getModbusArrayData(){
    for ( const [host, slave] of Object.entries(slaves)){
        getModbusData(host)
            .then((recv) => {
                slavesHistoryData[host][0].shift();
                slavesHistoryData[host][0].push(getCurrentTime(slavesHistoryData[host][0][slavesHistoryData[host][0].length -1], 10));

                slavesHistoryData[host][1].shift();
                slavesHistoryData[host][1].push(recv);

                // console.log(host, slavesHistoryData[host][0], slavesHistoryData[host][1]);
            })
            .catch((err) => {
                console.error(err);
            })
    }
}

setTimeout(() =>{
    fetch("http://127.0.0.1:5020/plc_config")
        .then(function (response) {
            return response.json();
        })
        .then(function (configData) {
            const slavesData = configData['PLCConfiguration']['DataAcquisition']['Channels']['Channel'];
            slavesData.forEach((slave) => {
                const historyDataInit = [getHistoryTimeArray(),[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0], [0,0], [0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]]];
                slaves[`${slave['IPAddress']}:${slave['Port']}`] = new Modbus(slave['IPAddress'], slave['Port']);
                slavesHistoryData[`${slave['IPAddress']}:${slave['Port']}`] = historyDataInit;
            });

            getModbusArrayData();
            setInterval(() => {
                getModbusArrayData();
            }, 600000)
        });
}, 1000);

let tran = 0;
const curr_passwd = '123456';

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
        const maintenance = (slavesHistoryData[host][1][slavesHistoryData[host][1].length - 1][0]);
        const power = (slavesHistoryData[host][1][slavesHistoryData[host][1].length - 1][1]);

        // console.log(slaves[host].isConnect)
        if (slaves[host].isConnect && plc_access != undefined && plc_access.includes(host)) {
            html += `<td>${host}</td>`;
            html += `<td>Connect</td>`;
            html += `<td>${maintenance & 1}</td>`;
            html += `<td>${power & 1}</td>`;
            html += `<td><input type="button" value="maintenance on/off" onclick="setModbus('${host}', ${0x01}, ${0x01}, ${0x05}, ${!(maintenance & 1)})"></td>`;
            html += `<td><input type="button" value="power on/off" onclick="setModbus('${host}', ${0x00}, ${0x01}, ${0x05}, ${!(power & 1)})"></td>`;
        
            res.send(html);
        }
        else{
            // console.error('Unexpected error:', err);
            html += `<td>${host}</td>`;
            html += `<td>Unconnect <input type="button" value="Sign in" onclick="signIn('${host}')"></td>`;
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
        res.json(slavesHistoryData);
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

            res.send((time < 100) ? 'Exellent' : ((time < 500) ? 'Midium' : 'Bad'));
        });
    }
};

