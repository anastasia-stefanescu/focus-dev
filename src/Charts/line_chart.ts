import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    CategoryScale,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

export default class LineChart {
    private chart: Chart | null = null;
    private chartLabel: string = '';
    private canvasId: string = '';

    public constructor(canvasId: string, chartLabel:string, chartData: number[] = [], chartLabels: string[] = []) {
        this.chartLabel = chartLabel;
        this.canvasId = canvasId;

        this.initChart(chartData, chartLabels);
    }

    public initChart(chartData: number[], sectionLabels: string[]): void {
        const ctx = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
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

    public updateChartData(newData: number[], newLabels: string[]): void {
        if (!this.chart) {
            console.warn('Chart has not been initialized.');
            return;
        }

        this.chart.data.labels = newLabels;
        this.chart.data.datasets[0].data = newData;
        this.chart.update();
    }
}
