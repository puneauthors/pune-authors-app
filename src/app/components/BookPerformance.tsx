import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BookOpen, Activity, ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface PerformanceData {
  eventId: number;
  eventName: string;
  date: string;
  bookTitle: string;
  booksSold: number;
  revenue: number;
  investment: number;
}

const getBadgeColor = (title: string) => {
  if (title === 'Manual Aggregation' || title === 'No Sales Yet') return 'bg-gray-100 text-gray-700';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-pink-100 text-pink-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700'
  ];
  return colors[Math.abs(hash) % colors.length];
};

const BookPerformance: React.FC = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = () => localStorage.getItem('token');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/author/book-performance`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      
      setData(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentYear = new Date().getFullYear().toString();
  const [timeframe, setTimeframe] = useState<'all' | 'year' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [chartTab, setChartTab] = useState<'book' | 'channel' | 'revenue'>('book');

  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(data.map(d => new Date(d.date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [data, currentYear]);

  const availableMonths = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  const filteredData = React.useMemo(() => {
    return data.filter(row => {
      const rowDate = new Date(row.date);
      const rowYear = rowDate.getFullYear().toString();
      const rowMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');

      if (timeframe === 'all') return true;
      if (timeframe === 'year') return rowYear === selectedYear;
      if (timeframe === 'month') return rowYear === selectedYear && rowMonth === selectedMonth;
      return true;
    });
  }, [data, timeframe, selectedYear, selectedMonth]);

  // KPIs Calculation
  const uniqueEvents = new Map<number, number>();
  const uniqueEventNames = new Map<number, string>();
  let totalRevenue = 0;
  
  filteredData.forEach(row => {
    uniqueEvents.set(row.eventId, row.investment);
    uniqueEventNames.set(row.eventId, row.eventName);
    totalRevenue += row.revenue;
  });

  const bookColors = ['#4f46e5', '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#e11d48'];

  const totalFairs = uniqueEvents.size;
  let totalInvestment = 0;
  uniqueEvents.forEach(investment => {
    totalInvestment += investment;
  });

  const netROI = totalInvestment > 0 
    ? (((totalRevenue - totalInvestment) / totalInvestment) * 100).toFixed(2) 
    : '0.00';

  // Group data by book
  const groupedBooks = React.useMemo(() => {
    const map: Record<string, { title: string; totalSold: number; totalRev: number; events: PerformanceData[] }> = {};
    filteredData.forEach(row => {
      if (row.bookTitle === 'No Sales Yet') return;
      if (!map[row.bookTitle]) {
        map[row.bookTitle] = { title: row.bookTitle, totalSold: 0, totalRev: 0, events: [] };
      }
      map[row.bookTitle].totalSold += row.booksSold;
      map[row.bookTitle].totalRev += row.revenue;
      map[row.bookTitle].events.push(row);
    });
    return Object.values(map).sort((a, b) => b.totalSold - a.totalSold);
  }, [filteredData]);

  // Group data by channel / event
  const groupedChannels = React.useMemo(() => {
    const map: Record<string, { name: string; totalSold: number; totalRev: number }> = {};
    filteredData.forEach(row => {
      if (!map[row.eventName]) {
        map[row.eventName] = { name: row.eventName, totalSold: 0, totalRev: 0 };
      }
      map[row.eventName].totalSold += row.booksSold;
      map[row.eventName].totalRev += row.revenue;
    });
    return Object.values(map).sort((a, b) => b.totalSold - a.totalSold);
  }, [filteredData]);

  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const toggleBook = (title: string) => {
    setExpandedBooks(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-serif text-paa-navy font-bold tracking-tight mb-2">Book Performance</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Analyze your ROI strictly by Book Title</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="form-select text-sm rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'all' | 'year' | 'month')}
          >
            <option value="year">Year Wise</option>
            <option value="month">Month Wise</option>
            <option value="all">All Time</option>
          </select>
          
          {(timeframe === 'year' || timeframe === 'month') && (
            <select
              className="form-select text-sm rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          {timeframe === 'month' && (
            <select
              className="form-select text-sm rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#2ecc71] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Sales Channels</p>
          </div>
          <h3 className="text-3xl font-black">{totalFairs}</h3>
        </div>
        
        <div className="bg-[#a55eea] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center relative group">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Total Investment</p>
          </div>
          <h3 className="text-3xl font-black">₹{totalInvestment.toLocaleString()}</h3>
        </div>

        <div className="bg-[#4b7bec] rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Total Revenue</p>
          </div>
          <h3 className="text-3xl font-black">₹{totalRevenue.toLocaleString()}</h3>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center ${parseFloat(netROI) >= 0 ? 'bg-[#20bf6b]' : 'bg-[#eb3b5a]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} />
            <p className="text-xs font-bold uppercase tracking-widest">Net ROI</p>
          </div>
          <h3 className="text-3xl font-black">
            {parseFloat(netROI) > 0 && '+'}{netROI}%
          </h3>
        </div>
      </div>

      {/* Simple, Easy-to-Interpret Sales Performance Graph */}
      <div className="dash-panel p-6 mb-8 overflow-hidden">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-paa-navy uppercase tracking-widest">
                {chartTab === 'book' && 'Sales by Book'}
                {chartTab === 'channel' && 'Sales by Channel / Fair'}
                {chartTab === 'revenue' && 'Revenue by Book'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {chartTab === 'book' && 'Direct comparison of units sold across your titles'}
              {chartTab === 'channel' && 'Direct comparison of total units sold at each event/platform'}
              {chartTab === 'revenue' && 'Total earnings (₹) generated by each book'}
            </p>
          </div>

          {/* Simple View Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setChartTab('book')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartTab === 'book'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 By Book
            </button>
            <button
              type="button"
              onClick={() => setChartTab('channel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartTab === 'channel'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎪 By Event
            </button>
            <button
              type="button"
              onClick={() => setChartTab('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartTab === 'revenue'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Revenue (₹)
            </button>
          </div>
        </div>

        {/* Chart Render */}
        <div className="h-[320px] w-full pt-4">
          {((chartTab === 'book' || chartTab === 'revenue') && groupedBooks.length === 0) || (chartTab === 'channel' && groupedChannels.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
              <BookOpen size={32} className="mb-2 opacity-40" />
              <span>No sales data found for the selected time period.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'book' ? (
                <BarChart data={groupedBooks} margin={{ top: 25, right: 20, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="title" 
                    fontSize={11} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 14 ? val.substring(0, 12) + '…' : val}
                  />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[180px]">
                            <p className="font-bold text-gray-900 mb-2 border-b pb-1.5">{item.title}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-sm">{item.totalSold} copies</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Total Revenue:</span>
                              <span className="font-black text-emerald-600 text-sm">₹{item.totalRev.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 mt-1 pt-1 border-t text-[10px] text-gray-400">
                              <span>Channels:</span>
                              <span>{item.events?.length || 0} events</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalSold" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="totalSold" position="top" fill="#1e293b" fontSize={12} fontWeight={800} offset={8} />
                    {groupedBooks.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={bookColors[index % bookColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartTab === 'channel' ? (
                <BarChart data={groupedChannels} margin={{ top: 25, right: 20, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={11} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 15 ? val.substring(0, 13) + '…' : val}
                  />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[180px]">
                            <p className="font-bold text-gray-900 mb-2 border-b pb-1.5">{item.name}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-sm">{item.totalSold} copies</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Revenue:</span>
                              <span className="font-black text-emerald-600 text-sm">₹{item.totalRev.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalSold" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    <LabelList dataKey="totalSold" position="top" fill="#1e293b" fontSize={12} fontWeight={800} offset={8} />
                    {groupedChannels.map((_, index) => (
                      <Cell key={`cell-ch-${index}`} fill={bookColors[index % bookColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={groupedBooks} margin={{ top: 25, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="title" 
                    fontSize={11} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 14 ? val.substring(0, 12) + '…' : val}
                  />
                  <YAxis 
                    fontSize={11} 
                    tick={{ fill: '#64748b' }} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val: number) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[180px]">
                            <p className="font-bold text-gray-900 mb-2 border-b pb-1.5">{item.title}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Revenue:</span>
                              <span className="font-black text-emerald-600 text-sm">₹{item.totalRev.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-sm">{item.totalSold} copies</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalRev" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    <LabelList 
                      dataKey="totalRev" 
                      position="top" 
                      fill="#059669" 
                      fontSize={11} 
                      fontWeight={800} 
                      offset={8} 
                      formatter={(val: any) => typeof val === 'number' ? `₹${val.toLocaleString()}` : val}
                    />
                    {groupedBooks.map((_, index) => (
                      <Cell key={`cell-rev-${index}`} fill="#10b981" />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* High-Contrast Vibrant Data Table */}
      <div className="dash-panel overflow-hidden mb-7">
        <div className="dash-panel-header">
          <h2 className="dash-panel-title">Book Performance Details</h2>
          <div className="flex items-center gap-4">
            <span className="dash-badge info">{groupedBooks.length} books</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="dash-table">
            <thead className="bg-indigo-50 border-b-2 border-indigo-100">
              <tr>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-left w-10"></th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-left">Book Title</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-center">Channels Participated</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-center">Total Units Sold</th>
                <th className="!text-[14px] !text-indigo-800 !bg-transparent text-right">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {groupedBooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-paa-gray-text italic text-sm">
                    No Book Fair performance data available.
                  </td>
                </tr>
              ) : (
                groupedBooks.map((group, index) => (
                  <React.Fragment key={group.title}>
                    <tr onClick={() => toggleBook(group.title)} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'}  cursor-pointer`}>
                      <td className="text-center text-indigo-600 pl-4">
                        {expandedBooks[group.title] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                      <td className="font-semibold text-paa-navy whitespace-normal py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-black uppercase tracking-wider ${getBadgeColor(group.title)}`}>
                          {group.title}
                        </span>
                      </td>
                      <td className="font-bold text-gray-700 text-center">
                        {group.events.length} Channels
                      </td>
                      <td className="font-bold text-indigo-600 text-center text-lg">
                        {group.totalSold}
                      </td>
                      <td className="font-black text-emerald-600 text-right text-xl pr-4">
                        ₹{group.totalRev.toLocaleString()}
                      </td>
                    </tr>
                    {expandedBooks[group.title] && (
                      <tr className="bg-indigo-50/30">
                        <td></td>
                        <td colSpan={4} className="p-0 border-b border-indigo-100">
                          <div className="py-4 pr-4 pl-0">
                            <table className="w-full text-sm rounded-lg overflow-hidden border border-indigo-100/50 bg-white">
                              <thead className="text-indigo-900 bg-indigo-50/50 text-[10px] uppercase tracking-widest border-b border-indigo-100/50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-bold">Channel Name</th>
                                  <th className="text-center py-2 px-3 font-bold">Date</th>
                                  <th className="text-center py-2 px-3 font-bold">Units Sold</th>
                                  <th className="text-right py-2 px-3 font-bold">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.events.map((ev, i) => (
                                  <tr key={i} className="border-b border-indigo-50 last:border-0 hover:bg-indigo-50/20 transition-colors">
                                    <td className="py-2.5 px-3 font-semibold text-gray-700">{ev.eventName}</td>
                                    <td className="py-2.5 px-3 text-center text-gray-500 font-medium">{ev.eventName === 'Web Orders' ? 'Ongoing' : new Date(ev.date).toLocaleDateString()}</td>
                                    <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{ev.booksSold}</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₹{ev.revenue.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default BookPerformance;
