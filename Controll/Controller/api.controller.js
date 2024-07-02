import {exec} from 'child_process';
import Modbus from './modbusAPI/modbus.controller.js';

// const Modbus = require('./modbusAPI/modbus.controller.js');

const slaves = {
    '127.0.0.1:5000': new Modbus('127.0.0.1', '5000')
}

let tran = 0;

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

    async getModbus(req, res){
        let html = '';

        return new Promise((resolve, reject) => {
            let promises = [];
        
            Object.keys(slaves).forEach(slave => {
                
                if (slaves[slave].isConnect) {

                    // modbus_request( transaction, startAddr, len, functionCode, data)
                    let promise = slaves[slave].modbus_request(++tran, 0, 2, 1, [])
                        .then((recv) => {
                            html += '<tr>';
                            html += `<td>${slave}</td>`;
                            html += `<td>${slaves[slave].isConnect}</td>`;
                            html += `<td>${(recv[9] >> 1) & 1}</td>`;
                            html += `<td>${(recv[9] >> 0) & 1}</td>`;
                            html += `<td><input type="button" value="maintenance on/off" onclick="setModbus('${slave}', ${0x01}, ${0x01}, ${0x05}, ${!((recv[9] >> 1) & 1)})"></td>`;
                            html += `<td><input type="button" value="power on/off" onclick="setModbus('${slave}', ${0x00}, ${0x01}, ${0x05}, ${!((recv[9] >> 0) & 1)})"></td>`;
                            html += '</tr>';
                        })
                        .catch(err => {
                            console.error('Error in modbus_request:', err);
                            html += `<td>Error: ${err.message}</td> </tr>`;
                        });
        
                    promises.push(promise);
                }
                else {
                    slaves[slave] = new Modbus(slave.split(':')[0], slave.split(':')[1]);
                    html += '<tr>';
                    html += `<td>${slave}</td>`;
                    html += `<td>${slaves[slave].isConnect}</td>`;
                    html += '</tr>';

                    resolve(html);
                }
            });
        
            Promise.all(promises)
                .then(() => {
                    resolve(html);
                })
                .catch(err => {
                    console.error('Error in processing:', err);
                    reject(err);
                });
        })
        .then(html => {
            res.send(html);
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

