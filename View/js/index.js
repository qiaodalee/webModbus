// 1000 milliseconds = 1 second
const interval = 10000;
var slaves = [];
let slavesModbusData = {};
var chart;

function getSlaves() {
    return new Promise((resolve, reject) => {
        $.get('../api/getSlaves', function (res) {
            slaves = Object.keys(res);
            const slaves_select = document.getElementById("slaves");

            Object.keys(res).forEach((slave, index) => {
                const new_slave_option = document.createElement("option");
                new_slave_option.value = slave;
                new_slave_option.innerHTML = res[slave];

                if ( index == 0){
                    new_slave_option.defaultSelected = true;
                }

                slaves_select.appendChild(new_slave_option);
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

function timeToString(hours, minutes) {
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${hours}:${minutes}`;
}

function updateChartData(chart) {
    getChartData()
        .then(recv => {
            const current_plc = document.getElementById('slaves').value;
            const current_info = document.getElementById('display_info').value;

            slavesModbusData = recv;
            // console.log(slavesModbusData)
            let angle = (slavesModbusData[current_plc]['currentData']['rotationalSpeed'] / 100) * 240 - 120;
            document.getElementById('rotationalSpeed').style.transform = `rotate(${angle}deg)`

            angle = (slavesModbusData[current_plc]['currentData']['frequency'] / 100) * 240 - 120;
            document.getElementById('frequency').style.transform = `rotate(${angle}deg)`


            let labels = [];
            slavesModbusData[current_plc]['historyData']['timestamp'].forEach(time => {
                const date = new Date(time);
                labels.push(timeToString(date.getHours(), date.getMinutes()));
            });
            chart.data.labels = labels.slice(-20);

            chart.data.datasets[0].label = document.getElementById('slaves').options[document.getElementById('slaves').selectedIndex].innerHTML;
            chart.data.datasets[0].data = slavesModbusData[current_plc]['historyData'][current_info].slice(-20);

            chart.update();
            console.log(slavesModbusData[current_plc]['historyData'][current_info].slice(-20));
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

$(document).ready(function () {
    getSlaves()
        .then((recv) => {
            const ctx = document.getElementById('chart_canvas').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'loading...',
                        data: [{}],
                        backgroundColor: `rgba(46, 204, 113, 1)`,
                        borderColor: `rgba(46, 204, 113, 1)`,
                        borderWidth: 2,
                    }]
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

            updateChartData(chart);
            setInterval(updateChartData, interval, chart);
        })
    
    document.getElementById('slaves').addEventListener('change', () => {
        updateChartData(chart);
    })

    document.getElementById('display_info').addEventListener('change', () => {
        updateChartData(chart);
    })

});
