const vscode = acquireVsCodeApi();

let currentReportDate = new Date();
let selectedProject = 'Select Project';
let selectedMode = 'day';

// backend sends: Git project names, daily stats, activity/focus stats for day,

const projectOptions = ['Select Project', 'django-proj', 'AI', 'Networking'];

const projectDropdown = document.getElementById('project-dropdown');

const efficiencyTitle = document.querySelector('[data-id="efficiency-title"]');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

prevBtn.addEventListener('click', () => {
    shiftTimeUnit(-1);
});
nextBtn.addEventListener('click', () => {
    shiftTimeUnit(1);
});

function shiftTimeUnit(delta) {
    const multiplier = selectedMode === 'week' ? 7 : 1;
    const noMSInDay = 24 * 60 * 60 * 1000;

    if (currentReportDate > new Date(new Date() - (multiplier * noMSInDay)) && delta > 0)
        return;

    currentReportDate.setDate(currentReportDate.getDate() + delta * multiplier);
    sendCurrentSelectionToBackend();
}

const efficiencyMetrics = {
    editorTime2: '5h 30m',
    activeCoding2: '3h 10m',
    focusedCoding2: '2h 45m',
    coding: '1h 47m',
    testing: '1h 20m',
    refactoring: '0h 23m',
    linesWritten2: 420,
    linesAI2: 180,
    linesImported2: 75
};

const reportSection = document.querySelector('.reports-2');

projectDropdown.addEventListener('change', () => {
    selectedProject = projectDropdown.value;
    efficiencyTitle.textContent = `Efficiency dashboard - Project '${selectedProject}'`;

    //vscode.postMessage({ command: 'selectionChanged', value: selectedValue });

    sendCurrentSelectionToBackend();

    const isSelected = selectedProject !== 'select project';

    // Toggle report visibility
    reportSection.classList.toggle('hidden', !isSelected);

    if (selectedProject !== 'Select Project') {
        if (myChart3) {
            myChart3.destroy();
        }
        myChart3 = getEfficiencyChart();

        Object.entries(efficiencyMetrics).forEach(([key, value]) => {
            const el = document.querySelector(`.value[data-id="${key}"]`);
            if (el) el.textContent = value;
        });
    }
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

        const newMode = btn.dataset.mode; // Send selected mode back to extension (optional)
        //vscode.postMessage({ command: 'modeSelected', value: selectedMode });

        selectedMode = newMode; // Update the selected mode
        sendCurrentSelectionToBackend();

        // Create chart based on selected mode
        if (selectedMode === 'day') {
            Object.entries(dailyMetrics).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        } else if (selectedMode === 'week') {
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
        { start: 512, end: 533, value: 2.5 }, // Longer segment
        { start: 500, end: 593, value: 0.14 }, // Longer segment
        { start: 625, end: 663, value: 0.7 }, // Medium segment
        { start: 670, end: 700, value: 0.2 }, // Short segment
        { start: 756, end: 823, value: 0.4 }, // Longer segment
        { start: 843, end: 888, value: 0.55}

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
    'Coding': [3, 2, 7, 9, 3, 0, 1],
    'Code Review': [2, 1, 8, 3, 5, 0, 1],
    'Testing': [1, 3, 2, 5, 4, 0, 0],
    'Refactoring': [2, 4, 1, 3, 2, 0, 0],
}
const dailyFocus = {
    'focus': [0.3, 0.4, 0.7, 0.3, 0.1, 0, 0],
    'active': [0.5, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2],
    'idle': [0.1, 0.3, 0.1, 0.1, 0.5, 0.1, 0.1],
    'inactive': [0.1, 0.1, 0.1, 0.4, 0.2, 0.8, 0.7],
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
        { label: 'Coding', start: 457, end: 523 },
        { label: 'Code Review', start: 546, end: 589 },
        { label: 'Coding', start: 680, end: 712},
        { label: 'Refactoring', start: 735, end: 773 },
        { label: 'Code Review', start: 810, end: 832 },
        { label: 'Testing', start: 879, end: 921 },
        { label: 'Coding', start: 932, end: 999 },
    ];

const allActivitiesOfDay = [];

if (activitiesOfDay[0].start > 0) {
    allActivitiesOfDay.push({
        label: 'Undefined',
        start: 0,
        end: activitiesOfDay[0].start-1
    });
}

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
let myChart1 = getChart1ForDay(valueMapping, allMinutes);

const ctx2 = document.getElementById('myChart2').getContext('2d');
let myChart2 = getChart2ForDay(allActivitiesOfDay);



function getChart1ForWeek(dailyFocus) {
    return new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: allDays,
            datasets: [
                {
                    label: 'Focused Time',
                    data: dailyFocus['focus'],
                    backgroundColor: 'rgba(220, 111, 2, 0.6)'
                },
                {
                    label: 'Active Time',
                    data: dailyFocus['active'],
                    backgroundColor: 'rgba(235, 202, 54, 0.6)'
                },
                {
                    label: 'Idle Time',
                    data: dailyFocus['idle'],
                    backgroundColor: 'rgba(114, 185, 200, 0.6)'
                },
                {
                    label: 'Inactive Time',
                    data: dailyFocus['inactive'],
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

function getChart1ForDay(valueMapping, allMinutes) {
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

function getChart2ForDay(allActivitiesOfDay) {
    const activityDayDatasets = allActivitiesOfDay.map(seg => ({
        label: seg.label,
        data: [seg.end - seg.start],
        backgroundColor: activityToColorMapping[seg.label],
        stack: 'stack1'
    }));
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

function getChart2ForWeek(dailyActivities) {
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

let currentTime = Math.floor(new Date('2025-06-15T00:00:00Z').getTime() / 1000); // UNIX seconds

function nextTime(minGap = 1 * 3600, maxGap = 3 * 86400) {
    const gap = Math.floor(Math.random() * (maxGap - minGap + 1)) + minGap;
    currentTime += gap;
    return currentTime;
}

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
            const activeEffort = this.codingTime + this.codeReviewTime + this.refactoringTime;
            const codeWeight = this.codeByUser + 0.5 * this.codeByAI;
            const base = this.timeActive || 1;
            const score = (activeEffort + codeWeight) / base;
            return parseFloat(score.toFixed(2)) + 0.2; // returns value between 0 and 1
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
    "Branch 'database'",
    100,
    [
        new intervalEfficiencyData(nextTime(), 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Commit', 50, 100, 20, 5, 3, 1, 80, 300, 25, 75),
        new intervalEfficiencyData(nextTime(), 'PR create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Commit', 1100, 200, 1500, 200, 600, 900, 1300, 5000, 750, 200),
        new intervalEfficiencyData(nextTime(), 'PR close', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ],
    1100
);

currentTime = Math.floor(new Date('2025-06-15T00:00:00Z').getTime() / 1000);
const branchYdata = new branchEfficiencyData(
    "Branch 'setup'",
    350,
    [
        new intervalEfficiencyData(nextTime(), 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Commit', 30, 50, 10, 5, 2, 1, 40, 200, 15, 50),
        new intervalEfficiencyData(nextTime(), 'Commit', 20, 45, 15, 8, 4, 2, 60, 100, 10, 90),
        new intervalEfficiencyData(nextTime(), 'PR create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'PR close', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ],
    2600
);

currentTime = Math.floor(new Date('2025-06-15T00:00:00Z').getTime() / 1000);
const mainData = new branchEfficiencyData(
    'main',
    0,
    [
        new intervalEfficiencyData(nextTime(), 'Branch create', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Commit', 50, 100, 20, 5, 3, 1, 80, 300, 25, 50),
        new intervalEfficiencyData(nextTime(), 'Commit', 300, 500, 200, 80, 40, 35, 600, 1800, 100, 200),
        new intervalEfficiencyData(nextTime(), 'Deploy', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Commit', 5, 20, 45, 15, 8, 4, 2, 60, 100, 10, 90),
        new intervalEfficiencyData(nextTime(), 'Commit', 350, 600, 250, 180, 120, 110, 400, 2100, 320, 150),
        new intervalEfficiencyData(nextTime(), 'Deploy', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        new intervalEfficiencyData(nextTime(), 'Release', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
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
            x: interval.start * 1000, // <- Multiply by 1000
            y: parseFloat(interval.efficiencyScore),
        })),
        pointBackgroundColor: branch.intervals.map(interval =>
            labelColorMap[interval.label] || 'gray'
        ),
        pointRadius: 6,
        pointHoverRadius: 8,
    };
});

const gitActionTypes = Object.entries(labelColorMap).map(([label, color]) => ({
    label: label,
    data: [], // empty so nothing is plotted
    pointRadius: 0,
    borderWidth: 0,
    backgroundColor: color,
    borderColor: color,
    hidden: false, // so it shows in legend
}));
const allDatasets = [...datasets, ...gitActionTypes];

const ctx3 = document.getElementById('myChart3').getContext('2d');
let myChart3 = null;



function getEfficiencyChart() {
    return new Chart(ctx3, {
        type: 'line',
        data: {
            datasets: allDatasets
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const x = context.parsed.x;
                            const y = context.parsed.y;
                            return `Start: ${x}, Score: ${y}%`;
                        }
                    }
                },
                legend: {
                    position: 'top', // move it to the top
                    labels: {
                        usePointStyle: true,
                        // filter: function (item, chart) {
                        //     // Avoid legend duplication by showing one entry per label
                        //     return true;
                        // }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd MMM yyyy'
                        },
                        tooltipFormat: 'dd MMM yyyy'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Efficiency Score (%)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

function sendCurrentSelectionToBackend() {
    vscode.postMessage({
        command: 'selectionChanged',
        payload: {
            project: selectedProject,
            mode: selectedMode,
            date: currentReportDate.toISOString()
        }
    });
}

window.addEventListener('message', event => {
    const { command, payload } = event.data;
    if (myChart1) myChart1.destroy();
    if (myChart2) myChart2.destroy();

    const isProjectSelected = selectedProject !== 'Select Project' ? selectedProject : '';
    if (command === 'updateFrontend') {
        if (selectedMode === 'day') {
            myChart1 = getChart1ForDay(payload.focusValues, allMinutes);
            myChart2 = getChart2ForDay(payload.activityIntervals);

            reportTitle.textContent = `Daily ${isProjectSelected} Report - ${currentReportDate.toLocaleDateString()}`;
            Object.entries(payload.reportStats).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
            Object.entries(payload.efficiencyMetrics).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        } else {
            myChart1 = getChart1ForWeek(payload.focusDurationsForDay);
            myChart2 = getChart2ForWeek(payload.activityDurationsForDay);
            const sevenDaysAgo = new Date(currentReportDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            reportTitle.textContent = `Weekly ${isProjectSelected} Report - ${sevenDaysAgo.toLocaleDateString()} to ${currentReportDate.toLocaleDateString()}`;
            Object.entries(payload.reportStats).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
            Object.entries(payload.efficiencyMetrics).forEach(([key, value]) => {
                const element = document.querySelector(`.value[data-id="${key}"]`);
                if (element) {
                    element.textContent = value;
                }
            });
        }
    }
});


