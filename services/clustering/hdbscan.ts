import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';

const SegmentClusteringComparison = () => {
    interface Segment {
        id: number;
        startTime: Date;
        endTime: Date;
        startTimestamp: number;
        endTimestamp: number;
        duration: number;
        eventCount: number;
        eventRate: number;
        centerTime: number;
    }

    const [segments, setSegments] = useState<Segment[]>([]);
    const [clusterResults, setClusterResults] = useState([]);
    const [hdbscanParams, setHdbscanParams] = useState({
        minClusterSize: 3,
        minSamples: 2,
        minDensity: 0.1,
        minEventThreshold: 5,
        maxTimeGap: 1800 // 30 minutes in seconds
    });

    // Generate random time segments with event counts
    const generateSegmentData = () => {
        const numSegments = 50;
        const startTime = new Date('2025-06-01T00:00:00Z');
        const endTime = new Date('2025-06-01T12:00:00Z');
        const totalTimeSpan = endTime.getTime() - startTime.getTime();

        const segments : Segment[]= [];
        let currentTime = startTime.getTime();

        for (let i = 0; i < numSegments; i++) {
            // Random segment duration between 5-30 minutes
            const segmentDuration = (Math.random() * 25 + 5) * 60 * 1000; // 5-30 minutes in ms

            // Random gap between segments (exponential distribution)
            const gap = -Math.log(Math.random()) * 600 * 1000; // avg 10 minutes gap

            currentTime += gap;
            const segmentStart = currentTime;
            const segmentEnd = currentTime + segmentDuration;

            // Random number of events in segment (some segments will be very active)
            let eventCount;
            if (Math.random() < 0.3) {
                // 30% chance of high activity segment
                eventCount = Math.floor(Math.random() * 40 + 10); // 10-50 events
            } else {
                // 70% chance of low activity segment
                eventCount = Math.floor(Math.random() * 8 + 1); // 1-8 events
            }

            segments.push({
                id: i,
                startTime: new Date(segmentStart),
                endTime: new Date(segmentEnd),
                startTimestamp: Math.floor(segmentStart / 1000),
                endTimestamp: Math.floor(segmentEnd / 1000),
                duration: segmentDuration / 1000, // duration in seconds
                eventCount: eventCount,
                eventRate: eventCount / (segmentDuration / 60000), // events per minute
                centerTime: Math.floor((segmentStart + segmentEnd) / 2000) // center timestamp in seconds
            });

            currentTime = segmentEnd;

            // Don't exceed end time
            if (currentTime > endTime.getTime()) break;
        }

        return segments.filter(s => s.endTime <= endTime);
    };

    // HDBSCAN for time segments
    const hdbscanSegments = (segments, params) => {
        const { minClusterSize, minSamples, minDensity, minEventThreshold, maxTimeGap } = params;

        // Filter segments by minimum event threshold first
        const validSegments = segments.filter(s => s.eventCount >= minEventThreshold);
        const n = validSegments.length;

        if (n < minClusterSize) {
            return segments.map(() => -1); // All noise if not enough valid segments
        }

        // Calculate distances between segment centers (in seconds)
        const distances = [];
        for (let i = 0; i < n; i++) {
            distances[i] = [];
            for (let j = 0; j < n; j++) {
                distances[i][j] = Math.abs(validSegments[i].centerTime - validSegments[j].centerTime);
            }
        }

        // Find core distances based on minSamples
        const coreDistances = validSegments.map((_, i) => {
            const dists = distances[i].slice().sort((a, b) => a - b);
            return dists[Math.min(minSamples, dists.length - 1)];
        });

        // Calculate local density considering both temporal proximity and event density
        const localDensities = validSegments.map((segment, i) => {
            const neighborsInRange = distances[i].filter(d => d <= Math.max(coreDistances[i], maxTimeGap)).length;
            const avgEventRate = distances[i]
                .map((d, j) => d <= Math.max(coreDistances[i], maxTimeGap) ? validSegments[j].eventRate : 0)
                .reduce((sum, rate) => sum + rate, 0) / neighborsInRange;

            // Combined density: temporal density * event density
            const temporalDensity = neighborsInRange / Math.max(coreDistances[i], 1);
            const eventDensity = avgEventRate / 10; // normalize event rate

            return temporalDensity * (1 + eventDensity);
        });

        // Filter points based on minimum density threshold
        const densityThreshold = minDensity * Math.max(...localDensities);
        const denseSegmentIndices = localDensities
            .map((density, i) => density >= densityThreshold ? i : -1)
            .filter(i => i !== -1);

        // Build clusters from dense segments
        const clusters = new Array(n).fill(-1);
        const visited = new Array(n).fill(false);
        let clusterId = 0;

        for (const i of denseSegmentIndices) {
            if (!visited[i]) {
                const cluster = [];
                const stack = [i];

                while (stack.length > 0) {
                    const current = stack.pop();
                    if (visited[current]) continue;

                    visited[current] = true;
                    cluster.push(current);

                    // Find neighbors within time gap and core distance
                    for (const j of denseSegmentIndices) {
                        if (!visited[j] &&
                            distances[current][j] <= Math.max(coreDistances[current], coreDistances[j], maxTimeGap)) {
                            stack.push(j);
                        }
                    }
                }

                if (cluster.length >= minClusterSize) {
                    cluster.forEach(idx => clusters[idx] = clusterId);
                    clusterId++;
                }
            }
        }

        // Map back to original segments array
        const originalClusters = new Array(segments.length).fill(-1);
        validSegments.forEach((segment, validIdx) => {
            const originalIdx = segments.findIndex(s => s.id === segment.id);
            if (originalIdx !== -1) {
                originalClusters[originalIdx] = clusters[validIdx];
            }
        });

        return originalClusters;
    };

    useEffect(() => {
        const newSegments = generateSegmentData();
        setSegments(newSegments);

        const clusters = hdbscanSegments(newSegments, hdbscanParams);
        setClusterResults(clusters);
    }, [hdbscanParams]);

    const getColor = (clusterId) => {
        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1', '#d084d0'];
        return clusterId === -1 ? '#999999' : colors[clusterId % colors.length];
    };

    const prepareTimelineData = () => {
        return segments.map((segment, i) => ({
            id: segment.id,
            startTime: segment.startTimestamp,
            endTime: segment.endTimestamp,
            centerTime: segment.centerTime,
            duration: segment.duration,
            eventCount: segment.eventCount,
            eventRate: segment.eventRate.toFixed(2),
            cluster: clusterResults[i] || -1,
            startTimeFormatted: segment.startTime.toLocaleTimeString(),
            endTimeFormatted: segment.endTime.toLocaleTimeString(),
            color: getColor(clusterResults[i] || -1)
        }));
    };

    const prepareScatterData = () => {
        return segments.map((segment, i) => ({
            x: segment.centerTime,
            y: segment.eventCount,
            duration: segment.duration,
            eventRate: segment.eventRate.toFixed(2),
            cluster: clusterResults[i] || -1,
            timeFormatted: new Date(segment.centerTime * 1000).toLocaleTimeString(),
            startTime: segment.startTimeFormatted,
            endTime: segment.endTimeFormatted
        }));
    };

    const getClusterStats = () => {
        if (!clusterResults.length) return {};

        const clusterCounts = {};
        const noisySegments = clusterResults.filter(l => l === -1).length;
        const clusterEventCounts = {};

        clusterResults.forEach((label, i) => {
            if (label !== -1) {
                clusterCounts[label] = (clusterCounts[label] || 0) + 1;
                clusterEventCounts[label] = (clusterEventCounts[label] || 0) + segments[i]?.eventCount || 0;
            }
        });

        return {
            numClusters: Object.keys(clusterCounts).length,
            noisySegments,
            clusterSizes: clusterCounts,
            clusterEventTotals: clusterEventCounts
        };
    };

    const timelineData = prepareTimelineData();
    const scatterData = prepareScatterData();
    const stats = getClusterStats();

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto" >
            <h1 className="text-3xl font-bold text-gray-800 mb-6"> Time Segment Clustering with HDBSCAN </h1>

            <div className = "mb-6 bg-blue-50 p-4 rounded-lg" >
                <h3 className="text-lg font-semibold text-blue-800 mb-2" > Segment - Based HDBSCAN Parameters: </h3>
                    < div className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" >
                        <div>
                        <label className="block text-sm text-gray-700 mb-1" > Min Cluster Size: </label>
                            < input
    type = "number"
    min = "2"
    max = "10"
    value = { hdbscanParams.minClusterSize }
    onChange = {(e) => setHdbscanParams(prev => ({ ...prev, minClusterSize: parseInt(e.target.value) }))}
className = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    </div>
    < div >
    <label className="block text-sm text-gray-700 mb-1" > Min Samples: </label>
        < input
type = "number"
min = "1"
max = "8"
value = { hdbscanParams.minSamples }
onChange = {(e) => setHdbscanParams(prev => ({ ...prev, minSamples: parseInt(e.target.value) }))}
className = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    </div>
    < div >
    <label className="block text-sm text-gray-700 mb-1" > Min Density(0.0 - 1.0): </label>
        < input
type = "number"
min = "0"
max = "1"
step = "0.01"
value = { hdbscanParams.minDensity }
onChange = {(e) => setHdbscanParams(prev => ({ ...prev, minDensity: parseFloat(e.target.value) }))}
className = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    </div>
    < div >
    <label className="block text-sm text-gray-700 mb-1" > Min Events per Segment: </label>
        < input
type = "number"
min = "1"
max = "20"
value = { hdbscanParams.minEventThreshold }
onChange = {(e) => setHdbscanParams(prev => ({ ...prev, minEventThreshold: parseInt(e.target.value) }))}
className = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    <p className="text-xs text-gray-500 mt-1" > Only segments with this many events are considered </p>
        </div>
        < div >
        <label className="block text-sm text-gray-700 mb-1" > Max Time Gap(minutes): </label>
            < input
type = "number"
min = "5"
max = "120"
value = { hdbscanParams.maxTimeGap / 60 }
onChange = {(e) => setHdbscanParams(prev => ({ ...prev, maxTimeGap: parseInt(e.target.value) * 60 }))}
className = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
    <p className="text-xs text-gray-500 mt-1" > Max time gap between segments in same cluster </p>
        </div>
        </div>
        </div>

        < div className = "grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8" >
            <div className="bg-white p-4 rounded-lg shadow" >
                <h3 className="text-lg font-semibold text-gray-800 mb-2" > Cluster Statistics </h3>
                    < div className = "space-y-2 text-sm" >
                        <p><span className="font-medium" > Total Segments: </span> {segments.length}</p >
                            <p><span className="font-medium" > Number of Clusters: </span> {stats.numClusters || 0}</p >
                                <p><span className="font-medium" > Noisy Segments: </span> {stats.noisySegments || 0}</p >
                                    <p><span className="font-medium" > Clustered Segments: </span> {segments.length - (stats.noisySegments || 0)}</p >
                                        </div>
                                        </div>

                                        < div className = "bg-white p-4 rounded-lg shadow" >
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2" > Event Distribution </h3>
                                                < div className = "space-y-2 text-sm" >
                                                    <p><span className="font-medium" > Total Events: </span> {segments.reduce((sum, s) => sum + s.eventCount, 0)}</p >
                                                        <p><span className="font-medium" > Avg Events / Segment: </span> {(segments.reduce((sum, s) => sum + s.eventCount, 0) / segments.length).toFixed(1)}</p>
                                                            < p > <span className="font-medium" > High Activity Segments: </span> {segments.filter(s => s.eventCount >= hdbscanParams.minEventThreshold).length}</p >
                                                                </div>
                                                                </div>

                                                                < div className = "bg-white p-4 rounded-lg shadow col-span-2" >
                                                                    <h3 className="text-lg font-semibold text-gray-800 mb-2" > Cluster Details </h3>
                                                                        < div className = "space-y-1 text-sm max-h-32 overflow-y-auto" >
                                                                        {
                                                                            Object.entries(stats.clusterSizes || {}).map(([clusterId, size]) => (
                                                                                <div key= { clusterId } className = "flex justify-between items-center" >
                                                                                <span style={{ color: getColor(parseInt(clusterId)) }} >
                                                                            Cluster { clusterId }:
</span>
    < span > { size } segments, { stats.clusterEventTotals?.[clusterId] || 0 } events </span>
        </div>
              ))}
</div>
    </div>
    </div>

    < div className = "space-y-6" >
        <div className="bg-white p-6 rounded-lg shadow" >
            <h2 className="text-xl font-semibold text-gray-800 mb-4" > Timeline View - Segment Clusters </h2>
                < ResponsiveContainer width = "100%" height = { 500} >
                    <ScatterChart data={ timelineData } margin = {{ top: 20, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                  dataKey="centerTime"
name = "Time"
domain = { ['dataMin', 'dataMax']}
tickFormatter = {(value) => new Date(value * 1000).toLocaleTimeString()}
                />
    < YAxis
dataKey = "eventCount"
name = "Events"
    />
    <Tooltip
                  labelFormatter={ (value) => `Time: ${new Date(value * 1000).toLocaleTimeString()}` }
formatter = {(value, name) => {
    if (name === 'eventCount') return [value, 'Events in Segment'];
    return [value, name];
}}
contentStyle = {{ fontSize: '12px' }}
                />
{/* Render each cluster as a separate scatter series */ }
{
    Object.keys(stats.clusterSizes || {}).map(clusterId => (
        <Scatter
                    key= { clusterId }
                    dataKey = "eventCount"
                    data = { timelineData.filter(d => d.cluster === parseInt(clusterId)) }
                    fill = { getColor(parseInt(clusterId))
}
name = {`Cluster ${clusterId}`}
r = { 8}
    />
                ))}
{/* Render noise points */ }
<Scatter
                  dataKey="eventCount"
data = { timelineData.filter(d => d.cluster === -1) }
fill = "#999999"
name = "Noise"
r = { 5}
    />
    </ScatterChart>
    </ResponsiveContainer>
    </div>

    < div className = "bg-white p-6 rounded-lg shadow" >
        <h2 className="text-xl font-semibold text-gray-800 mb-4" > Segment Duration vs Event Count </h2>
            < ResponsiveContainer width = "100%" height = { 500} >
                <ScatterChart data={ scatterData } margin = {{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                  dataKey="duration"
name = "Duration (seconds)"
    />
    <YAxis
                  dataKey="y"
name = "Event Count"
    />
    <Tooltip
                  labelFormatter={ (value) => `Duration: ${Math.round(value / 60)} minutes` }
formatter = {(value, name) => [value, 'Events']}
contentStyle = {{ fontSize: '12px' }}
                />
{/* Render each cluster as a separate scatter series */ }
{
    Object.keys(stats.clusterSizes || {}).map(clusterId => (
        <Scatter
                    key= { clusterId }
                    dataKey = "y"
                    data = { scatterData.filter(d => d.cluster === parseInt(clusterId)) }
                    fill = { getColor(parseInt(clusterId))
}
name = {`Cluster ${clusterId}`}
r = { 8}
    />
                ))}
{/* Render noise points */ }
<Scatter
                  dataKey="y"
data = { scatterData.filter(d => d.cluster === -1) }
fill = "#999999"
name = "Noise"
r = { 5}
    />
    </ScatterChart>
    </ResponsiveContainer>
    </div>
    </div>

    < div className = "mt-8 bg-white p-6 rounded-lg shadow" >
        <h2 className="text-xl font-semibold text-gray-800 mb-4" > Segment - Based HDBSCAN Features </h2>
            < div className = "grid grid-cols-1 md:grid-cols-2 gap-6" >
                <div>
                <h3 className="font-semibold text-green-600 mb-2" > Key Capabilities: </h3>
                    < ul className = "text-sm space-y-1" >
                        <li>• <strong>Event Threshold Filtering: </strong> Only considers segments with sufficient activity</li >
                            <li>• <strong>Temporal Proximity: </strong> Groups segments that are close in time</li >
                                <li>• <strong>Combined Density: </strong> Uses both temporal and event density for clustering</li >
                                    <li>• <strong>Flexible Time Gaps: </strong> Configurable maximum gap between clustered segments</li >
                                        <li>• <strong>Variable Segment Lengths: </strong> Handles segments of different durations</li >
                                            </ul>
                                            </div>
                                            < div >
                                            <h3 className="font-semibold text-blue-600 mb-2" > Use Cases: </h3>
                                                < ul className = "text-sm space-y-1" >
                                                    <li>• <strong>Activity Period Detection: </strong> Find periods of sustained high activity</li >
                                                        <li>• <strong>Anomaly Detection: </strong> Identify unusual activity patterns</li >
                                                            <li>• <strong>Workflow Analysis: </strong> Group related work sessions</li >
                                                                <li>• <strong>Performance Monitoring: </strong> Cluster high-load periods</li >
                                                                    <li>• <strong>User Behavior: </strong> Identify patterns in user engagement</li >
                                                                        </ul>
                                                                        </div>
                                                                        </div>
                                                                        </div>
                                                                        </div>
                                                                        </div>
  );
};

export default SegmentClusteringComparison;
