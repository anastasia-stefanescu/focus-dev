const vscode = acquireVsCodeApi();


const projectOptions = ['Select Project', 'NLP', 'AI', 'Networking'];

const projectDropdown = document.getElementById('project-dropdown');

projectDropdown.addEventListener('change', () => {
    selectedProject.textContent = `You selected: ${selectedProject.value}`;
    vscode.postMessage({ command: 'selectionChanged', value: selectedProject.value });
});

projectOptions.forEach(optionText => {
    const option = document.createElement('option');
    option.value = optionText.toLowerCase();
    option.textContent = optionText;
    projectDropdown.appendChild(option);
});

//===============================================
const metrics = {
    editorTime: '6 h 36 min',
    activeCoding: '3 h 24 min',
    focusedCoding: '2 h 15 min',
    linesWritten: 375,
    linesAI: 174,
    linesImported: 189
};

// Inject metrics into DOM
Object.entries(metrics).forEach(([key, value]) => {
    const element = document.querySelector(`.value[data-id="${key}"]`);
    if (element) {
        element.textContent = value;
    }
});

//===============================================

const toggleButtons = document.querySelectorAll('.toggle-btn');
const dayButton = document.querySelector(`.toggle-btn[data-id="day-btn"]`);
dayButton.classList.add('selected');

toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove .selected from all buttons
        toggleButtons.forEach(b => b.classList.remove('selected'));

        // Add .selected to clicked button
        btn.classList.add('selected');

        // Send selected mode back to extension (optional)
        const selectedMode = btn.dataset.mode;
        vscode.postMessage({ command: 'modeSelected', value: selectedMode });
    });
});


const segments = [
    { start: 5, end: 10, value: 50 }, // Narrow segment
    { start: 15, end: 30, value: 70 }, // Wider segment
    { start: 50, end: 100, value: 40 }, // Longer segment
    { start: 150, end: 180, value: 90 }, // Medium segment
    { start: 200, end: 250, value: 60 }, // Medium segment
    { start: 300, end: 400, value: 80 }, // Longer segment
    { start: 500, end: 600, value: 100 }, // Longer segment
    { start: 800, end: 900, value: 75 }, // Medium segment
    { start: 950, end: 1050, value: 90 }, // Longer segment
    { start: 1100, end: 1150, value: 50 }, // Narrow segment
    { start: 1200, end: 1300, value: 40 }, // Long segment
    { start: 1350, end: 1400, value: 60 }, // Narrow segment
    // Add more segments here...
];

// Convert segments into chart data
const allMinutes = Array.from({ length: 1440 }, (_, i) => i);
const chartData = allMinutes.map(minute => {
    // TODO: this is inefficient

    // Find the segment that covers this minute, or return 0 if none exists
    const segment = segments.find(s => s.start <= minute && s.end > minute);
    return segment ? segment.value : 0;
});

// Chart initialization for each canvas element
const ctx1 = document.getElementById('myChart1').getContext('2d');
const myChart1 = new Chart(ctx1, {
    type: 'line',
    data: {
        labels:allMinutes,
        datasets: [{
            label: 'Focus',
            data: chartData,
            borderWidth: 2,
            borderColor: 'orange',
            tension: 0
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                min: 0,
                max: 1439,
                ticks: {
                    stepSize: 60, // Show every hour (every 60 minutes)
                    callback: function (value, index, values) {
                        const hour = Math.ceil(value / 60);
                        //const minute = Math.ceil(value % 60);
                        return `${hour}`; // Format as HH
                    }
                },
                title: {
                    display: true,
                    text: 'Time (HH)'
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Rate (activities / second)'
                }
            }
        }
     }
});

const ctx2 = document.getElementById('myChart2').getContext('2d');
const myChart2 = new Chart(ctx2, {
    type: 'bar',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
            label: 'Bar Chart',
            data: [100, 250, 180, 300],
            borderWidth: 2,
            borderColor: 'green',
            backgroundColor: 'rgba(0, 255, 0, 0.5)'
        }]
    },
    options: { responsive: true }
});

const ctx3 = document.getElementById('myChart3').getContext('2d');
const myChart3 = new Chart(ctx3, {
    type: 'pie',
    data: {
        labels: ['Red', 'Blue', 'Yellow'],
        datasets: [{
            label: 'Pie Chart',
            data: [300, 50, 100],
            backgroundColor: ['red', 'blue', 'yellow']
        }]
    },
    options: { responsive: true }
});

// Function to update all charts
function updateCharts() {
    myChart1.update();
    myChart2.update();
    myChart3.update();
}

window.addEventListener('message', event => {
    const { labels, data } = event.data;

    chart.updateChartData(data, labels);
});



















// const ctx = document.getElementById('myChart').getContext('2d');



// class LineChart {
//     chart = null;
//     chartLabel = '';
//     canvasId = '';

//     constructor(canvasId, chartLabel, chartData = [], chartLabels = []) {
//         this.chartLabel = chartLabel;
//         this.canvasId = canvasId;

//         this.initChart(chartData, chartLabels);
//     }

//     initChart(chartData, sectionLabels){
//         const ctx = document.getElementById(this.canvasId);
//         if (!ctx) {
//             console.error(`Canvas with ID '${this.canvasId}' not found.`);
//             return;
//         }

//         this.chart = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: sectionLabels,
//                 datasets: [
//                     {
//                         label: this.chartLabel,
//                         data: chartData,
//                         borderWidth: 2,
//                         borderColor: 'blue',
//                         tension: 0.1,
//                     },
//                 ],
//             },
//             options: {
//                 responsive: true,
//             },
//         });
//     }

//     updateChartData(newData, newLabels) {
//         if (!this.chart) {
//             console.warn('Chart has not been initialized.');
//             return;
//         }

//         this.chart.data.labels = newLabels;
//         this.chart.data.datasets[0].data = newData;
//         this.chart.update();
//     }
// }

// let chart = new LineChart('myChart', 'Live Data');

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

// function updateChart() {
//     vscode.postMessage({ command: 'requestData' });
// }
