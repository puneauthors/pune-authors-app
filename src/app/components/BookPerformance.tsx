import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BookOpen, Activity, BarChart2, Download } from 'lucide-react';
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
  if (title === 'Manual Aggregation' || title === 'No Sales Yet') return 'bg-gray-100 text-gray-700 border-gray-300';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-pink-100 text-pink-800 border-pink-300',
    'bg-blue-100 text-blue-800 border-blue-300',
    'bg-amber-100 text-amber-800 border-amber-300',
    'bg-emerald-100 text-emerald-800 border-emerald-300',
    'bg-purple-100 text-purple-800 border-purple-300',
    'bg-indigo-100 text-indigo-800 border-indigo-300',
    'bg-rose-100 text-rose-800 border-rose-300',
    'bg-cyan-100 text-cyan-800 border-cyan-300'
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

  // Dynamic Unique Event / Channel Columns
  const dynamicEventColumns = React.useMemo(() => {
    const map = new Map<string, { eventId: number; eventName: string; date: string }>();
    filteredData.forEach(row => {
      if (!map.has(row.eventName)) {
        map.set(row.eventName, { eventId: row.eventId, eventName: row.eventName, date: row.date });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.eventName === 'Web Orders') return 1;
      if (b.eventName === 'Web Orders') return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [filteredData]);

  // Group data by book for graph and Excel matrix table
  const groupedBooks = React.useMemo(() => {
    const map: Record<string, { 
      title: string; 
      totalSold: number; 
      totalRev: number; 
      eventSales: Record<string, { sold: number; rev: number; date: string }>;
      events: PerformanceData[];
    }> = {};
    
    filteredData.forEach(row => {
      if (row.bookTitle === 'No Sales Yet') return;
      if (!map[row.bookTitle]) {
        map[row.bookTitle] = { title: row.bookTitle, totalSold: 0, totalRev: 0, eventSales: {}, events: [] };
      }
      map[row.bookTitle].totalSold += row.booksSold;
      map[row.bookTitle].totalRev += row.revenue;
      map[row.bookTitle].events.push(row);

      if (!map[row.bookTitle].eventSales[row.eventName]) {
        map[row.bookTitle].eventSales[row.eventName] = { sold: 0, rev: 0, date: row.date };
      }
      map[row.bookTitle].eventSales[row.eventName].sold += row.booksSold;
      map[row.bookTitle].eventSales[row.eventName].rev += row.revenue;
    });

    return Object.values(map).sort((a, b) => b.totalSold - a.totalSold);
  }, [filteredData]);

  // Group data by channel / event for graph
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

  // Grand totals
  const grandTotalSold = groupedBooks.reduce((sum, b) => sum + b.totalSold, 0);
  const grandTotalRev = groupedBooks.reduce((sum, b) => sum + b.totalRev, 0);

  // CSV Export for Excel
  const exportTableToCSV = () => {
    if (groupedBooks.length === 0) {
      toast.error('No data available to export');
      return;
    }
    const headers = [
      'S.No',
      'Book Title',
      ...dynamicEventColumns.map(e => `"${e.eventName} (Units)"`),
      ...dynamicEventColumns.map(e => `"${e.eventName} (Revenue INR)"`),
      'Total Units Sold',
      'Total Revenue (INR)'
    ];

    const rows = groupedBooks.map((b, idx) => [
      idx + 1,
      `"${b.title.replace(/"/g, '""')}"`,
      ...dynamicEventColumns.map(e => b.eventSales[e.eventName]?.sold || 0),
      ...dynamicEventColumns.map(e => b.eventSales[e.eventName]?.rev || 0),
      b.totalSold,
      b.totalRev
    ]);

    const totalRow = [
      '',
      '"TOTAL"',
      ...dynamicEventColumns.map(e => groupedBooks.reduce((sum, b) => sum + (b.eventSales[e.eventName]?.sold || 0), 0)),
      ...dynamicEventColumns.map(e => groupedBooks.reduce((sum, b) => sum + (b.eventSales[e.eventName]?.rev || 0), 0)),
      grandTotalSold,
      grandTotalRev
    ];

    const csvContent = [headers.join(','), ...rows.map(r => r.join(',')), totalRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `book_performance_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel CSV downloaded successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="mb-5 flex flex-col md:flex-row justify-between md:items-end gap-3">
        <div>
          <h2 className="text-2xl font-serif text-paa-navy font-bold tracking-tight mb-1">Book Performance</h2>
          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Analyze your ROI strictly by Book Title</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select 
            className="form-select text-xs rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm py-1.5"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'all' | 'year' | 'month')}
          >
            <option value="year">Year Wise</option>
            <option value="month">Month Wise</option>
            <option value="all">All Time</option>
          </select>
          
          {(timeframe === 'year' || timeframe === 'month') && (
            <select
              className="form-select text-xs rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm py-1.5"
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
              className="form-select text-xs rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 font-medium text-gray-700 bg-white shadow-sm py-1.5"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <div className="bg-[#2ecc71] rounded-xl p-3.5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Sales Channels</p>
          </div>
          <h3 className="text-2xl font-black">{totalFairs}</h3>
        </div>
        
        <div className="bg-[#a55eea] rounded-xl p-3.5 shadow-sm text-white flex flex-col justify-center relative group">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Total Investment</p>
          </div>
          <h3 className="text-2xl font-black">₹{totalInvestment.toLocaleString()}</h3>
        </div>

        <div className="bg-[#4b7bec] rounded-xl p-3.5 shadow-sm text-white flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Total Revenue</p>
          </div>
          <h3 className="text-2xl font-black">₹{totalRevenue.toLocaleString()}</h3>
        </div>

        <div className={`rounded-xl p-3.5 shadow-sm text-white flex flex-col justify-center ${parseFloat(netROI) >= 0 ? 'bg-[#20bf6b]' : 'bg-[#eb3b5a]'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Net ROI</p>
          </div>
          <h3 className="text-2xl font-black">
            {parseFloat(netROI) > 0 && '+'}{netROI}%
          </h3>
        </div>
      </div>

      {/* Simple, Easy-to-Interpret Sales Performance Graph */}
      <div className="dash-panel p-5 mb-5">
        <div className="mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-paa-navy uppercase tracking-widest">
                {chartTab === 'book' && 'Sales by Book'}
                {chartTab === 'channel' && 'Sales by Channel / Fair'}
                {chartTab === 'revenue' && 'Revenue by Book'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {chartTab === 'book' && 'Direct comparison of units sold across your titles'}
              {chartTab === 'channel' && 'Direct comparison of total units sold at each event/platform'}
              {chartTab === 'revenue' && 'Total earnings (₹) generated by each book'}
            </p>
          </div>

          {/* Simple View Switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setChartTab('book')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
        <div className="h-[220px] w-full pt-1">
          {((chartTab === 'book' || chartTab === 'revenue') && groupedBooks.length === 0) || (chartTab === 'channel' && groupedChannels.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
              <BookOpen size={28} className="mb-1.5 opacity-40" />
              <span>No sales data found for the selected time period.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'book' ? (
                <BarChart data={groupedBooks} margin={{ top: 20, right: 15, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="title" 
                    fontSize={10} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 16 ? val.substring(0, 14) + '…' : val}
                  />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[170px]">
                            <p className="font-bold text-gray-900 mb-1.5 border-b pb-1">{item.title}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-xs">{item.totalSold} copies</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Total Revenue:</span>
                              <span className="font-black text-emerald-600 text-xs">₹{item.totalRev.toLocaleString()}</span>
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
                  <Bar dataKey="totalSold" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="totalSold" position="top" fill="#1e293b" fontSize={11} fontWeight={800} offset={6} />
                    {groupedBooks.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={bookColors[index % bookColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartTab === 'channel' ? (
                <BarChart data={groupedChannels} margin={{ top: 20, right: 15, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 16 ? val.substring(0, 14) + '…' : val}
                  />
                  <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[170px]">
                            <p className="font-bold text-gray-900 mb-1.5 border-b pb-1">{item.name}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-xs">{item.totalSold} copies</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Revenue:</span>
                              <span className="font-black text-emerald-600 text-xs">₹{item.totalRev.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalSold" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="totalSold" position="top" fill="#1e293b" fontSize={11} fontWeight={800} offset={6} />
                    {groupedChannels.map((_, index) => (
                      <Cell key={`cell-ch-${index}`} fill={bookColors[index % bookColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={groupedBooks} margin={{ top: 20, right: 15, left: 5, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="title" 
                    fontSize={10} 
                    tick={{ fill: '#475569', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    tickFormatter={(val: string) => val.length > 16 ? val.substring(0, 14) + '…' : val}
                  />
                  <YAxis 
                    fontSize={10} 
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
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xl text-xs min-w-[170px]">
                            <p className="font-bold text-gray-900 mb-1.5 border-b pb-1">{item.title}</p>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Revenue:</span>
                              <span className="font-black text-emerald-600 text-xs">₹{item.totalRev.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-gray-500">Units Sold:</span>
                              <span className="font-black text-indigo-600 text-xs">{item.totalSold} copies</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalRev" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    <LabelList 
                      dataKey="totalRev" 
                      position="top" 
                      fill="#059669" 
                      fontSize={11} 
                      fontWeight={800} 
                      offset={6} 
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

      {/* Excel-Style Spreadsheet Matrix Table */}
      <div className="dash-panel p-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div>
            <h2 className="text-base font-serif font-bold text-paa-navy">Book Performance Matrix</h2>
            <p className="text-[11px] text-gray-500">Excel-style breakdown showing units sold across all channels dynamically</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {groupedBooks.length} Books
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {dynamicEventColumns.length} Events/Channels
            </span>
            <button
              onClick={exportTableToCSV}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#107c41] hover:bg-[#0c5c30] text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Download as Excel CSV"
            >
              <Download size={13} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto border border-black rounded-lg shadow-sm bg-white">
          <table className="min-w-full w-max border-collapse text-xs">
            <thead>
              <tr className="bg-[#ffd700] text-black">
                <th className="border border-black px-2.5 py-2 font-extrabold text-center uppercase tracking-wider w-10 min-w-[42px] whitespace-nowrap text-[11px]">
                  S.No
                </th>
                <th className="border border-black px-3 py-2 font-extrabold text-left uppercase tracking-wider min-w-[160px] whitespace-nowrap text-[11px]">
                  Book Title
                </th>
                {dynamicEventColumns.map((col) => (
                  <th key={col.eventName} className="border border-black px-3 py-2 font-extrabold text-center uppercase tracking-wider min-w-[115px] whitespace-nowrap text-[11px]">
                    <div className="font-extrabold">{col.eventName}</div>
                    <div className="text-[9px] font-semibold text-gray-800 opacity-90 normal-case mt-0.5">
                      {col.eventName === 'Web Orders' ? 'Ongoing' : new Date(col.date).toLocaleDateString()}
                    </div>
                  </th>
                ))}
                <th className="border border-black px-3 py-2 font-black text-center uppercase tracking-wider min-w-[110px] bg-[#ffe135] whitespace-nowrap text-[11px]">
                  Total Units Sold
                </th>
                <th className="border border-black px-3 py-2 font-black text-right uppercase tracking-wider min-w-[120px] bg-[#ffe135] whitespace-nowrap text-[11px]">
                  Total Revenue (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedBooks.length === 0 ? (
                <tr>
                  <td colSpan={dynamicEventColumns.length + 4} className="border border-black text-center py-8 text-gray-400 italic text-xs">
                    No sales data available for the selected timeframe.
                  </td>
                </tr>
              ) : (
                <>
                  {groupedBooks.map((group, index) => (
                    <tr key={group.title} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} hover:bg-yellow-50/70`}>
                      <td className="border border-black px-2 py-1.5 font-bold text-center text-gray-700 text-xs">
                        {index + 1}
                      </td>
                      <td className="border border-black px-3 py-1.5 font-bold text-paa-navy whitespace-normal">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wide ${getBadgeColor(group.title)}`}>
                          {group.title}
                        </span>
                      </td>
                      {dynamicEventColumns.map((col) => {
                        const sale = group.eventSales[col.eventName];
                        return (
                          <td key={col.eventName} className="border border-black px-2.5 py-1.5 text-center">
                            {sale && sale.sold > 0 ? (
                              <div className="font-bold text-gray-900 leading-tight">
                                <span className="text-xs text-indigo-700 font-black">{sale.sold}</span>
                                <span className="block text-[9px] text-emerald-600 font-bold">₹{sale.rev.toLocaleString()}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-semibold">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-black px-3 py-1.5 text-center bg-indigo-50/40">
                        <span className="font-black text-indigo-700 text-xs">
                          {group.totalSold}
                        </span>
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right bg-emerald-50/40">
                        <span className="font-black text-emerald-700 text-xs">
                          ₹{group.totalRev.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Summary / Total Row */}
                  <tr className="bg-[#fff3b0] font-black border-t-2 border-black">
                    <td className="border border-black px-2 py-2 text-center text-black font-extrabold text-xs">
                      -
                    </td>
                    <td className="border border-black px-3 py-2 font-black text-black tracking-wider uppercase text-xs">
                      TOTAL
                    </td>
                    {dynamicEventColumns.map((col) => {
                      const colSold = groupedBooks.reduce((sum, b) => sum + (b.eventSales[col.eventName]?.sold || 0), 0);
                      const colRev = groupedBooks.reduce((sum, b) => sum + (b.eventSales[col.eventName]?.rev || 0), 0);
                      return (
                        <td key={col.eventName} className="border border-black px-2.5 py-2 text-center">
                          <div className="font-black text-black leading-tight">
                            <span className="text-xs font-black">{colSold}</span>
                            <span className="block text-[9px] text-emerald-800 font-black">₹{colRev.toLocaleString()}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-black px-3 py-2 text-center bg-[#ffe66d] text-indigo-900 font-black text-sm">
                      {grandTotalSold}
                    </td>
                    <td className="border border-black px-3 py-2 text-right bg-[#ffe66d] text-emerald-900 font-black text-sm">
                      ₹{grandTotalRev.toLocaleString()}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default BookPerformance;
