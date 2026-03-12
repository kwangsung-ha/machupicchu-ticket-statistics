import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { LayoutDashboard, RefreshCcw, AlertTriangle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import TicketChart from './TicketChart';

const Dashboard = () => {
  const [currentData, setCurrentData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('all');

  // 날짜 선택 상태 초기화
  const formatMonth = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [endMonth, setEndMonth] = useState(formatMonth(new Date()));
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return formatMonth(d);
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    for (let i = 0; i < 36; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const val = formatMonth(d);
      options.push({ label: val, value: val });
    }
    return options;
  }, []);

  // API 호출 함수 (의존성 최소화로 무한 루프 방지)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${startMonth}-01T00:00:00`;
      const [year, month] = endMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${endMonth}-${lastDay}T23:59:59`;

      // 1. 현재 현황 데이터 가져오기
      const currentRes = await axios.get('/api/availability/current');
      setCurrentData(currentRes.data);
      
      if (currentRes.data.length > 0) {
        setLastUpdated(currentRes.data[0].timestamp);
      }

      // 2. 히스토리 데이터 가져오기
      let nidRuta = undefined;
      if (selectedRoute !== 'all') {
        const routeObj = currentRes.data.find(r => r.route === selectedRoute);
        if (routeObj) nidRuta = routeObj.nidRuta;
      }

      const historyRes = await axios.get('/api/availability/history', {
        params: { start_date: startDate, end_date: endDate, nidRuta }
      });
      setHistoryData(historyRes.data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch availability data.');
    } finally {
      setLoading(false);
    }
  }, [startMonth, endMonth, selectedRoute]); // selectedRoute 변경 시에만 재호출

  // 주기적 갱신 (1분마다)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (available, total) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return 'text-red-600 bg-red-100';
    if (percentage < 10) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const routes = useMemo(() => [...new Set(currentData.map(item => item.route))], [currentData]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Machu Picchu Ticket Monitor</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Peru Time: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Table */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-sans">Live Availability Status</h2>
          <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold">Peru Local Time (UTC-5)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3">Circuit / Route</th>
                <th className="px-6 py-3 text-center">Total</th>
                <th className="px-6 py-3 text-center">Booked</th>
                <th className="px-6 py-3 text-center">Available</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    {loading ? 'Loading availability...' : 'No data available'}
                  </td>
                </tr>
              ) : (
                currentData.map((item, index) => (
                  <tr key={index} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors ${selectedRoute === item.route ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    onClick={() => setSelectedRoute(item.route)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.circuit}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.route}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{item.total}</td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{item.booked}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-white">{item.available}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.available, item.total)}`}>
                        {item.available > 0 ? (
                          <><CheckCircle size={12} className="mr-1" /> Available</>
                        ) : (
                          <><AlertTriangle size={12} className="mr-1" /> Sold Out</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trends Chart */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-sans">
              <Calendar size={22} className="text-indigo-600" />
              Availability Trends (Hourly)
            </h2>
            <p className="text-sm text-gray-500">Hourly ticket status over the selected range.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">Start</span>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm rounded-md p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">End</span>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm rounded-md p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">Route</span>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm rounded-md p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">All Routes</option>
                {routes.map(route => <option key={route} value={route}>{route}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-[450px] w-full">
          <TicketChart data={historyData} selectedRoute={selectedRoute} />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
