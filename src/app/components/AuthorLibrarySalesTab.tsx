import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Download, 
  Plus, 
  Edit, 
  Save, 
  X, 
  BookOpen, 
  IndianRupee, 
  Package, 
  CheckCircle2, 
  RefreshCw,
  Library as LibraryIcon
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
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [allLibraries, setAllLibraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLibraryFilter, setSelectedLibraryFilter] = useState<string>('all');

  // Inline editing state
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editPlaced, setEditPlaced] = useState<number>(0);
  const [editSold, setEditSold] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Add Book modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLibraryId, setNewLibraryId] = useState<string>('');
  const [newBookId, setNewBookId] = useState<string>('');
  const [newPlaced, setNewPlaced] = useState<number>(0);
  const [newSold, setNewSold] = useState<number>(0);
  const [newNotes, setNewNotes] = useState<string>('');

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
        setMyBooks(res.data.books || []);
        setAllLibraries(res.data.libraries || []);
      }
    } catch (err: any) {
      console.error('Error fetching author library sales:', err);
      toast.error('Failed to load your library sales');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter(item => {
      const matchLib = selectedLibraryFilter === 'all' || item.libraryId.toString() === selectedLibraryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        item.book?.title?.toLowerCase().includes(q) ||
        item.library?.name?.toLowerCase().includes(q) ||
        item.library?.city?.toLowerCase().includes(q);

      return matchLib && matchQuery;
    });
  }, [sales, selectedLibraryFilter, searchQuery]);

  // Overall metrics
  const metrics = useMemo(() => {
    let totalPlaced = 0;
    let totalSold = 0;
    let totalRevenue = 0;
    const librarySet = new Set<number>();

    filteredSales.forEach(s => {
      const mrp = s.overrideMrp || s.book?.mrp || 0;
      const placed = s.copiesPlaced || 0;
      const sold = s.soldStock || 0;
      totalPlaced += placed;
      totalSold += sold;
      totalRevenue += (sold * mrp);

      if (s.libraryId) librarySet.add(s.libraryId);
    });

    return {
      totalPlaced,
      totalSold,
      totalRevenue,
      totalRemaining: Math.max(0, totalPlaced - totalSold),
      uniqueLibraries: librarySet.size
    };
  }, [filteredSales]);

  // Start inline editing
  const startEdit = (sale: AuthorSaleItem) => {
    setEditingSaleId(sale.id);
    setEditPlaced(sale.copiesPlaced || 0);
    setEditSold(sale.soldStock || 0);
  };

  const cancelEdit = () => {
    setEditingSaleId(null);
  };

  // Save inline edit
  const handleSaveRow = async (sale: AuthorSaleItem) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/author/library-sales`,
        {
          libraryId: sale.libraryId,
          bookId: sale.bookId,
          copiesPlaced: editPlaced,
          soldStock: editSold
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Library sales updated successfully');
      setEditingSaleId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new book placement/sale to library
  const handleAddPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibraryId || !newBookId) {
      toast.error('Please select both library and book');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/author/library-sales`,
        {
          libraryId: parseInt(newLibraryId),
          bookId: parseInt(newBookId),
          copiesPlaced: parseInt(newPlaced.toString()) || 0,
          soldStock: parseInt(newSold.toString()) || 0,
          notes: newNotes || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Book placement recorded successfully');
      setShowAddModal(false);
      setNewBookId('');
      setNewNotes('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save placement');
    } finally {
      setIsSaving(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('My Library Sales');

      // Title header
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = "MY LIBRARY BOOK SALES REPORT";
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00D8F5' } // Cyan banner
      };
      worksheet.getRow(1).height = 30;

      // Summary rows
      worksheet.addRow([]);
      worksheet.addRow(['Report Date:', new Date().toLocaleDateString('en-GB')]);
      worksheet.addRow(['Total Books Placed:', metrics.totalPlaced, '', 'Total Books Sold:', metrics.totalSold]);
      worksheet.addRow(['Total Revenue (₹):', `₹${metrics.totalRevenue}`, '', 'Stock Remaining:', metrics.totalRemaining]);
      worksheet.addRow([]);

      for (let r = 3; r <= 5; r++) {
        worksheet.getRow(r).font = { bold: true };
      }

      // Headers
      const headers = [
        'S.No',
        'Book Title',
        'Library',
        'City & Type',
        'MRP (₹)',
        'Copies Placed',
        'Copies Sold',
        'Revenue (₹)'
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE600' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Rows
      filteredSales.forEach((sale, index) => {
        const mrp = sale.overrideMrp || sale.book?.mrp || 0;
        const placed = sale.copiesPlaced || 0;
        const sold = sale.soldStock || 0;
        const revenue = sold * mrp;

        const row = worksheet.addRow([
          index + 1,
          sale.book?.title || 'Unknown Title',
          sale.library?.name || 'Library',
          `${sale.library?.city || ''} (${sale.library?.type || ''})`,
          mrp,
          placed,
          sold,
          revenue
        ]);

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          if (colNumber === 1 || colNumber >= 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // Grand total row
      const grandTotalRow = worksheet.addRow([
        '',
        'GRAND TOTAL',
        '',
        '',
        '',
        metrics.totalPlaced,
        metrics.totalSold,
        metrics.totalRevenue
      ]);

      grandTotalRow.height = 24;
      grandTotalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
        if (colNumber === 2 || colNumber >= 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE600' }
        };
      });

      // Column widths
      worksheet.columns.forEach((col: any) => {
        let maxLen = 14;
        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
        });
        col.width = maxLen;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `My_Library_Sales_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
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
              <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                Book Sales Tracker
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Track copies placed and actual sales across Airport Flybraries and Public Libraries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Placement / Sale
          </button>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Libraries</div>
            <div className="text-xl font-black text-paa-navy">{metrics.uniqueLibraries}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Copies Placed</div>
            <div className="text-xl font-black text-paa-navy">{metrics.totalPlaced}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Copies Sold</div>
            <div className="text-xl font-black text-emerald-600">{metrics.totalSold}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sales Revenue</div>
            <div className="text-xl font-black text-amber-600">₹{metrics.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Library Filter:</label>
            <select
              value={selectedLibraryFilter}
              onChange={e => setSelectedLibraryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Libraries ({allLibraries.length})</option>
              {allLibraries.map(l => (
                <option key={l.id} value={l.id.toString()}>{l.name} ({l.city})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search book title, library, city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium"
          />
        </div>
      </div>

      {/* Yellow Excel Header Table */}
      <div className="border-[2px] border-black shadow-md overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#FFE600] border-b-[2px] border-black text-black font-black uppercase tracking-wider text-[11px]">
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-10 text-center font-black text-black">S.No</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-56 text-left px-2">Book Title</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-44 text-left px-2">Library / Flybrary</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-32 text-left px-2">City / Type</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-20 text-center">MRP (₹)</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Copies<br/>Placed</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Copies<br/>Sold</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-28 text-center">Revenue (₹)</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center border-[1.5px] border-black">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                      <span className="text-xs font-bold text-gray-500">Loading your library sales...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 italic border-[1.5px] border-black">
                    No library sales records found. Click "+ Add Placement / Sale" to record your copies at a library.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const isEditing = editingSaleId === sale.id;
                  const mrp = sale.overrideMrp || sale.book?.mrp || 0;
                  const placed = sale.copiesPlaced || 0;
                  const sold = sale.soldStock || 0;
                  const revenue = sold * mrp;

                  return (
                    <tr key={sale.id} className="hover:brightness-95 transition-all bg-white">
                      {/* S.No */}
                      <td className="border-[1.5px] border-black bg-red-600 text-white font-bold text-center p-1">
                        {idx + 1}
                      </td>

                      {/* Book Title */}
                      <td className="border-[1.5px] border-black bg-[#ffcccc] text-black font-bold p-1 px-2 truncate max-w-[220px] text-left" title={sale.book?.title}>
                        {sale.book?.title || 'Unknown Title'}
                      </td>

                      {/* Library */}
                      <td className="border-[1.5px] border-black bg-purple-100 text-black font-semibold p-1 px-2 truncate max-w-[180px] text-left" title={sale.library?.name}>
                        {sale.library?.name || 'Library'}
                      </td>

                      {/* City / Type */}
                      <td className="border-[1.5px] border-black bg-white text-gray-700 p-1 px-2 text-left">
                        {sale.library?.city} <span className="text-[10px] text-gray-500">({sale.library?.type})</span>
                      </td>

                      {/* MRP */}
                      <td className="border-[1.5px] border-black bg-[#ffddaa] text-black text-center font-mono font-bold p-1">
                        ₹{mrp}
                      </td>

                      {/* Copies Placed */}
                      <td className={`border-[1.5px] border-black text-center font-bold ${isEditing ? 'bg-white p-0' : 'bg-[#ffddaa] p-1 text-black'}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editPlaced}
                            onChange={e => setEditPlaced(parseInt(e.target.value) || 0)}
                            className="w-full h-full p-1 text-center outline-none font-bold bg-white text-black"
                          />
                        ) : (
                          placed
                        )}
                      </td>

                      {/* Copies Sold */}
                      <td className={`border-[1.5px] border-black text-center font-bold ${isEditing ? 'bg-white p-0' : 'bg-emerald-100 p-1 text-emerald-900'}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editSold}
                            onChange={e => setEditSold(parseInt(e.target.value) || 0)}
                            className="w-full h-full p-1 text-center outline-none font-bold bg-white text-black"
                          />
                        ) : (
                          sold
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="border-[1.5px] border-black bg-[#e6f4ea] text-black text-center font-bold p-1">
                        ₹{revenue.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="border-[1.5px] border-black bg-gray-50 p-1 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleSaveRow(sale)}
                              disabled={isSaving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(sale)}
                            className="bg-[#b44d28] hover:bg-[#963c1e] text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Edit className="w-3 h-3" /> Edit Sales
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* GRAND TOTAL */}
              {filteredSales.length > 0 && (
                <tr className="bg-[#FFE600] font-bold text-black border-t-2 border-black">
                  <td colSpan={5} className="border-[1.5px] border-black text-right p-2 uppercase tracking-widest text-[11px]">
                    GRAND TOTAL
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black">
                    {metrics.totalPlaced}
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-emerald-900">
                    {metrics.totalSold}
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">
                    ₹{metrics.totalRevenue.toLocaleString()}
                  </td>
                  <td className="border-[1.5px] border-black bg-[#FFE600]"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PLACEMENT / SALE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Record Library Book Placement</h3>
                  <p className="text-xs text-gray-500">Record your books placed at an Airport Flybrary or Library</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlacement} className="space-y-4 pt-4">
              {/* Library Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Library *</label>
                <select
                  required
                  value={newLibraryId}
                  onChange={e => setNewLibraryId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Library...</option>
                  {allLibraries.map(l => (
                    <option key={l.id} value={l.id.toString()}>{l.name} - {l.city} ({l.type})</option>
                  ))}
                </select>
              </div>

              {/* Book Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select My Book *</label>
                <select
                  required
                  value={newBookId}
                  onChange={e => setNewBookId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Book...</option>
                  {myBooks.map((b: any) => (
                    <option key={b.id} value={b.id.toString()}>{b.title} (MRP: ₹{b.mrp})</option>
                  ))}
                </select>
              </div>

              {/* Copies Placed & Sold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Copies Placed</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPlaced}
                    onChange={e => setNewPlaced(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Copies Sold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newSold}
                    onChange={e => setNewSold(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Shelf number, location details"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorLibrarySalesTab;
