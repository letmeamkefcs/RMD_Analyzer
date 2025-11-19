import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

const AnalysisCharts: React.FC<Props> = ({ data }) => {
  const chartData = data.categories.map(cat => ({
    name: cat.name,
    value: cat.percentage,
    pixelCount: cat.count,
    color: cat.color
  }));

  // Custom Tooltip to show pixels and percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg text-base z-50">
          <p className="font-bold text-lg" style={{ color: d.color }}>{d.name}</p>
          <p className="text-gray-700">Pixels: <span className="font-mono font-semibold">{d.pixelCount.toLocaleString()}</span></p>
          <p className="text-gray-700">Ratio: <span className="font-mono font-semibold">{d.value.toFixed(2)}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8 mb-8">
      {/* Pie Chart */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">Distribution Ratio</h3>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={120}
                outerRadius={180}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconSize={20}
                wrapperStyle={{ fontSize: '16px', fontWeight: 500 }}
                formatter={(value, entry: any) => <span className="text-gray-700 ml-3 my-1 block">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-2xl font-semibold mb-6 text-gray-800">Absolute Pixel Count</h3>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                tickFormatter={(tick) => `${(tick / 1000).toFixed(0)}k`} 
                tick={{fontSize: 14, fill: '#6b7280'}}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={200} 
                tick={{fontSize: 14, fontWeight: 500, fill: '#374151'}} 
                interval={0}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} />
              <Bar dataKey="pixelCount" radius={[0, 6, 6, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCharts;