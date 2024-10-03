import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';
import api from './Router/api.route.js';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const server = express();

// set ejs
server.set('views', path.join(__dirname, '../View'));
server.set('view engine', 'ejs');

server.use(cookieParser());

server.use('/img', express.static(path.join(__dirname, '../View/img')));

server.use('/css', express.static(path.join(__dirname, '../View/css')));

server.use('/js', express.static(path.join(__dirname, '../View/js')));

server.use('/index', (req, res) => {
  if (req.cookies.isAdmin)
    res.render('index', { title: 'Home' });
  else
    res.redirect('../');
});

server.use('/controll', (req, res) => {
  if (req.cookies.isAdmin)
    res.render('controll');
  else
    res.redirect('../');
});

server.use('/api', api);

server.use('/connectTest', (req, res) => {
  if (req.cookies.isAdmin)
    res.render('connectTest');
  else
    res.redirect('../');
});

server.use('/log', (req, res) => {
  if (req.cookies.isAdmin)
    res.render('log');
  else
    res.redirect('../');
});

server.get('/', (req, res) => {
  res.render('admin', { title: 'Home' });
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

server.get('/event_log', (req, res) => {
  const filePath = path.join(__dirname, '../event_log.json');

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
