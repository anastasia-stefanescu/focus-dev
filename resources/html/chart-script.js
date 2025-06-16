const vscode = acquireVsCodeApi();

// backend sends: Git project names, daily stats, activity/focus stats for day,

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

const toggleButtons = document.querySelectorAll('.toggle-btn');
const dayButton = document.querySelector(`.toggle-btn[data-id="day-btn"]`);
dayButton.classList.add('selected');


toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleButtons.forEach(b => b.classList.remove('selected')); // Remove .selected from all buttons

        btn.classList.add('selected');  // Add .selected to clicked button

        const selectedMode = btn.dataset.mode; // Send selected mode back to extension (optional)
        vscode.postMessage({ command: 'modeSelected', value: selectedMode });

        if (myChart1) {
            myChart1.destroy();
        }
        if (myChart2) {
            myChart2.destroy();
        }

        // Create chart based on selected mode
        if (selectedMode === 'day') {
            myChart1 = getChart1ForDay();
            myChart2 = getChart2ForDay();
            reportTitle.textContent = `Daily Report - ${new Date().toLocaleDateString()}`;
            Object.entries(dailyMetrics).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        } else if (selectedMode === 'week') {
            myChart1 = getChart1ForWeek();
            myChart2 = getChart2ForWeek();
            reportTitle.textContent = `Weekly Report - ${new Date().toLocaleDateString()}`;
            Object.entries(weeklyMetrics).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        }
    });
});

//===============================================
const dailyMetrics = {
    editorTime: '6 h 36 min',
    activeCoding: '3 h 24 min',
    focusedCoding: '2 h 15 min',
    linesWritten: 375,
    linesAI: 174,
    linesImported: 189
};

const weeklyMetrics = {
    editorTime: '32 h 12 min',
    activeCoding: '18 h 48 min',
    focusedCoding: '14 h 30 min',
    linesWritten: 1875,
    linesAI: 874,
    linesImported: 945
};

const reportTitle = document.querySelector('.report-title');
reportTitle.textContent = `Daily Report - ${new Date().toLocaleDateString()}`;

// Inject metrics into DOM
Object.entries(dailyMetrics).forEach(([key, value]) => {
    const element = document.querySelector(`.value[data-id="${key}"]`);
    if (element) {
        element.textContent = value;
    }
});



//===============================================

const segments = [
    { start: 5, end: 10, value: 0.9 }, // Narrow segment
    { start: 15, end: 30, value: 1.29 }, // Wider segment
    { start: 50, end: 100, value: 2.5 }, // Longer segment
    { start: 150, end: 180, value: 0.44 }, // Medium segment
    { start: 200, end: 250, value: 0.3 }, // Medium segment
    { start: 300, end: 400, value: 0.1 }, // Longer segment
    { start: 500, end: 600, value: 0.14 }, // Longer segment
    { start: 800, end: 900, value: 0.7 }, // Medium segment
    { start: 950, end: 1050, value: 0.4 }, // Longer segment
    { start: 1100, end: 1150, value: 0.67 }, // Narrow segment
    { start: 1200, end: 1300, value: 1.3 }, // Long segment
    { start: 1350, end: 1400, value: 0.9 }, // Narrow segment
    // Add more segments here...
];

const allMinutes = Array.from({ length: 1440 }, (_, i) => i);
const valueMapping = {};

for (let i = 0; i < segments.length; i++) {
    const middle = Math.floor((segments[i].start + segments[i].end) / 2);
    valueMapping[middle] = segments[i].value;

    nextStart = i + 1 < segments.length ? segments[i + 1].start : 1440; // Default to end of day if no next segment
    const middleOfSpace = Math.floor((segments[i].end + nextStart) / 2);
    valueMapping[middleOfSpace] = 0;
}

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dailyActivities = {
    'Coding': [12, 19, 3, 5, 10, 2, 3],
    'Code Review': [5, 10, 2, 3, 7, 4, 2],
    'Testing': [3, 7, 4, 2, 3, 5, 1],
    'Refactoring': [2, 3, 5, 1, 4, 2, 3],
}
const dailyFocus = {
    'Focused': [0.3, 0.4, 0.7, 0.3, 0.1, 0.2, 0.3],
    'Active': [0.5, 0.2, 0.1, 0.2, 0.2, 0.4, 0.2],
    'Idle': [0.1, 0.5, 0.1, 0.1, 0.7, 0.1, 0.1],
    'Inactive': [0.1, 0.1, 0.1, 0.4, 0.6, 0.3, 0.4],
}

const activityToColorMapping = {
    'Coding': 'rgba(255, 99, 132, 0.6)',
    'Code Review': 'rgba(54, 162, 235, 0.6)',
    'Testing': 'rgba(75, 192, 192, 0.6)',
    'Refactoring': 'rgba(255, 206, 86, 0.6)',
    'Undefined': 'rgba(201, 203, 207, 0.3)',
}

// overlapping intervals for a single day!!
const activitiesOfDay = [
    { label: 'Coding', start: 10,  end: 80},
    { label: 'Code Review', start: 90, end: 120 },
    { label: 'Coding', start: 190, end: 280 },
    { label: 'Refactoring', start: 400, end: 630 },
    { label: 'Code Review', start: 800, end: 950 },
    { label: 'Testing', start: 1000, end: 1200 },
    { label: 'Coding', start: 1300, end: 1400 },
    { label: 'Refactoring', start: 1410, end: 1430 },
    { label: 'Testing', start: 1435, end: 1440 },
];

const allActivitiesOfDay = [];

for (let i = 0; i < activitiesOfDay.length; i++) {
    allActivitiesOfDay.push(activitiesOfDay[i]);

    const currentEnd = activitiesOfDay[i].end;

    let nextStart = 1440; // Default to end of day if no next activity
    if (i + 1 < activitiesOfDay.length) {
        nextStart = activitiesOfDay[i + 1].start;
    }

    if (nextStart > currentEnd) {
        allActivitiesOfDay.push({
            label: 'Undefined',
            start: currentEnd,
            end: nextStart
        });
    }
}

const activityDayDatasets = allActivitiesOfDay.map(seg => ({
    label: seg.label,
    data: [seg.end-seg.start],
    backgroundColor: activityToColorMapping[seg.label],
    stack: 'stack1'
}));


const ctx1 = document.getElementById('myChart1').getContext('2d');
let myChart1 = getChart1ForDay();

const ctx2 = document.getElementById('myChart2').getContext('2d');
let myChart2 = getChart2ForDay();



function getChart1ForWeek() {
    return new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: allDays,
            datasets: [
                {
                    label: 'Focused Time',
                    data: dailyFocus['Focused'],
                    backgroundColor: 'rgba(220, 111, 2, 0.6)'
                },
                {
                    label: 'Active Time',
                    data: dailyFocus['Active'],
                    backgroundColor: 'rgba(235, 202, 54, 0.6)'
                },
                {
                    label: 'Idle Time',
                    data: dailyFocus['Idle'],
                    backgroundColor: 'rgba(114, 185, 200, 0.6)'
                },
                {
                    label: 'Inactive Time',
                    data: dailyFocus['Inactive'],
                    backgroundColor: 'rgba(176, 176, 176, 0.6)'
                },
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}




function getChart1ForDay() {
    return new Chart(ctx1, {
        type: 'line',
        data: {
            labels: allMinutes, // x values
            datasets: [
                {
                    label: 'Focus Level',
                    data: valueMapping,
                    borderWidth: 2,
                    borderColor: 'orange',
                    backgroundColor: 'rgba(253, 165, 1)',
                    tension: 0
                },
                {
                    label: 'Focus Threshold (0.5)',
                    data: allMinutes.map(() => 0.5),
                    borderColor: 'red',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0, // Hide points
                    tension: 0
                },
                {
                    label: 'Active Threshold (0.2)',
                    data: allMinutes.map(() => 0.2),
                    borderColor: 'blue',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 1439,
                    ticks: {
                        stepSize: 60,
                        callback: function (value) {
                            return `${Math.ceil(value / 60)}`;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (hours)',
                    }
                },
                y: {
                    beginAtZero: true,
                    max: segments.reduce((max, segment) => Math.max(max, segment.value), 0) + 0.5,
                    ticks: {
                        stepSize: 0.1,
                        callback: function (value) {
                            return value.toFixed(1);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Rate (activities / second)'
                    }
                }
            }
        }
    });
}

function getChart2ForDay() {
    return new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: [''], // One bar
            datasets: activityDayDatasets
        },
        options: {
            indexAxis: 'y', // Make it horizontal
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        generateLabels: function (chart) {
                            // Use your mapping keys as legend items
                            return Object.entries(activityToColorMapping).map(([label, color]) => ({
                                text: label,
                                fillStyle: color,
                                strokeStyle: color,
                                lineWidth: 1,
                                hidden: false, // you can link to toggle visibility if needed
                                datasetIndex: -1 // not tied to any one dataset
                            }));
                        }
                    }
                },
            },
            scales: {
                x: {
                    stacked: true,
                    min: 0,
                    max: 1439,
                    title: {
                        display: true,
                        text: 'Time (hours)',
                    },
                    ticks: {
                        stepSize: 60,
                        callback: function (value) {
                            return `${Math.ceil(value / 60)}`;
                        }
                    },
                },
                y: {
                    stacked: true,
                    ticks: {
                        display: false // Hide the empty label
                    }
                }
            }
        }
    });
}



function getChart2ForWeek() {
    return new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: allDays,
            datasets: [
                {
                    label: 'Coding',
                    data: dailyActivities['Coding'],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                },
                {
                    label: 'Code Review',
                    data: dailyActivities['Code Review'],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                },
                {
                    label: 'Testing',
                    data: dailyActivities['Testing'],
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                },
                {
                    label: 'Refactoring',
                    data: dailyActivities['Refactoring'],
                    backgroundColor: 'rgba(255, 159, 64, 0.6)'
                },
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}


//===============================================
class intervalEfficiencyData {
    constructor(start, label, timeInFocus, timeActive, timeIdle, codingTime, codeReviewTime, refactoringTime, testingTime, codeByAI, codeByUser, codeByExternal) {
        this.start = start;
        this.label = label;
        this.timeInFocus = timeInFocus || 0;
        this.timeActive = timeActive || 0;
        this.timeIdle = timeIdle || 0;
        this.codingTime = codingTime || 0;
        this.codeReviewTime = codeReviewTime || 0;
        this.refactoringTime = refactoringTime || 0;
        this.testingTime = testingTime || 0;
        this.codeByAI = codeByAI || 0;
        this.codeByUser = codeByUser || 0;
        this.codeByExternal = codeByExternal || 0;
        this.efficiencyScore = this.computeEfficiencyScore();
    }

    computeEfficiencyScore() {
        if (this.label === 'Commit') {
            // Fake score based on activity time and user code
            const activeEffort = this.codingTime + this.codeReviewTime + this.refactoringTime;
            const codeWeight = this.codeByUser + 0.5 * this.codeByAI;
            const base = this.timeActive || 1;
            return ((activeEffort + codeWeight) / base).toFixed(2);
        }
        return 0;
    }
}


class branchEfficiencyData {
    constructor(branchName, start, intervals, end) {
        this.branchName = branchName;
        this.start = start;
        this.intervals = intervals;
        this.end = end;
    }
}

class projectEfficiencyData {
    constructor(projectName, start, branchesData, end) {
        this.projectName = projectName;
        this.start = start;
        this.branchesData = branchesData
        this.end = end;
    }
}

const branchXdata = new branchEfficiencyData(
    'Branch X',
    100,
    [
        new intervalEfficiencyData(120, 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(180, 'Commit', 50, 100, 20, 5, 3, 1, 80, 300, 25, 75),
        new intervalEfficiencyData(600, 'PR create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(800, 'Commit', 1100, 200, 1500, 200, 600, 900, 1300, 5000, 750, 200),
        new intervalEfficiencyData(1100, 'PR close', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ],
    1100
);
const branchYdata = new branchEfficiencyData(
    'Branch Y',
    350,
    [
        new intervalEfficiencyData(350, 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(360, 'Commit', 30, 50, 10, 5, 2, 1, 40, 200, 15, 50),
        new intervalEfficiencyData(700, 'Commit', 20, 45, 15, 8, 4, 2, 60, 100, 10, 90),
        new intervalEfficiencyData(1400, 'PR create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(1800, 'PR close', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ],
    2600
);

const mainData = new branchEfficiencyData(
    'Main',
    0,
    [
        new intervalEfficiencyData(0, 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(200, 'Commit', 50, 100, 20, 5, 3, 1, 80, 300, 25, 50),
        new intervalEfficiencyData(1200, 'Commit', 300, 500, 200, 80, 40, 35, 600, 1800, 100, 200),
        new intervalEfficiencyData(1500, 'Deploy', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(2500, 'Commit', 5, 20, 45, 15, 8, 4, 2, 60, 100, 10, 90),
        new intervalEfficiencyData(3000, 'Commit', 350, 600, 250, 180, 120, 110, 400, 2100, 320, 150),
        new intervalEfficiencyData(3500, 'Deploy', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(4000, 'Release', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ],
    4000
);

const projectData = new projectEfficiencyData(
    'AI Project',
    0,
    [mainData, branchXdata, branchYdata],
    4000
);

//===============================================
const labelColorMap = {
    'Branch create': 'yellow',
    'Commit': 'blue',
    'PR create': 'orange',
    'PR close': 'green',
    'Deploy': 'teal'
};

function getRandomColor() {
    const r = Math.floor(Math.random() * 200);  // Limit to avoid super bright colors
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r}, ${g}, ${b})`;
}



const datasets = projectData.branchesData.map(branch => {
    const color = getRandomColor();

    return {
        label: branch.branchName,
        borderColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        data: branch.intervals.map(interval => ({
            x: interval.start,
            y: parseFloat(interval.efficiencyScore),
        })),
        pointBackgroundColor: branch.intervals.map(interval =>
            labelColorMap[interval.label] || 'gray'
        ),
        pointRadius: 6,
        pointHoverRadius: 8,
    };
});
console.log(datasets);

const ctx3 = document.getElementById('myChart3').getContext('2d');
let myChart3 = getEfficiencyChart();


function getEfficiencyChart() {
    return new Chart(ctx3, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Interval Efficiency Score by Branch'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const x = context.parsed.x;
                            const y = context.parsed.y;
                            return `Start: ${x}, Score: ${y}`;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Start Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Efficiency Score'
                    },
                    suggestedMin: 0
                }
            }
        }
    });
}

// Function to update all charts
// function updateCharts() {
//     myChart1.update();
//     myChart2.update();
//     myChart3.update();
// }

// window.addEventListener('message', event => {
//     const { labels, data } = event.data;

//     chart.updateChartData(data, labels);
// });

