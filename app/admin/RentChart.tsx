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

export default function RentChart({ data }: { data: { zone: string; avg: number }[] }) {
  const chartData = {
    labels: data.map(d => d.zone),
    datasets: [
      {
        label: 'Avg Monthly Rent (৳)',
        data: data.map(d => d.avg),
        backgroundColor: '#0055AA',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div style={{ position: 'relative', height: '200px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
