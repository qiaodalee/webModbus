import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';
import index from './Router/index.route.js';
import api from './Router/api.route.js';
import connectTest from './Router/connectTest.route.js';
import log from './Router/log.route.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const server = express();

// set ejs
server.set('views', path.join(__dirname, '../View'));
server.set('view engine','ejs');

server.use(cookieParser());

server.use('/img', express.static(path.join(__dirname, '../View/img')));

server.use('/css', express.static(path.join(__dirname, '../View/css')));

server.use('/index', index);

server.use('/api', api);

server.use('/connectTest', connectTest);

server.use('/log', log);

server.use('/', (req, res) =>{
    res.send(`<a href="http://${config.ip}:${config.port}/index">index</a><br><br><a href="http://${config.ip}:${config.port}/connectTest">connectTest</a>`);
});

server.get('/plc_config', (req, res) => {
    const filePath = path.join(__dirname, '../hmi_conf.json');
    
    // Read and send the JSON file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.status(500).send('Error reading the JSON file.');
        return;
      }
  
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    });
  });

export default server;
