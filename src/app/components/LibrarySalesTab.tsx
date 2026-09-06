import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, 
  Plane, 
  Search, 
  Download, 
  Plus, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  BookOpen, 
  Users, 
  IndianRupee, 
  Package, 
  CheckCircle2, 
  Filter,
  RefreshCw,
  Library as LibraryIcon,
  MapPin,
  Phone,
  User,
  Settings
} from 'lucide-react';

interface LibrarySaleItem {
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
  author?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    penName?: string;
  };
}

export function LibrarySalesTab() {
  const [sales, setSales] = useState<LibrarySaleItem[]>([]);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [platformAuthors, setPlatformAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Single Row Editing state
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editPlaced, setEditPlaced] = useState<number>(0);
  const [editSold, setEditSold] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Add Book modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLibraryId, setNewLibraryId] = useState<string>('');
  const [newAuthorId, setNewAuthorId] = useState<string>('');
  const [newBookId, setNewBookId] = useState<string>('');
  const [newPlaced, setNewPlaced] = useState<number>(10);
  const [newSold, setNewSold] = useState<number>(0);
  const [newOverrideMrp, setNewOverrideMrp] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // Add Library modal state
  const [showAddLibraryModal, setShowAddLibraryModal] = useState(false);
  const [libFormName, setLibFormName] = useState('');
  const [libFormType, setLibFormType] = useState('Airport Library');
  const [libFormCity, setLibFormCity] = useState('');
  const [libFormState, setLibFormState] = useState('');
  const [libFormAirportCode, setLibFormAirportCode] = useState('');
  const [libFormAirportName, setLibFormAirportName] = useState('');
  const [libFormContactPerson, setLibFormContactPerson] = useState('');
  const [libFormContactNumber, setLibFormContactNumber] = useState('');
  const [libFormEmail, setLibFormEmail] = useState('');
  const [libFormShippingAddress, setLibFormShippingAddress] = useState('');
  const [libFormStatus, setLibFormStatus] = useState('Active');
  const [isCreatingLib, setIsCreatingLib] = useState(false);

  // Edit Library modal state
  const [showEditLibraryModal, setShowEditLibraryModal] = useState(false);
  const [editingLibId, setEditingLibId] = useState<number | null>(null);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [salesRes, libsRes, authorsRes] = await Promise.all([
        axios.get(`${API}/api/admin/library-sales`, { headers }),
        axios.get(`${API}/api/admin/library-sales/libraries`, { headers }),
        axios.get(`${API}/api/admin/authors`, { headers }).catch(() => ({ data: { authors: [] } }))
      ]);

      if (salesRes.data.success) {
        setSales(salesRes.data.sales || []);
      }
      if (libsRes.data.success) {
        setLibraries(libsRes.data.libraries || []);
      }
      if (authorsRes.data.authors) {
        setPlatformAuthors(authorsRes.data.authors || []);
      }
    } catch (err: any) {
      console.error('Error fetching library sales data:', err);
      toast.error('Failed to load library sales data');
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
      // Library filter
      if (selectedLibraryId !== 'all' && item.libraryId.toString() !== selectedLibraryId) {
        return false;
      }
      // Library Type filter
      if (typeFilter !== 'all' && item.library?.type !== typeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bookTitle = item.book?.title?.toLowerCase() || '';
        const authorName = item.author?.name?.toLowerCase() || '';
        const authorPen = item.author?.penName?.toLowerCase() || '';
        const libName = item.library?.name?.toLowerCase() || '';
        const libCity = item.library?.city?.toLowerCase() || '';
        return (
          bookTitle.includes(q) ||
          authorName.includes(q) ||
          authorPen.includes(q) ||
          libName.includes(q) ||
          libCity.includes(q)
        );
      }
      return true;
    });
  }, [sales, selectedLibraryId, typeFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalPlaced = 0;
    let totalSold = 0;
    let totalRevenue = 0;
    const authorSet = new Set<number>();
    const librarySet = new Set<number>();

    filteredSales.forEach(s => {
      const mrp = s.overrideMrp || s.book?.mrp || 0;
      const placed = s.copiesPlaced || 0;
      const sold = s.soldStock || 0;
      totalPlaced += placed;
      totalSold += sold;
      totalRevenue += (sold * mrp);

      if (s.authorId) authorSet.add(s.authorId);
      if (s.libraryId) librarySet.add(s.libraryId);
    });

    return {
      totalPlaced,
      totalSold,
      totalRevenue,
      totalRemaining: Math.max(0, totalPlaced - totalSold),
      uniqueAuthors: authorSet.size,
      uniqueLibraries: librarySet.size
    };
  }, [filteredSales]);

  // Selected author books for the Add Book modal
  const selectedAuthorBooks = useMemo(() => {
    if (!newAuthorId) return [];
    const author = platformAuthors.find(a => a.id.toString() === newAuthorId);
    return author?.books?.filter((b: any) => !b.isArchived) || [];
  }, [newAuthorId, platformAuthors]);

  // Start editing a row
  const startEdit = (sale: LibrarySaleItem) => {
    setEditingSaleId(sale.id);
    setEditPlaced(sale.copiesPlaced || 0);
    setEditSold(sale.soldStock || 0);
    setEditMrp(sale.overrideMrp?.toString() || '');
  };

  const cancelEdit = () => {
    setEditingSaleId(null);
  };

  // Save single row edit
  const handleSaveRow = async (saleId: number) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        copiesPlaced: editPlaced,
        soldStock: editSold,
        overrideMrp: editMrp ? parseFloat(editMrp) : null
      };

      await axios.put(`${API}/api/admin/library-sales/${saleId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Library sale updated successfully');
      setEditingSaleId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a sale record
  const handleDeleteRow = async (saleId: number) => {
    if (!window.confirm('Are you sure you want to remove this book from this library sales sheet?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/admin/library-sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Book removed from library sales sheet');
      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to remove record');
    }
  };

  // Add Book to Library
  const handleAddBookToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibraryId || !newAuthorId || !newBookId) {
      toast.error('Please select library, author, and book');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/admin/library-sales`,
        {
          libraryId: parseInt(newLibraryId),
          authorId: parseInt(newAuthorId),
          bookId: parseInt(newBookId),
          copiesPlaced: parseInt(newPlaced.toString()) || 0,
          soldStock: parseInt(newSold.toString()) || 0,
          overrideMrp: newOverrideMrp ? parseFloat(newOverrideMrp) : null,
          notes: newNotes || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Book successfully added to library sales sheet');
      setShowAddModal(false);
      setNewBookId('');
      setNewNotes('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add book to library');
    } finally {
      setIsSaving(false);
    }
  };

  // Create or Update Library
  const handleSaveLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libFormName || !libFormCity || !libFormState) {
      toast.error('Please enter library name, city, and state');
      return;
    }

    setIsCreatingLib(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: libFormName,
        type: libFormType,
        city: libFormCity,
        state: libFormState,
        country: 'India',
        airportCode: libFormAirportCode || null,
        airportName: libFormAirportName || null,
        contactPerson: libFormContactPerson || 'Airport Manager',
        contactNumber: libFormContactNumber || 'N/A',
        email: libFormEmail || null,
        shippingAddress: libFormShippingAddress || `${libFormName}, ${libFormCity}`,
        status: libFormStatus
      };

      if (editingLibId) {
        await axios.put(`${API}/api/admin/libraries/${editingLibId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Library updated successfully!');
      } else {
        await axios.post(`${API}/api/admin/libraries`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('New library added successfully!');
      }

      setShowAddLibraryModal(false);
      setShowEditLibraryModal(false);
      setEditingLibId(null);
      resetLibForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save library');
    } finally {
      setIsCreatingLib(false);
    }
  };

  const resetLibForm = () => {
    setLibFormName('');
    setLibFormType('Airport Library');
    setLibFormCity('');
    setLibFormState('');
    setLibFormAirportCode('');
    setLibFormAirportName('');
    setLibFormContactPerson('');
    setLibFormContactNumber('');
    setLibFormEmail('');
    setLibFormShippingAddress('');
    setLibFormStatus('Active');
  };

  const openEditLibrary = (lib: any) => {
    setEditingLibId(lib.id);
    setLibFormName(lib.name || '');
    setLibFormType(lib.type || 'Airport Library');
    setLibFormCity(lib.city || '');
    setLibFormState(lib.state || '');
    setLibFormAirportCode(lib.airportCode || '');
    setLibFormAirportName(lib.airportName || '');
    setLibFormContactPerson(lib.contactPerson || '');
    setLibFormContactNumber(lib.contactNumber || '');
    setLibFormEmail(lib.email || '');
    setLibFormShippingAddress(lib.shippingAddress || '');
    setLibFormStatus(lib.status || 'Active');
    setShowEditLibraryModal(true);
  };

  // Export Excel
  const handleDownloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Library Book Sales');

      const libTitle = selectedLibraryId === 'all' 
        ? 'ALL LIBRARIES' 
        : (libraries.find(l => l.id.toString() === selectedLibraryId)?.name || 'LIBRARY').toUpperCase();

      // Title header
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `LIST OF BOOKS FOR ${libTitle} - LIBRARY BOOK SALES REPORT`;
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
        'MRP (₹)',
        'Author Name',
        'Library & City',
        'Copies Placed',
        'Copies Sold',
        'Revenue (₹)',
        'Stock Remaining'
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE600' } // Yellow header
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Data Rows
      filteredSales.forEach((sale, index) => {
        const mrp = sale.overrideMrp || sale.book?.mrp || 0;
        const placed = sale.copiesPlaced || 0;
        const sold = sale.soldStock || 0;
        const revenue = sold * mrp;
        const remaining = Math.max(0, placed - sold);

        const row = worksheet.addRow([
          index + 1,
          sale.book?.title || 'Unknown Title',
          mrp,
          sale.author?.name || 'Unknown Author',
          `${sale.library?.name || ''} (${sale.library?.city || ''})`,
          placed,
          sold,
          revenue,
          remaining
        ]);

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          if (colNumber === 1 || colNumber === 3 || colNumber >= 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // Grand Total Row
      const grandTotalRow = worksheet.addRow([
        '',
        'GRAND TOTAL',
        '',
        '',
        '',
        metrics.totalPlaced,
        metrics.totalSold,
        metrics.totalRevenue,
        metrics.totalRemaining
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
        if (colNumber === 2 || colNumber >= 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE600' }
        };
      });

      // Auto width
      worksheet.columns.forEach((col: any) => {
        let maxLen = 14;
        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
        });
        col.width = maxLen;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Library_Sales_${libTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      toast.success('Excel sheet downloaded successfully!');
    } catch (err) {
      console.error('Error generating Excel:', err);
      toast.error('Failed to generate Excel sheet');
    }
  };

  const selectedLibObj = libraries.find(l => l.id.toString() === selectedLibraryId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-paa-navy/5 shadow-premium">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center font-black">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-paa-navy tracking-tight flex items-center gap-2">
              Library Book Sales Management
              <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                Direct Sales & Donations Sheet
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Manage, track, and record book copies placed and sales across Airport Flybraries and Public/Institutional Libraries.
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

          {/* ADD LIBRARY BUTTON */}
          <button
            onClick={() => {
              resetLibForm();
              setEditingLibId(null);
              setShowAddLibraryModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Library
          </button>

          {/* ADD PARTICIPANT / BOOK BUTTON */}
          <button
            onClick={() => {
              if (selectedLibraryId !== 'all') {
                setNewLibraryId(selectedLibraryId);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Participant / Book
          </button>

          {/* DOWNLOAD REPORT */}
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download Report
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Libraries Active</div>
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
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</div>
            <div className="text-xl font-black text-amber-600">₹{metrics.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Library Selector / Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Library Select & Type Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Select Library:</label>
              <select
                value={selectedLibraryId}
                onChange={e => setSelectedLibraryId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Libraries ({libraries.length})</option>
                {libraries.map(l => (
                  <option key={l.id} value={l.id.toString()}>{l.name} - {l.city} ({l.type})</option>
                ))}
              </select>
            </div>

            {selectedLibObj && (
              <button
                onClick={() => openEditLibrary(selectedLibObj)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                title="Edit this library's info"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Library Info
              </button>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">Type:</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white text-gray-900 outline-none"
              >
                <option value="all">All Types</option>
                <option value="Airport Library">Airport Library</option>
                <option value="Institutional Library">Institutional Library</option>
                <option value="Military Library">Military Library</option>
                <option value="Public Library">Public Library</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, author, library..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Selected Library Header Info Banner */}
        {selectedLibObj && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-black text-amber-950 text-sm">{selectedLibObj.name}</span>
              <span className="bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                {selectedLibObj.type}
              </span>
              <span className="text-gray-600 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-700" /> {selectedLibObj.city}, {selectedLibObj.state}
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-600">
              {selectedLibObj.contactPerson && (
                <div>
                  Contact: <span className="font-bold text-gray-900">{selectedLibObj.contactPerson}</span> {selectedLibObj.contactNumber && `(${selectedLibObj.contactNumber})`}
                </div>
              )}
              {selectedLibObj.shippingAddress && selectedLibObj.shippingAddress !== 'NA' && (
                <div className="hidden lg:block text-gray-500 truncate max-w-xs" title={selectedLibObj.shippingAddress}>
                  Address: {selectedLibObj.shippingAddress}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EXCEL SHEET GRID */}
      <div className="flex flex-col border-[1.5px] border-black shadow-sm overflow-hidden bg-white">
        {/* Banner Title */}
        <div className="flex justify-between items-center bg-[#00D8F5] p-2 border-b-[1.5px] border-black font-bold">
          <h2 className="text-black uppercase text-[13px] m-0 tracking-wide">
            LIST OF BOOKS FOR {selectedLibraryId === 'all' ? 'ALL LIBRARIES' : (selectedLibObj?.name || 'LIBRARY').toUpperCase()} - {filteredSales.length} LISTED TITLES
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-black font-black uppercase">
              Total Revenue: ₹{metrics.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-sans border-collapse whitespace-nowrap">
            <thead>
              <tr>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-10 text-center">S.No</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-60 text-left px-2">Book Title</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-20 text-center">MRP (₹)</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-40 text-left px-2">Author Name</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-44 text-left px-2">Library & City</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Copies<br/>Placed</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Copies<br/>Sold</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-28 text-center">Revenue (₹)</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Stock<br/>Remaining</th>
                <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center border-[1.5px] border-black">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                      <span className="text-xs font-bold text-gray-500">Loading library sales records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 italic border-[1.5px] border-black">
                    No book placements found matching current filters. Click "+ Add Participant / Book" to record a book placement.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const isEditing = editingSaleId === sale.id;
                  const mrp = sale.overrideMrp || sale.book?.mrp || 0;
                  const placed = sale.copiesPlaced || 0;
                  const sold = sale.soldStock || 0;
                  const revenue = sold * mrp;
                  const remaining = Math.max(0, placed - sold);

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

                      {/* MRP */}
                      <td className={`border-[1.5px] border-black text-center font-mono font-bold ${isEditing ? 'bg-white p-0' : 'bg-[#ffddaa] p-1 text-black'}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editMrp}
                            onChange={e => setEditMrp(e.target.value)}
                            placeholder={sale.book?.mrp?.toString() || '0'}
                            className="w-full h-full p-1 text-center outline-none font-bold bg-white text-black"
                          />
                        ) : (
                          `₹${mrp}`
                        )}
                      </td>

                      {/* Author Name */}
                      <td className="border-[1.5px] border-black bg-[#00ffff] text-black font-bold p-1 px-2 truncate max-w-[160px] text-left">
                        {sale.author?.name || 'Unknown Author'}
                      </td>

                      {/* Library */}
                      <td className="border-[1.5px] border-black bg-purple-100 text-black font-semibold p-1 px-2 truncate max-w-[180px] text-left" title={`${sale.library?.name} (${sale.library?.city})`}>
                        {sale.library?.name} <span className="text-[10px] text-gray-600">({sale.library?.city})</span>
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

                      {/* Stock Remaining */}
                      <td className="border-[1.5px] border-black bg-white text-center font-bold p-1 text-gray-900">
                        {remaining}
                      </td>

                      {/* Actions */}
                      <td className="border-[1.5px] border-black bg-gray-50 p-1 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleSaveRow(sale.id)}
                              disabled={isSaving}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => startEdit(sale)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRow(sale.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-1 rounded text-[10px] font-bold shadow-sm"
                              title="Delete Book Sale"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* GRAND TOTAL FOOTER */}
              {filteredSales.length > 0 && (
                <tr className="bg-[#FFE600] font-bold text-black border-t-2 border-black">
                  <td colSpan={5} className="border-[1.5px] border-black text-right p-2 uppercase tracking-widest text-[11px]">
                    GRAND TOTAL
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-bold">
                    {metrics.totalPlaced}
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-emerald-900 font-bold">
                    {metrics.totalSold}
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">
                    ₹{metrics.totalRevenue.toLocaleString()}
                  </td>
                  <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-bold">
                    {metrics.totalRemaining}
                  </td>
                  <td className="border-[1.5px] border-black bg-[#FFE600]"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PARTICIPANT / BOOK TO LIBRARY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Add Participant / Book to Library</h3>
                  <p className="text-xs text-gray-500">Record copies placed and sales at a specific library</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBookToLibrary} className="space-y-4 pt-4">
              {/* Library Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Library *</label>
                <select
                  required
                  value={newLibraryId}
                  onChange={e => setNewLibraryId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Library...</option>
                  {libraries.map(l => (
                    <option key={l.id} value={l.id.toString()}>{l.name} - {l.city} ({l.type})</option>
                  ))}
                </select>
              </div>

              {/* Author Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Author *</label>
                <select
                  required
                  value={newAuthorId}
                  onChange={e => {
                    setNewAuthorId(e.target.value);
                    setNewBookId('');
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Author...</option>
                  {platformAuthors.map(a => (
                    <option key={a.id} value={a.id.toString()}>{a.name} {a.penName ? `(${a.penName})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Book Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Book Title *</label>
                <select
                  required
                  value={newBookId}
                  onChange={e => {
                    setNewBookId(e.target.value);
                    const book = selectedAuthorBooks.find((b: any) => b.id === parseInt(e.target.value));
                    if (book && book.mrp) {
                      setNewOverrideMrp(book.mrp.toString());
                    }
                  }}
                  disabled={!newAuthorId}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
                >
                  <option value="">{newAuthorId ? 'Select Book...' : 'Select Author First'}</option>
                  {selectedAuthorBooks.map((b: any) => (
                    <option key={b.id} value={b.id.toString()}>{b.title} (MRP: ₹{b.mrp})</option>
                  ))}
                </select>
              </div>

              {/* Placed & Sold Numbers */}
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

              {/* Custom MRP Override */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">MRP Override (₹) (Optional)</label>
                <input
                  type="number"
                  placeholder="Default Book MRP"
                  value={newOverrideMrp}
                  onChange={e => setNewOverrideMrp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Placed at reception shelf"
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
                  {isSaving ? 'Saving...' : 'Add to Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD OR EDIT LIBRARY MODAL */}
      {(showAddLibraryModal || showEditLibraryModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingLibId ? 'Edit Library Details' : 'Add New Library / Flybrary'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingLibId ? 'Update location and contact details' : 'Add a new public or airport flybrary'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddLibraryModal(false);
                  setShowEditLibraryModal(false);
                  setEditingLibId(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLibrary} className="space-y-3.5 pt-4">
              {/* Library Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Library / Flybrary Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Airport Flybrary or National Library"
                  value={libFormName}
                  onChange={e => setLibFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Type *</label>
                  <select
                    value={libFormType}
                    onChange={e => setLibFormType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Airport Library">Airport Library</option>
                    <option value="Institutional Library">Institutional Library</option>
                    <option value="Military Library">Military Library</option>
                    <option value="Public Library">Public Library</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={libFormStatus}
                    onChange={e => setLibFormStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune"
                    value={libFormCity}
                    onChange={e => setLibFormCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={libFormState}
                    onChange={e => setLibFormState(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Airport Specific fields if Airport Library */}
              {libFormType === 'Airport Library' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Airport Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. PNQ"
                      value={libFormAirportCode}
                      onChange={e => setLibFormAirportCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Airport Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune International Airport"
                      value={libFormAirportName}
                      onChange={e => setLibFormAirportName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Airport Manager"
                    value={libFormContactPerson}
                    onChange={e => setLibFormContactPerson(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={libFormContactNumber}
                    onChange={e => setLibFormContactNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Shipping / Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP Lounge, Departure Terminal 1"
                  value={libFormShippingAddress}
                  onChange={e => setLibFormShippingAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLibraryModal(false);
                    setShowEditLibraryModal(false);
                    setEditingLibId(null);
                  }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLib}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isCreatingLib ? 'Saving...' : editingLibId ? 'Update Library' : 'Create Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibrarySalesTab;
