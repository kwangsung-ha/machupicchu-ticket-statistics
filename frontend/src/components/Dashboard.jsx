import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, RefreshCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import TicketChart from './TicketChart';

const Dashboard = () => {
  const [currentData, setCurrentData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        axios.get('/api/availability/current'),
        axios.get('/api/availability/history')
      ]);
      setCurrentData(currentRes.data);
      setHistoryData(historyRes.data);
      if (currentRes.data.length > 0) {
        // 백엔드 필드명인 timestamp 사용
        setLastUpdated(currentRes.data[0].timestamp);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch availability data. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (available, total) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return 'text-red-600 bg-red-100';
    if (percentage < 10) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const routes = [...new Set(currentData.map(item => item.route))];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Table */}
      <section className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Availability</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Circuit</th>
                  <th className="px-6 py-3">Route</th>
                  <th className="px-6 py-3 text-center">Total</th>
                  <th className="px-6 py-3 text-center">Booked</th>
                  <th className="px-6 py-3 text-center">Available</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                      {loading ? 'Loading availability...' : 'No data available'}
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.circuit}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.route}</td>
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
        </div>
      </section>

      {/* Trends Chart */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-sans flex items-center gap-2">
              Availability Trends
              <div className="group relative">
                <Info size={14} className="text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Historical tracking of available tickets over time.
                </div>
              </div>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track how ticket availability changes throughout the day.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="route-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">Route:</label>
            <select
              id="route-select"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
            >
              <option value="all">All Routes</option>
              {routes.map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <TicketChart data={historyData} selectedRoute={selectedRoute} />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
