import {exec} from 'child_process';
import Modbus from './modbusAPI/modbus.controller.js';

const slaves = {
    '127.0.0.1:5000': new Modbus('127.0.0.1', '5000'),
    '127.0.0.1:5030': new Modbus('127.0.0.1', '5030')
}

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

    async getModbus(req, res){
        let html = '';

        const host = req.query.host;
        // res.send('');

        return new Promise((resolve, reject) => {
            let promises = [];
            let plc_access = req.cookies['plc_access'];


            if (slaves[host].isConnect && plc_access != undefined && plc_access.includes(host)) {

                // modbus_request( transaction, startAddr, len, functionCode, data)
                let promise = slaves[host].modbus_request(++tran, 0, 2, 1, [])
                    .then((recv) => {
                        html += `<td>${host}</td>`;
                        html += `<td>Connect</td>`;
                        html += `<td>${(recv[9] >> 1) & 1}</td>`;
                        html += `<td>${(recv[9] >> 0) & 1}</td>`;
                        html += `<td><input type="button" value="maintenance on/off" onclick="setModbus('${host}', ${0x01}, ${0x01}, ${0x05}, ${!((recv[9] >> 1) & 1)})"></td>`;
                        html += `<td><input type="button" value="power on/off" onclick="setModbus('${host}', ${0x00}, ${0x01}, ${0x05}, ${!((recv[9] >> 0) & 1)})"></td>`;
                    })
                    .catch(err => {
                        console.error('Error in modbus_request:', err);
                        html += `<td>Error: ${err.message}</td> </tr>`;
                    });
    
                promises.push(promise);
            }
            else {
                html += `<td>${host}</td>`;
                html += `<td>Unconnect <input type="button" value="Sign in" onclick="signIn('${host}')"></td>`;

                resolve(html);
            }
        
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

    getSlaves(req, res){
        let slavesData = [];
        Object.keys(slaves).forEach(slave =>{
            slavesData.push(slave);
        });

        res.send(slavesData);
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

