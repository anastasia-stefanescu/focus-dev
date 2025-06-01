const vscode = acquireVsCodeApi();

const ctx = document.getElementById('myChart').getContext('2d');



class LineChart {
    chart = null;
    chartLabel = '';
    canvasId = '';

    constructor(canvasId, chartLabel, chartData = [], chartLabels = []) {
        this.chartLabel = chartLabel;
        this.canvasId = canvasId;

        this.initChart(chartData, chartLabels);
    }

    initChart(chartData, sectionLabels){
        const ctx = document.getElementById(this.canvasId);
        if (!ctx) {
            console.error(`Canvas with ID '${this.canvasId}' not found.`);
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sectionLabels,
                datasets: [
                    {
                        label: this.chartLabel,
                        data: chartData,
                        borderWidth: 2,
                        borderColor: 'blue',
                        tension: 0.1,
                    },
                ],
            },
            options: {
                responsive: true,
            },
        });
    }

    updateChartData(newData, newLabels) {
        if (!this.chart) {
            console.warn('Chart has not been initialized.');
            return;
        }

        this.chart.data.labels = newLabels;
        this.chart.data.datasets[0].data = newData;
        this.chart.update();
    }
}

let chart = new LineChart('myChart', 'Live Data');

// let chart = new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: [],
//         datasets: [{
//             label: 'Live Data',
//             data: [],
//             borderWidth: 2,
//             borderColor: 'blue'
//         }]
//     },
//     options: { responsive: true }
// });

function updateChart() {
    vscode.postMessage({ command: 'requestData' });
}

window.addEventListener('message', event => {
    const { labels, data } = event.data;

    chart.updateChartData(data, labels);
});
