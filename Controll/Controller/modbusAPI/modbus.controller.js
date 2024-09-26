import net from 'net';

class Modbus {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.isConnect = false;
        
        this.connect();
    }

    connect(){
        this.socket = new net.Socket();

        this.socket.connect(this.port, this.host, () => {
            console.log(`Connected to ${this.host}:${this.port}`);
            this.isConnect = true;
        });

        this.socket.on('close', () => {
            console.log('Connection closed');
            this.isConnect = false;
        });

        this.socket.on('error', (err) => {
            console.error('Socket error:', err.message);
            this.socket.destroy();
            this.isConnect = false;
        });

        return new Promise( (resolve, reject) =>{
            resolve('true');
        })
    }

    disconnect(){
        this.socket.destroy();
        this.socket = null;
    }

    modbus_display_msg(buffer) {
        for (let i = 0; i < 6+((buffer[4] << 8) | buffer[5]); i++) {
            console.log(`buffer[${i}] = 0x${buffer[i].toString(16).padStart(2, '0')} => ` +
                        `${(buffer[i] >> 7) & 1}${(buffer[i] >> 6) & 1}${(buffer[i] >> 5) & 1}${(buffer[i] >> 4) & 1} ` +
                        `${(buffer[i] >> 3) & 1}${(buffer[i] >> 2) & 1}${(buffer[i] >> 1) & 1}${(buffer[i] >> 0) & 1}`);
        }
    }

    async modbus_request(transaction, startAddr, len, functionCode, data) {
        const buffer = Buffer.alloc(12);
        this.initBuffer(transaction, functionCode, buffer);

        if (functionCode <= 4) {
            this.modbus_read(startAddr, len, buffer);
        } else if (functionCode > 4 && functionCode <= 6) {
            this.modbus_write_single(startAddr, data, buffer);
        } else if (functionCode > 6) {
            this.modbus_write_multiple(startAddr, len, data, buffer);
        }

        console.log(`\nsend to ${this.host}:${this.port} size = ${buffer.length}`);
        this.modbus_display_msg(buffer);

        this.socket.write(buffer);

        return new Promise( (resolve, reject) =>{
            this.socket.once('data', (data) => {
                console.log(`\nrecv from ${this.host}:${this.port} size = ${data.length}`);
                this.modbus_display_msg(data);
    
                resolve(data);
            });
        })
    }

    initBuffer(transaction, functionCode, buffer) {
        buffer.writeUInt16BE(transaction, 0);

        buffer.writeUInt16BE(0x0000, 2);
        buffer.writeUInt16BE(0x0006, 4);

        buffer.writeUInt8(0xFF, 6);
        buffer.writeUInt8(functionCode, 7);
    
        return;
    }

    modbus_read(startAddr, len, buffer) {
        buffer.writeUInt16BE(startAddr, 8);
        buffer.writeUInt16BE(len, 10);

        return;
    }

    modbus_write_single(startAddr, data, buffer) {
        buffer.writeUInt16BE(startAddr, 8);
        buffer.writeUInt8(data[0], 10);
        buffer.writeUInt8(data[1], 11);

        return;
    }

    modbus_write_multiple(startAddr, len, data, buffer) {
        buffer.writeUInt16BE(startAddr, 8);
        buffer.writeUInt16BE(len, 10);

        buffer.writeUInt8(len * 2, 12);

        for (let i = 0; i < len; i++) {
            buffer.writeUInt16BE(data[i], 13 + i * 2);
        }

        return;
    }
}

export default Modbus;