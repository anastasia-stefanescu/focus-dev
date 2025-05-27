import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title);


export class LineChart {
    private chart: Chart | null = null;
    private chartLabel: string = '';
    private canvasId: string = '';

    private constructor(canvasId: string, chartLabel: string, chartData: number[] = [], chartLabels: string[] = []) {
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
            type: 'bar',
            data: {
                labels: sectionLabels,
                datasets: [{
                    label: this.chartLabel,
                    data: [300, 500, 400],
                    backgroundColor: 'green'
                }]
            },
            options: {
                responsive: true,
            }
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
