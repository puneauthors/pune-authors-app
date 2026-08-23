import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Download, Activity, DollarSign, BookOpen, ShoppingCart, ChevronDown, ChevronRight, ChevronUp, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, 
  Tooltip as RechartsTooltip, LabelList, Cell 
} from 'recharts';

export const SalesReportTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [filterType, setFilterType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonthValue, setSelectedMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const [salesData, setSalesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevStartDate = useRef('');
  const prevEndDate = useRef('');
  const hasLoadedInitialData = useRef(false);
  const [tableChannelFilter, setTableChannelFilter] = useState('All');
  const [kpiGenreFilter, setKpiGenreFilter] = useState('All');
  const [kpiSubGenreFilter, setKpiSubGenreFilter] = useState('All');
  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    setKpiSubGenreFilter('All');
  }, [kpiGenreFilter]);

  useEffect(() => {
    if (filterType === 'custom') return;
    const today = new Date();
    let end = new Date(today);
    let start = new Date(today);

    if (filterType === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filterType === 'weekly') {
      start.setDate(today.getDate() - 7);
    } else if (filterType === 'monthly') {
      start.setDate(today.getDate() - 30);
    } else if (filterType === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filterType === 'ytd') {
      start = new Date(today.getFullYear(), 0, 1);
    } else if (filterType === 'select_month') {
      if (selectedMonthValue) {
        const [yyyy, mm] = selectedMonthValue.split('-');
        start = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
        end = new Date(parseInt(yyyy), parseInt(mm), 0);
      } else {
        return;
      }
    } else if (filterType === 'lifetime') {
      start = new Date('2000-01-01');
      end = new Date('2099-12-31');
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [filterType, selectedMonthValue]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let isMounted = true;

    const isDateChange = startDate !== prevStartDate.current || endDate !== prevEndDate.current;
    prevStartDate.current = startDate;
    prevEndDate.current = endDate;

    const fetchSalesData = async () => {
      const needsLoadingState = isDateChange || !hasLoadedInitialData.current;
      if (needsLoadingState) setIsLoading(true);
      try {
        const res = await axios.get(`${API}/api/admin/sales-report?startDate=${startDate}&endDate=${endDate}&filterType=${filterType}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (isMounted) {
          setSalesData(res.data);
          hasLoadedInitialData.current = true;
        }
      } catch (err) {
        if (isMounted && needsLoadingState) toast.error('Failed to load sales report');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchSalesData();
    return () => { isMounted = false; };
  }, [startDate, endDate, API, refreshTrigger]);

  const handleExport = async () => {
    if (!salesData?.tableData?.length) return;
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');
    
    // Add merged title row
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `SALES REPORT (${startDate} to ${endDate})`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2A4B6B' } }; // Deep Steel Blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;
    
    // Add headers (Bright Yellow with Black Text)
    const headers = ['Date', 'Order ID', 'Channel', 'Event', 'Author', 'Title', 'Quantity', 'Revenue'];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: '000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Bright Yellow
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    });
    
    // Add data
    salesData.tableData.forEach((r: any) => {
      const rowData = [
        r.date,
        r.orderId,
        r.channel,
        r.event,
        r.author,
        r.title,
        r.qty,
        r.revenue
      ];
      const newRow = sheet.addRow(rowData);
      newRow.height = 20;

      newRow.eachCell((cell, colNumber) => {
        // Border (Thin Black)
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };

        cell.font = { name: 'Arial', size: 10, color: { argb: '000000' } };

        // Alignments
        if (colNumber === 1 || colNumber === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Column Background Colors
        let colBgColor = 'FFFFFF';
        if (colNumber === 1) colBgColor = 'FF8B8B'; // Solid light red
        else if (colNumber === 2) colBgColor = 'FFD2A3'; // Solid light orange
        else if (colNumber === 3) colBgColor = 'D4D8DD'; // Solid light gray/slate
        else if (colNumber === 4) colBgColor = 'FFDCA8'; // Solid light orange/peach
        else if (colNumber === 5) colBgColor = 'B3E5FC'; // Solid light cyan
        else if (colNumber === 6) colBgColor = 'C7D2FE'; // Solid light lavender
        else if (colNumber === 7) colBgColor = 'C8E6C9'; // Solid light green
        else if (colNumber === 8) colBgColor = 'E1BEE7'; // Solid light purple

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colBgColor } };
      });
    });
    
    // Auto-fit columns
    sheet.columns.forEach((column, colIndex) => {
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value) { // Skip title row
          const len = cell.value.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      if (colIndex === 6) {
        column.width = Math.min(maxLen + 4, 30);
      } else {
        column.width = Math.min(maxLen + 4, 45);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `sales_report_${startDate}_to_${endDate}.xlsx`);
  };

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group tableData by Place / Event / Order ID for true single-place cumulative view
  const groupedTableData = useMemo(() => {
    if (!salesData?.tableData) return [];
    const groupsMap = new Map<string, {
      key: string;
      date: string;
      dates: string[];
      orderId: string;
      channel: string;
      event: string;
      totalQty: number;
      totalRevenue: number;
      items: any[];
      uniqueAuthors: string[];
    }>();

    salesData.tableData.forEach((row: any) => {
      const placeOrOrderId = row.orderId || row.event || 'Unknown';
      const groupKey = `${row.channel}_${placeOrOrderId}`;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          date: row.date,
          dates: [row.date],
          orderId: placeOrOrderId,
          channel: row.channel,
          event: row.event || placeOrOrderId,
          totalQty: 0,
          totalRevenue: 0,
          items: [],
          uniqueAuthors: []
        });
      }
      const g = groupsMap.get(groupKey)!;
      g.totalQty += (row.qty || 0);
      g.totalRevenue += (row.revenue || 0);
      if (row.date && !g.dates.includes(row.date)) {
        g.dates.push(row.date);
      }
      g.dates.sort();
      g.date = g.dates.length > 1 ? `${g.dates[0]} ~ ${g.dates[g.dates.length - 1]}` : g.dates[0];

      g.items.push(row);
      if (row.author && !g.uniqueAuthors.includes(row.author)) {
        g.uniqueAuthors.push(row.author);
      }
    });

    return Array.from(groupsMap.values());
  }, [salesData?.tableData]);

  const filteredGroupedData = useMemo(() => {
    return groupedTableData.filter((g: any) => tableChannelFilter === 'All' || g.channel === tableChannelFilter);
  }, [groupedTableData, tableChannelFilter]);

  const channelCounts = useMemo(() => {
    return {
      All: groupedTableData.length,
      'Web Orders': groupedTableData.filter((g: any) => g.channel === 'Web Orders').length,
      'Events': groupedTableData.filter((g: any) => g.channel === 'Events').length,
      'Book Fairs': groupedTableData.filter((g: any) => g.channel === 'Book Fairs').length,
    };
  }, [groupedTableData]);

  const toggleAllRows = () => {
    if (expandedRows.size === filteredGroupedData.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(filteredGroupedData.map(g => g.key)));
    }
  };

  const uniqueGenres = useMemo(() => {
    if (!salesData?.tableData) return ['All'];
    const genres = Array.from(new Set(salesData.tableData.map((r: any) => r.genre).filter((g: any) => g && g !== '-')));
    return ['All', ...genres.sort() as string[]];
  }, [salesData?.tableData]);

  const kpiUniqueSubGenres = useMemo(() => {
    if (!salesData?.tableData) return ['All'];
    let filtered = salesData.tableData;
    if (kpiGenreFilter !== 'All') {
      filtered = filtered.filter((r: any) => r.genre === kpiGenreFilter);
    }
    const subGenres = Array.from(new Set(filtered.map((r: any) => r.subGenre).filter((s: any) => s && s !== '-')));
    return ['All', ...subGenres.sort() as string[]];
  }, [salesData?.tableData, kpiGenreFilter]);

  const kpiStats = useMemo(() => {
    let books = 0;
    let revenue = 0;
    let channels = { 'Web Orders': 0, 'Events': 0, 'Book Fairs': 0 };

    if (!salesData?.tableData) return { books, revenue, channels };

    salesData.tableData.forEach((r: any) => {
      const genreMatch = kpiGenreFilter === 'All' || r.genre === kpiGenreFilter;
      const subGenreMatch = kpiSubGenreFilter === 'All' || r.subGenre === kpiSubGenreFilter;
      
      if (genreMatch && subGenreMatch) {
        books += (r.qty || 0);
        const rev = (r.revenue || 0);
        revenue += rev;
        if (channels[r.channel as keyof typeof channels] !== undefined) {
          channels[r.channel as keyof typeof channels] += rev;
        }
      }
    });

    return { books, revenue, channels };
  }, [salesData?.tableData, kpiGenreFilter, kpiSubGenreFilter]);

  const channelBarData = useMemo(() => {
    return [
      { name: 'Web', fullName: 'Web Orders', revenue: salesData?.kpis?.splits?.web?.revenue || 0, books: salesData?.kpis?.splits?.web?.books || 0, color: '#3b82f6' },
      { name: 'Events', fullName: 'Events', revenue: salesData?.kpis?.splits?.events?.revenue || 0, books: salesData?.kpis?.splits?.events?.books || 0, color: '#f59e0b' },
      { name: 'Fairs', fullName: 'Book Fairs', revenue: salesData?.kpis?.splits?.bookFairs?.revenue || 0, books: salesData?.kpis?.splits?.bookFairs?.books || 0, color: '#10b981' }
    ];
  }, [salesData?.kpis?.splits]);

  return (
    <div className="space-y-3.5">
      {/* Top Bar: Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3 md:p-3.5 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h3 className="text-base font-serif font-bold text-paa-navy flex items-center gap-2">
            <Activity className="w-4 h-4 text-paa-gold" aria-hidden="true" /> Dynamic Sales Report
          </h3>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Aggregate revenue data instantly across any date range.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
          <label htmlFor="filterType" className="sr-only">Date Range Filter</label>
          <select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold tracking-widest uppercase py-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-paa-navy outline-none focus:border-indigo-500 transition-all w-full sm:w-auto cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="weekly">Weekly (Last 7 Days)</option>
            <option value="monthly">Monthly (Last 30 Days)</option>
            <option value="this_month">This Month</option>
            <option value="ytd">Year to Date (YTD)</option>
            <option value="select_month">Specific Month</option>
            <option value="lifetime">Lifetime (All Time)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filterType === 'select_month' && (
            <div className="flex items-center gap-2 animate-fade-in">
              <label htmlFor="selectMonth" className="sr-only">Select Month</label>
              <input
                id="selectMonth"
                type="month"
                value={selectedMonthValue}
                onChange={(e) => setSelectedMonthValue(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>
          )}

          {filterType === 'custom' && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <label htmlFor="startDate" className="sr-only">Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
              <span className="text-gray-400 font-medium text-xs">to</span>
              <label htmlFor="endDate" className="sr-only">End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold tracking-widest uppercase py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-paa-navy outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button 
            onClick={handleExport} 
            disabled={!salesData?.tableData?.length || isLoading} 
            aria-label="Export Excel Sales Report"
            className="flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-xs hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shrink-0"
          >
            <Download size={13} aria-hidden="true" /> Export Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[100px] bg-white border border-gray-100 rounded-xl shadow-xs p-3.5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="h-6 w-20 bg-gray-100 animate-pulse rounded"></div>
                  <div className="h-6 w-6 bg-gray-100 animate-pulse rounded-lg"></div>
                </div>
                <div className="h-6 w-28 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-3 w-full bg-gray-50 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          {/* Row 1: KPI Summary Cards - Black Text, Larger Font Size */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
            <div className="rounded-xl !p-4 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 relative overflow-hidden bg-[#22c55e] border border-green-600/30" style={{ contentVisibility: 'auto' }}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-black tracking-wider uppercase text-black">Total Revenue</p>
                  <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center text-black shadow-xs"><DollarSign className="w-4.5 h-4.5" aria-hidden="true" /></div>
                </div>
                <h3 className="text-3xl md:text-[34px] font-black text-black tracking-tight leading-tight my-1">₹{(salesData?.kpis?.totalRevenue || 0).toLocaleString()}</h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-3 pt-2.5 border-t border-black/20 flex justify-between text-[11px] md:text-xs font-black uppercase tracking-wider text-black">
                  <span>Web: ₹{(salesData.kpis.splits.web?.revenue || 0).toLocaleString()}</span>
                  <span>Events: ₹{(salesData.kpis.splits.events?.revenue || 0).toLocaleString()}</span>
                  <span>Fairs: ₹{(salesData.kpis.splits.bookFairs?.revenue || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl !p-4 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 relative overflow-hidden bg-[#3b82f6] border border-blue-600/30" style={{ contentVisibility: 'auto' }}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-black tracking-wider uppercase text-black">Total Books Sold</p>
                  <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center text-black shadow-xs"><BookOpen className="w-4.5 h-4.5" aria-hidden="true" /></div>
                </div>
                <h3 className="text-3xl md:text-[34px] font-black text-black tracking-tight leading-tight my-1">{salesData?.kpis?.totalBooksSold || 0} <span className="text-sm font-bold text-black/80 lowercase tracking-normal">units</span></h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-3 pt-2.5 border-t border-black/20 flex justify-between text-[11px] md:text-xs font-black uppercase tracking-wider text-black">
                  <span>Web: {salesData.kpis.splits.web?.books || 0}</span>
                  <span>Events: {salesData.kpis.splits.events?.books || 0}</span>
                  <span>Fairs: {salesData.kpis.splits.bookFairs?.books || 0}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl !p-4 shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 relative overflow-hidden bg-[#f97316] border border-orange-600/30" style={{ contentVisibility: 'auto' }}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-black tracking-wider uppercase text-black">Total Entries</p>
                  <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center text-black shadow-xs"><ShoppingCart className="w-4.5 h-4.5" aria-hidden="true" /></div>
                </div>
                <h3 className="text-3xl md:text-[34px] font-black text-black tracking-tight leading-tight my-1">{salesData?.kpis?.totalOrders || 0}</h3>
              </div>
              {salesData?.kpis?.splits && (
                <div className="mt-3 pt-2.5 border-t border-black/20 flex justify-between text-[11px] md:text-xs font-black uppercase tracking-wider text-black">
                  <span>Web: {salesData.kpis.splits.web?.orders || 0}</span>
                  <span>Events: {salesData.kpis.splits.events?.orders || 0}</span>
                  <span>Fairs: {salesData.kpis.splits.bookFairs?.orders || 0}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Visualizations - With rich background styling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 relative">
            <div className="border border-indigo-100 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/60 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-2.5">Genre Insights</h4>
                <div className="flex flex-col sm:flex-row gap-2 mb-3.5">
                  <select 
                    value={kpiGenreFilter} 
                    onChange={e => setKpiGenreFilter(e.target.value)} 
                    className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-paa-navy border border-indigo-200/80 outline-none focus:border-indigo-500 bg-white shadow-2xs hover:bg-indigo-50/30 transition-colors w-full"
                  >
                    {uniqueGenres.map(g => (
                      <option key={g} value={g}>{g === 'All' ? 'All Genres' : g}</option>
                    ))}
                  </select>
                  
                  {kpiGenreFilter !== 'All' && (
                    <select 
                      value={kpiSubGenreFilter} 
                      onChange={e => setKpiSubGenreFilter(e.target.value)} 
                      className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-paa-navy border border-indigo-200/80 outline-none focus:border-indigo-500 bg-white shadow-2xs hover:bg-indigo-50/30 transition-colors w-full"
                    >
                      {kpiUniqueSubGenres.map(sg => (
                        <option key={sg} value={sg}>{sg === 'All' ? 'All Sub-genres' : sg}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <div className="bg-white/85 backdrop-blur-xs p-3.5 rounded-xl border border-indigo-100/70 shadow-xs mb-3 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Books Sold</p>
                    <p className="text-2xl font-black text-paa-navy leading-none">{kpiStats.books}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Revenue</p>
                    <p className="text-2xl font-black text-indigo-600 leading-none">₹{kpiStats.revenue.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="bg-white/85 backdrop-blur-xs p-3 rounded-xl border border-indigo-100/70 shadow-xs space-y-2">
                  <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">Revenue by Channel</p>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true"></div><span className="text-gray-600 font-bold uppercase tracking-wider text-[10px]">Web</span></div>
                    <span className="text-paa-navy font-bold text-xs">₹{kpiStats.channels['Web Orders'].toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true"></div><span className="text-gray-600 font-bold uppercase tracking-wider text-[10px]">Events</span></div>
                    <span className="text-paa-navy font-bold text-xs">₹{kpiStats.channels['Events'].toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ebd8c0]" aria-hidden="true"></div><span className="text-gray-600 font-bold uppercase tracking-wider text-[10px]">Fairs</span></div>
                    <span className="text-paa-navy font-bold text-xs">₹{kpiStats.channels['Book Fairs'].toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-sky-100 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-slate-50 to-emerald-50/60 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest mb-0.5">Sales by Channel</h4>
                <p className="text-[11px] text-gray-500 mb-2 font-medium">Revenue distribution across sales channels</p>
              </div>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelBarData} margin={{ top: 18, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 600 }}
                      formatter={(value: number, name: string, item: any) => [`₹${value.toLocaleString()} (${item.payload.books} books)`, 'Revenue']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList 
                        dataKey="revenue" 
                        position="top" 
                        formatter={(val: number) => val > 0 ? `₹${val.toLocaleString()}` : '₹0'}
                        style={{ fill: '#0f172a', fontSize: '10px', fontWeight: 800 }}
                      />
                      {channelBarData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white/85 backdrop-blur-xs py-2 px-4 rounded-full border border-sky-100/70 shadow-xs flex justify-center gap-6 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-xs" aria-hidden="true"></div><span className="text-[10px] text-gray-700 font-bold tracking-wide uppercase">Web</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-xs" aria-hidden="true"></div><span className="text-[10px] text-gray-700 font-bold tracking-wide uppercase">Events</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-xs" aria-hidden="true"></div><span className="text-[10px] text-gray-700 font-bold tracking-wide uppercase">Fairs</span></div>
              </div>
            </div>
          </div>

          {/* Row 3: Cumulative & Granular Data Table */}
          <div className="bg-white border border-paa-navy/5 rounded-2xl shadow-sm overflow-hidden relative min-h-[200px]" style={{ contentVisibility: 'auto' }}>
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold text-paa-navy uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> Sales Records & Place Breakdowns
                </h4>
                {filteredGroupedData.length > 0 && (
                  <button
                    onClick={toggleAllRows}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200/60 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {expandedRows.size === filteredGroupedData.length ? (
                      <><ChevronUp size={12} /> Collapse All</>
                    ) : (
                      <><ChevronDown size={12} /> Expand All ({filteredGroupedData.length})</>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Channel Filters">
                {(['All', 'Web Orders', 'Events', 'Book Fairs'] as const).map(ch => {
                  const tabCount = channelCounts[ch];
                  return (
                    <button
                      key={ch}
                      onClick={() => setTableChannelFilter(ch)}
                      aria-pressed={tableChannelFilter === ch}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${tableChannelFilter === ch ? 'bg-paa-navy text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                    >
                      {ch === 'Book Fairs' ? 'Fairs' : ch} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tableChannelFilter === ch ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tabCount}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="dash-table w-full text-left min-w-[950px]">
                <thead className="bg-indigo-50 border-b-2 border-indigo-100">
                  <tr>
                    <th className="w-[4%] px-3 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-center">#</th>
                    <th className="w-[11%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Date</th>
                    <th className="w-[25%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Place / Order ID</th>
                    <th className="w-[10%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Channel</th>
                    <th className="w-[20%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100">Authors & Entries</th>
                    <th className="w-[10%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-center">Breakdown</th>
                    <th className="w-[10%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-right">Total Books</th>
                    <th className="w-[10%] px-4 py-3.5 !text-[13px] font-bold uppercase tracking-widest !text-indigo-800 border-b border-gray-100 text-right">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {!isLoading && filteredGroupedData.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400 font-medium italic">No sales recorded in this period for the selected filter.</td></tr>
                  )}
                  {filteredGroupedData.map((group: any, idx: number) => {
                    const isExpanded = expandedRows.has(group.key);
                    return (
                      <React.Fragment key={group.key}>
                        <tr 
                          onClick={() => toggleRow(group.key)}
                          className={`cursor-pointer transition-all duration-150 select-none ${
                            isExpanded ? 'bg-indigo-50/60 shadow-xs' : idx % 2 === 0 ? 'bg-white' : 'bg-[#ebd8c0]'
                          } hover:bg-slate-200/70`}
                        >
                          <td className="px-3 py-3 text-xs font-bold text-paa-navy text-center">
                            <span className="text-gray-500 font-mono text-[11px] font-bold">{filteredGroupedData.length - idx}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-paa-navy truncate">{group.date}</td>
                          <td className="px-4 py-3 text-xs font-bold text-paa-navy truncate">
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); toggleRow(group.key); }}
                                className="w-5 h-5 rounded-md flex items-center justify-center bg-white/90 border border-gray-300 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-xs shrink-0 cursor-pointer"
                                title={isExpanded ? "Collapse breakdown" : "Expand breakdown"}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <span className="truncate font-semibold" title={group.orderId}>{group.orderId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-xs ${
                              group.channel === 'Web Orders' ? 'bg-[#ebd8c0] text-blue-800 border border-blue-200/50' : 
                              group.channel === 'Events' ? 'bg-amber-100 text-amber-800 border border-amber-200/50' : 
                              'bg-green-100 text-green-800 border border-green-200/50'
                            }`}>
                              {group.channel === 'Web Orders' ? 'Web' : group.channel === 'Events' ? 'Events' : 'Fairs'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 truncate">
                            {group.items.length === 1 ? (
                              <span className="font-medium text-paa-navy truncate" title={group.items[0].author}>{group.items[0].author}</span>
                            ) : (
                              <span className="font-semibold text-indigo-900 bg-indigo-50/90 px-2 py-0.5 rounded-full text-[10px] border border-indigo-200/60">
                                {group.uniqueAuthors.length} Author{group.uniqueAuthors.length !== 1 ? 's' : ''} ({group.items.length} entries)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}>
                              {isExpanded ? 'Hide' : `${group.items.length} item${group.items.length !== 1 ? 's' : ''}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-paa-navy text-right">{group.totalQty.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs font-black text-indigo-600 text-right">₹{group.totalRevenue.toLocaleString()}</td>
                        </tr>

                        {/* Nested Breakdown Sub-Table */}
                        {isExpanded && (
                          <tr className="bg-slate-50/95 border-y-2 border-indigo-200">
                            <td colSpan={8} className="p-0">
                              <div className="py-3.5 px-6 md:px-12 bg-gradient-to-b from-indigo-50/50 via-white to-indigo-50/30 border-l-4 border-indigo-600 animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Itemized Breakdown for {group.orderId} ({group.items.length} line item{group.items.length !== 1 ? 's' : ''})
                                  </span>
                                  <span className="text-[11px] text-gray-600 font-medium">
                                    Subtotal: <strong className="text-paa-navy font-bold">{group.totalQty} units</strong> &bull; <strong className="text-indigo-700 font-black">₹{group.totalRevenue.toLocaleString()}</strong>
                                  </span>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-indigo-100 shadow-xs bg-white">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-indigo-50/80 border-b border-indigo-100 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                                      <tr>
                                        <th className="px-3 py-2 w-[4%] text-center">#</th>
                                        <th className="px-3 py-2 w-[12%]">Date</th>
                                        <th className="px-4 py-2 w-[22%]">Author</th>
                                        <th className="px-4 py-2 w-[34%]">Book Title</th>
                                        <th className="px-4 py-2 w-[14%]">Genre</th>
                                        <th className="px-4 py-2 w-[7%] text-right">Qty</th>
                                        <th className="px-4 py-2 w-[7%] text-right">Rev (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {group.items.map((item: any, subIdx: number) => (
                                        <tr key={subIdx} className="hover:bg-indigo-50/40 transition-colors">
                                          <td className="px-3 py-2 text-center text-gray-400 font-mono text-[11px]">{subIdx + 1}</td>
                                          <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{item.date}</td>
                                          <td className="px-4 py-2 font-semibold text-paa-navy truncate" title={item.author}>{item.author}</td>
                                          <td className="px-4 py-2 text-gray-700 truncate" title={item.title}>{item.title}</td>
                                          <td className="px-4 py-2 text-[11px] text-gray-500">{item.genre || '-'}</td>
                                          <td className="px-4 py-2 font-bold text-paa-navy text-right">{item.qty}</td>
                                          <td className="px-4 py-2 font-bold text-indigo-600 text-right">₹{(item.revenue || 0).toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
