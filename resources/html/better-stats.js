const vscode = acquireVsCodeApi();

const projectOptions = ['Select Project', 'NLP', 'AI', 'Networking'];

const projectDropdown = document.getElementById('project-dropdown');
const selectedProject = document.getElementById('selected-project');

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

//===============================================

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
    // Find the segment that covers this minute, or return 0 if none exists
    const segment = segments.find(s => s.start <= minute && s.end > minute);
    return segment ? segment.value : 0;
});

// Chart initialization for each canvas element
const ctx1 = document.getElementById('myChart1').getContext('2d');
const myChart1 = new Chart(ctx1, {
    type: 'line',
    data: {
        labels: allMinutes,
        datasets: [{
            label: 'Focus',
            data: chartData,
            borderWidth: 2,
            borderColor: 'blue',
            tension: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // <- Optional: lets chart fill horizontal space better
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                min: 0,
                max: 1439,
                ticks: {
                    stepSize: 60, // Show every hour (every 60 minutes)
                    callback: function (value, index, values) {
                        const hour = Math.floor(value / 60);
                        const minute = Math.floor(value % 60);
                        return `${hour}:${minute < 10 ? '0' + minute : minute}`; // Format as HH:mm
                    }
                },
                title: {
                    display: true,
                    text: 'Time (HH:mm)'
                },
                grid: {
                    drawOnChartArea: true,
                    drawBorder: true,
                    drawTicks: true,
                    lineWidth: 1 // optional: thin lines
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Value'
                },
                grid: {
                    drawOnChartArea: false, // Hides horizontal grid lines
                    drawTicks: false,        // Keep tick marks
                    drawBorder: false        // Keep the y-axis line
                }
            }
        }
    }
});
