'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DemandChart({ data }: { data: { zone: string; seeking: number; listings: number }[] }) {
  const chartData = {
    labels: data.map(d => d.zone),
    datasets: [
      {
        label: 'Seeking Posts',
        data: data.map(d => d.seeking),
        backgroundColor: '#C8920A',
        borderRadius: 4,
      },
      {
        label: 'Listings',
        data: data.map(d => d.listings),
        backgroundColor: '#003366',
        borderRadius: 4,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { 
        beginAtZero: true,
        ticks: { stepSize: 1 }
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '200px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
