import config from './config.js';
import server from './Controll/express.js';


server.listen(config.port, config.ip, 
	function() {
		console.log(`server started on  port http://${config.ip}:${config.port}`);
	}
);

server.on('close', function() {
	console.log('server shut down');
})

process.on('SIGINT', function() {
	console.log('server shut down');
	process.exit();
});  


export default server;
