import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const TicketChart = ({ data, selectedRoute }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by timestamp
    const grouped = data.reduce((acc, curr) => {
      // 시간대 포맷팅
      const dateObj = new Date(curr.timestamp);
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (!acc[time]) {
        acc[time] = { time, timestamp: dateObj.getTime() };
      }
      
      // route 이름을 키로 하여 available 값을 저장
      acc[time][curr.route] = curr.available;
      return acc;
    }, {});

    // Convert to array and sort by timestamp
    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const routes = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(item => item.route))];
  }, [data]);

  const colors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#f43f5e'
  ];

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No historical data available for chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {routes.map((route, index) => (
            <linearGradient key={`gradient-${route}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Legend verticalAlign="top" height={36}/>
        
        {selectedRoute === 'all' ? (
          routes.map((route, index) => (
            <Area
              key={route}
              type="monotone"
              dataKey={route}
              stroke={colors[index % colors.length]}
              fillOpacity={1}
              fill={`url(#color-${index})`}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
          ))
        ) : (
          <Area
            type="monotone"
            dataKey={selectedRoute}
            stroke={colors[routes.indexOf(selectedRoute) % colors.length]}
            fillOpacity={1}
            fill={`url(#color-${routes.indexOf(selectedRoute)})`}
            strokeWidth={3}
            activeDot={{ r: 8 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default TicketChart;
