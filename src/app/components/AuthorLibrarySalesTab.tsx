import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Download, 
  BookOpen, 
  IndianRupee, 
  CheckCircle2, 
  RefreshCw,
  MapPin
} from 'lucide-react';

interface AuthorSaleItem {
  id: number;
  libraryId: number;
  bookId: number;
  authorId: number;
  copiesPlaced: number;
  soldStock: number;
  overrideMrp: number | null;
  notes?: string | null;
  library?: {
    id: number;
    name: string;
    type: string;
    city: string;
    state: string;
  };
  book?: {
    id: number;
    title: string;
    mrp: number;
    coverUrl?: string;
  };
}

export function AuthorLibrarySalesTab() {
  const [sales, setSales] = useState<AuthorSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLibraryFilter, setSelectedLibraryFilter] = useState<string>('all');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/author/library-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSales(res.data.sales || []);
      }
    } catch (err: any) {
      console.error('Error fetching author library sales:', err);
      toast.error('Failed to load your library sales');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const uniqueLibraries = useMemo(() => {
    const map = new Map<number, any>();
    sales.forEach(s => { if (s.library && !map.has(s.libraryId)) map.set(s.libraryId, s.library); });
    return Array.from(map.values());
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(item => {
      const matchLib = selectedLibraryFilter === 'all' || item.libraryId.toString() === selectedLibraryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || item.book?.title?.toLowerCase().includes(q) || item.library?.name?.toLowerCase().includes(q) || item.library?.city?.toLowerCase().includes(q);
      return matchLib && matchQuery;
    });
  }, [sales, selectedLibraryFilter, searchQuery]);

  const libraryGroupedSales = useMemo(() => {
    const groupsMap = new Map<number, { library: any; items: AuthorSaleItem[] }>();
    filteredSales.forEach(item => {
      const lId = item.libraryId || 0;
      if (!groupsMap.has(lId)) {
        groupsMap.set(lId, { library: item.library || { name: 'Unknown Library', id: lId, type: '', city: '', state: '' }, items: [] });
      }
      groupsMap.get(lId)!.items.push(item);
    });
    return Array.from(groupsMap.values());
  }, [filteredSales]);

  const metrics = useMemo(() => {
    let totalPlaced = 0, totalSold = 0, totalRevenue = 0;
    const librarySet = new Set<number>();
    sales.forEach(s => {
      const mrp = s.overrideMrp || s.book?.mrp || 0;
      const placed = s.copiesPlaced || 0;
      const sold = s.soldStock || 0;
      totalPlaced += placed; totalSold += sold; totalRevenue += sold * mrp;
      if (s.libraryId) librarySet.add(s.libraryId);
    });
    return { totalPlaced, totalSold, totalRevenue, totalRemaining: Math.max(0, totalPlaced - totalSold), uniqueLibraries: librarySet.size };
  }, [sales]);

  const handleDownloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('My Library Sales');

      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'MY LIBRARY BOOK SALES REPORT';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D8F5' } };
      worksheet.getRow(1).height = 30;

      worksheet.addRow([]);
      worksheet.addRow(['Report Date:', new Date().toLocaleDateString('en-GB'), '', 'Active Libraries:', metrics.uniqueLibraries]);
      worksheet.addRow(['Total Books Sold:', metrics.totalSold, '', 'Total Revenue (INR):', metrics.totalRevenue]);
      worksheet.addRow([]);
      for (let r = 3; r <= 4; r++) { worksheet.getRow(r).font = { bold: true }; }

      const headers = ['S.No', 'Book Title', 'MRP (INR)', 'Library Name', 'City / Type', 'Copies Sold', 'Revenue (INR)'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE600' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
      });

      let sNo = 1;
      filteredSales.forEach(sale => {
        const mrp = sale.overrideMrp || sale.book?.mrp || 0;
        const placed = sale.copiesPlaced || 0;
        const sold = sale.soldStock || 0;
        const revenue = sold * mrp;
        const remaining = Math.max(0, placed - sold);
        const row = worksheet.addRow([sNo++, sale.book?.title || 'Unknown', mrp, sale.library?.name || 'Library', `${sale.library?.city || ''} (${sale.library?.type || ''})`, sold, revenue]);
        row.eachCell(cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        [1, 3, 5, 6, 7].forEach(c => { row.getCell(c).alignment = { horizontal: 'center' }; });
        row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
      });

      const grandRow = worksheet.addRow(['GRAND TOTAL', '', '', '', '', metrics.totalSold, metrics.totalRevenue]);
      worksheet.mergeCells(`A${grandRow.number}:E${grandRow.number}`);
      grandRow.height = 24;
      grandRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE600' } };
        cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      worksheet.columns.forEach((col: any) => {
        let maxLen = 14;
        col.eachCell({ includeEmpty: true }, (cell: any) => { const val = cell.value ? cell.value.toString() : ''; if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35); });
        col.width = maxLen;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `My_Library_Sales_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Excel sheet downloaded successfully!');
    } catch (err) {
      console.error('Error generating Excel:', err);
      toast.error('Failed to generate Excel sheet');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-premium">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center font-black">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-paa-navy tracking-tight flex items-center gap-2">
              My Library Sales
              <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">Book Sales Tracker</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              View your books' placement and actual sales across Airport Flybraries and Public Libraries. Data is managed by the admin.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchData} disabled={isRefreshing} className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleDownloadExcel} className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all">
            <Download className="w-4 h-4" /> Download Excel
          </button>
        </div>
      </div>

      {/* Colorful KPI Cards — 3 cards only: Libraries, Sold, Revenue */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Libraries</span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-white">{metrics.uniqueLibraries}</div>
            <div className="text-[11px] text-indigo-100 font-bold mt-0.5">Active Libraries</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Sold</span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-white">{metrics.totalSold}</div>
            <div className="text-[11px] text-emerald-100 font-bold mt-0.5">Copies Sold</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-white" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">&#8377;{metrics.totalRevenue.toLocaleString()}</div>
            <div className="text-[11px] text-amber-100 font-bold mt-0.5">Direct Sales Value</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-700">Filter Library:</label>
          <select value={selectedLibraryFilter} onChange={e => setSelectedLibraryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500">
            <option value="all">All Libraries ({uniqueLibraries.length})</option>
            {uniqueLibraries.map(l => (<option key={l.id} value={l.id.toString()}>{l.name} ({l.city})</option>))}
          </select>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Search book title or library..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium" />
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-medium">
        <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <span>This table is managed by the admin. Copies placed, copies sold, revenue and shelf notes are entered by the Pune Authors Association admin team based on actual library records. Contact the admin if you see any discrepancy.</span>
      </div>

      {/* EVENT-STYLE EXCEL TABLE */}
      <div className="flex flex-col border-[2px] border-black shadow-md overflow-hidden bg-white">
        {/* Cyan Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#00D8F5] p-2.5 border-b-[2px] border-black">
          <h2 className="text-black uppercase text-xs sm:text-[13px] m-0 tracking-wide font-black">
            MY LIBRARY SALES SHEET &mdash; {libraryGroupedSales.length} LIBRAR{libraryGroupedSales.length === 1 ? 'Y' : 'IES'} ({filteredSales.length} TITLES)
          </h2>
          <span className="text-xs text-black font-black uppercase bg-white/90 px-2.5 py-1 rounded border-[1.5px] border-black">
            TOTAL REVENUE: &#8377;{metrics.totalRevenue.toLocaleString()}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-sans border-collapse whitespace-nowrap">
            <thead>
              <tr>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-10 text-center font-black text-black">S.No</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-52 text-left px-2 font-black text-black">Book Title</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-20 text-center font-black text-black">MRP (&#8377;)</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-44 text-left px-2 font-black text-black">Library Name</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center font-black text-black">Copies<br/>Sold</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center font-black text-black">Revenue (&#8377;)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center border-[1.5px] border-black">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                      <span className="text-xs font-bold text-gray-500">Loading your library sales...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500 italic border-[1.5px] border-black">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-8 h-8 text-gray-300" />
                      <span className="font-semibold">No library sales records found for your books yet.</span>
                      <span className="text-[11px] text-gray-400">Contact the admin to add your books to a library's sales sheet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                libraryGroupedSales.map((group, gIdx) => {
                  const groupRevenue = group.items.reduce((sum, s) => { const mrp = s.overrideMrp || s.book?.mrp || 0; return sum + (s.soldStock || 0) * mrp; }, 0);
                  const groupPlaced = group.items.reduce((sum, s) => sum + (s.copiesPlaced || 0), 0);
                  const groupSold = group.items.reduce((sum, s) => sum + (s.soldStock || 0), 0);
                  let globalIdx = 0;
                  for (let i = 0; i < gIdx; i++) { globalIdx += libraryGroupedSales[i].items.length; }

                  return [
                    <tr key={`lib-header-${group.library.id}`}>
                      <td colSpan={6} className="border-[1.5px] border-black bg-indigo-600 text-white p-2 px-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-200 flex-shrink-0" />
                            <span className="font-black text-sm tracking-wide">{group.library.name}</span>
                            {group.library.type && (
                              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">{group.library.type}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-indigo-200 font-bold flex-wrap">
                            {group.library.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {group.library.city}{group.library.state ? `, ${group.library.state}` : ''}
                              </span>
                            )}
                            <span className="bg-white/20 px-2 py-0.5 rounded text-white">{group.items.length} title{group.items.length !== 1 ? 's' : ''}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-white font-black">&#8377;{groupRevenue.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>,

                    ...group.items.map((sale, itemIdx) => {
                      const mrp = sale.overrideMrp || sale.book?.mrp || 0;
                      const placed = sale.copiesPlaced || 0;
                      const sold = sale.soldStock || 0;
                      const revenue = sold * mrp;
                      const remaining = Math.max(0, placed - sold);
                      const rowSNo = globalIdx + itemIdx + 1;

                      return (
                        <tr key={sale.id} className="hover:brightness-95 transition-all bg-white">
                          <td className="border-[1.5px] border-black bg-red-600 text-white font-black text-center p-1">{rowSNo}</td>
                          <td className="border-[1.5px] border-black bg-[#ffcccc] text-black font-bold p-1 px-2 truncate max-w-[200px] text-left" title={sale.book?.title}>{sale.book?.title || 'Unknown Title'}</td>
                          <td className="border-[1.5px] border-black bg-[#ffddaa] text-black text-center font-mono font-bold p-1">{mrp}</td>
                          <td className="border-[1.5px] border-black bg-[#00ffff] text-black font-black p-1 px-2 truncate max-w-[170px] text-left" title={group.library.name}>{group.library.name}</td>
                          <td className="border-[1.5px] border-black bg-emerald-100 text-emerald-900 text-center font-black p-1">{sold}</td>
                          <td className="border-[1.5px] border-black bg-[#e6f4ea] text-black text-center font-black p-1">&#8377;{revenue.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ];
                })
              )}

              {/* GRAND TOTAL */}
              {filteredSales.length > 0 && (
                <tr className="bg-[#FFE600] font-black text-black border-t-2 border-black">
                  <td colSpan={4} className="border-[1.5px] border-black text-right p-2 uppercase tracking-widest text-[11px] font-black">GRAND TOTAL</td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-emerald-900 font-black">{metrics.totalSold}</td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">&#8377;{metrics.totalRevenue.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuthorLibrarySalesTab;
