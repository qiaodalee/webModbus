import mysql from 'mysql';
import config from '../config.js'

const connection = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.dbport
});

connection.getConnection((err, connect) => {
    if ( err) {
        console.error(err);
    }
})

export default {
    query(cmd) {
        // console.log(cmd);
        return new Promise((resolve, reject) => {
            connection.query(cmd, (err, res, fieds) => {
                if ( err){
                    console.error(err);
                    reject(err);
                }
                else {
                    // console.log(res);
                    // console.log(fieds)
                    resolve(res);
                }
            })
        });
    }
};