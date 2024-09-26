// 1000 milliseconds = 1 second
const interval = 10000;
var slaves = [];
let slavesModbusData = {};
let current = 'power';

function getSlaves() {
    return new Promise((resolve, reject) => {
        $.get('../api/getSlaves', function (res) {
            slaves = res;
            const modbus_table = document.getElementById("modbus");

            slaves.forEach(slave => {
                const new_slave = document.createElement("div");
                new_slave.id = slave;

                modbus_table.appendChild(new_slave);
            });

            resolve();
        });
    })

}

function getModbus() {
    slaves.forEach((slave, index) => {
        $.get(`../api/getModbus?host=${slave}`, function (res) {
            // console.log(document.getElementById(slave).innerHTML);
            if (!res.includes('login') || document.getElementById(slave).innerHTML == '')
                document.getElementById(slave).innerHTML = res;
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


function timeToString(hours, minutes) {
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${hours}:${minutes}`;
}

function getRandomNumber() {
    return Math.floor(Math.random() * 256);
}

function updateChartData(chart) {
    getChartData()
        .then(recv => {
            slavesModbusData = recv;

            let labels = [];
            slavesModbusData[slaves[0]]['historyData']['timestamp'].forEach(time => {
                const date = new Date(time);
                labels.push(timeToString(date.getHours(), date.getMinutes()));
            });
            chart.data.labels = labels;

            slaves.forEach((slave, index) => {
                chart.data.datasets[index].data = slavesModbusData[slave]['historyData'][current];

                if (slavesModbusData[slave]['currentData']['power']) document.getElementById(`power_${index + 1}`).src = "http://127.0.0.1:5020/img/electric_design_on.png";
                else document.getElementById(`power_${index + 1}`).src = "http://127.0.0.1:5020/img/electric_design_off.png";
            });

            chart.update();
        })
        .catch(err => {
            console.error(err);
        })
}

function getChartData() {
    return new Promise((resolve, reject) => {
        $.get(`../api/getChartData`, function (res, err) {
            if (res == undefined) {
                reject(err);
            }

            resolve(res);
        });
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

function show_menu() {
    const menu = document.getElementById('menu');

    menu.classList.toggle('show');
}

function updateCurrent(newCurrent) {
    current = newCurrent;
    console.log(current)
}


getChartData()
    .then(recv => {
        slavesModbusData = recv;
    })
    .catch(err => {
        console.error(err);
    })

$(document).ready(function () {
    getSlaves()
        .then((recv) => {
            getModbus();

            setInterval(getModbus, interval);

            const ctx = document.getElementById('chart_canvas').getContext('2d');

            let labels = [];
            slavesModbusData[slaves[0]]['historyData']['timestamp'].forEach(time => {
                const date = new Date(time);
                labels.push(timeToString(date.getHours(), date.getMinutes()));
            });

            let datasets = [];
            slaves.forEach(slave => {
                color = `rgba(${getRandomNumber()}, ${getRandomNumber()}, ${getRandomNumber()}, 1)`;

                datasets.push({
                    label: slave,
                    data: slavesModbusData[slave]['historyData']['power'],
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 2,
                })
            });

            var chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    scales: {
                        x: {
                            beginAtZero: true
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            setInterval(updateChartData, interval, chart);

        })

});