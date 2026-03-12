import React, { useMemo } from 'react';
import { 
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

    // Group by exact timestamp to preserve hourly detail
    const grouped = data.reduce((acc, curr) => {
      const dateObj = new Date(curr.timestamp);
      
      // X축에 보일 라벨 형식: "Mar 12, 08:00"
      const label = dateObj.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      const key = curr.timestamp; 
      
      if (!acc[key]) {
        acc[key] = { 
          label: label, 
          timestamp: dateObj.getTime() 
        };
      }
      
      acc[key][curr.route] = curr.available;
      return acc;
    }, {});

    // Sort by timestamp to ensure chronological order
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
      <div className="flex items-center justify-center h-full text-gray-500 italic">
        No historical data available for selected range.
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
          dataKey="label" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          dy={10}
          minTickGap={50} // 시간대 정보가 많으므로 라벨 간격 확보
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9ca3af', fontSize: 10 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            border: 'none',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
          }}
          labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
        />
        <Legend verticalAlign="top" height={40} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        
        {selectedRoute === 'all' ? (
          routes.map((route, index) => (
            <Area
              key={route}
              type="monotone"
              dataKey={route}
              stroke={colors[index % colors.length]}
              fillOpacity={1}
              fill={`url(#color-${index})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
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
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default TicketChart;
