const interval = 5000;
var slaves = [];
let slavesModbusData = {};

function getSlaves() {
    return new Promise((resolve, reject) => {
        $.get('../api/getSlaves', function (res) {
            slaves = Object.keys(res);
            const slaves_table = document.getElementById("modbus");

            Object.keys(res).forEach((slave) => {
                const new_slave_option = document.createElement("div");
                new_slave_option.id = slave;
                new_slave_option.classList=["slave-box"];

                slaves_table.appendChild(new_slave_option);
            });

            resolve();
        });
    })

}

function getModbus() {
    slaves.forEach((slave, index) => {
        $.get(`../api/getModbus?host=${slave}`, function (res) {
            // console.log(document.getElementById(slave).innerHTML);
            if (!res.includes('login') || document.getElementById(slave).innerHTML == ''){
                document.getElementById(slave).innerHTML = res;
            }
        });
    });
}

function setModbus(host, startAddr, len, code, data, event) {
    event.disabled = true;
    document.getElementById(`power_status_${host}`).innerHTML = "Setting..";
    let buffer = {};
    buffer['host'] = host;
    buffer['startAddr'] = startAddr;
    buffer['len'] = len;
    buffer['functioncode'] = code;
    if (data) buffer['data'] = [0xFF, 0x00];
    else buffer['data'] = [0x00, 0x00];

    $.post({
        url: '../api/setModbus',
        contentType: 'application/json',
        data: JSON.stringify(buffer),
        success: function (data) {
            console.log('Data received:', data);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        }
    });
}

function updateImg(){
    slaves.forEach((slave, index) => {
        if (document.getElementById(`power_status_${slave}`).getAttribute('value') == '1'){
            document.getElementById(`power_${index+1}`).src = "./img/electric_design_on.png";
        }
        else{
            document.getElementById(`power_${index+1}`).src = "./img/electric_design_off.png";
        }
    })
}

function signIn(host) {
    message = 'PLC password: ';
    passwd = prompt(message);

    let payload = {
        'host': host,
        'passwd': passwd
    };

    $.post({
        url: '../api/signIn',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (data) {
            console.log('Data received:', data);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        }
    });
}

$(document).ready(function () {
    getSlaves()
        .then((recv) => {
            getModbus();
            setInterval(getModbus, interval);
            setInterval(updateImg, interval);
        });

});