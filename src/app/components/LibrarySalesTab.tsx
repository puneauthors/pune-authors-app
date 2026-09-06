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
  Trash2, 
  BookOpen, 
  Users, 
  IndianRupee, 
  Package, 
  CheckCircle2, 
  RefreshCw,
  Library as LibraryIcon,
  MapPin,
  Phone,
  User,
  ArrowLeft,
  Mail,
  ChevronRight,
  FileSpreadsheet
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
    airportCode?: string;
    airportName?: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    shippingAddress?: string;
    status?: string;
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

  // Active view: null = Master Libraries Table, object = Specific Library Sales Breakdown
  const [selectedLibrary, setSelectedLibrary] = useState<any | null>(null);

  // Master Libraries Table Filters & Search
  const [masterSearch, setMasterSearch] = useState('');
  const [masterTypeFilter, setMasterTypeFilter] = useState<string>('all');

  // Specific Library Sales Table Search
  const [detailSearch, setDetailSearch] = useState('');

  // Single Row Editing state
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editPlaced, setEditPlaced] = useState<number>(0);
  const [editSold, setEditSold] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Edit / Live Edit State for Specific Library (allows live editing on the sheet and Save All)
  const [localSalesState, setLocalSalesState] = useState<Record<number, { copiesPlaced: number; soldStock: number; overrideMrp: string; notes: string }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Add Book modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLibraryId, setNewLibraryId] = useState<string>('');
  const [newAuthorId, setNewAuthorId] = useState<string>('');
  const [newBookId, setNewBookId] = useState<string>('');
  const [newPlaced, setNewPlaced] = useState<number>(10);
  const [newSold, setNewSold] = useState<number>(0);
  const [newOverrideMrp, setNewOverrideMrp] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // Add / Edit Library modal state
  const [showAddLibraryModal, setShowAddLibraryModal] = useState(false);
  const [showEditLibraryModal, setShowEditLibraryModal] = useState(false);
  const [editingLibId, setEditingLibId] = useState<number | null>(null);
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
        const libsList = libsRes.data.libraries || [];
        setLibraries(libsList);
        
        // Update selected library instance if one was open
        if (selectedLibrary) {
          const freshSelected = libsList.find((l: any) => l.id === selectedLibrary.id);
          if (freshSelected) {
            setSelectedLibrary(freshSelected);
          }
        }
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

  // Sync local sales state when sales or selectedLibrary changes
  useEffect(() => {
    if (selectedLibrary) {
      const currentLibSales = sales.filter(s => s.libraryId === selectedLibrary.id);
      const stateMap: Record<number, { copiesPlaced: number; soldStock: number; overrideMrp: string; notes: string }> = {};
      currentLibSales.forEach(s => {
        stateMap[s.id] = {
          copiesPlaced: s.copiesPlaced || 0,
          soldStock: s.soldStock || 0,
          overrideMrp: s.overrideMrp !== null && s.overrideMrp !== undefined ? s.overrideMrp.toString() : (s.book?.mrp?.toString() || ''),
          notes: s.notes || ''
        };
      });
      setLocalSalesState(stateMap);
    }
  }, [sales, selectedLibrary?.id]);

  // Overall metrics across all libraries
  const overallMetrics = useMemo(() => {
    let totalPlaced = 0;
    let totalSold = 0;
    let totalRevenue = 0;
    const authorSet = new Set<number>();
    const librarySet = new Set<number>();

    sales.forEach(s => {
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
      totalLibraries: libraries.length,
      activeLibraries: libraries.filter(l => l.status !== 'Inactive').length,
      totalPlaced,
      totalSold,
      totalRevenue,
      totalRemaining: Math.max(0, totalPlaced - totalSold),
      uniqueAuthors: authorSet.size
    };
  }, [sales, libraries]);

  // Filtered libraries for Master Table
  const filteredLibraries = useMemo(() => {
    return libraries.filter(lib => {
      if (masterTypeFilter !== 'all' && lib.type !== masterTypeFilter) {
        return false;
      }
      if (masterSearch.trim()) {
        const q = masterSearch.toLowerCase().trim();
        const name = (lib.name || '').toLowerCase();
        const city = (lib.city || '').toLowerCase();
        const state = (lib.state || '').toLowerCase();
        const code = (lib.airportCode || '').toLowerCase();
        const contact = (lib.contactPerson || '').toLowerCase();
        return name.includes(q) || city.includes(q) || state.includes(q) || code.includes(q) || contact.includes(q);
      }
      return true;
    });
  }, [libraries, masterTypeFilter, masterSearch]);

  // Sales records specific to the selected library
  const currentLibrarySales = useMemo(() => {
    if (!selectedLibrary) return [];
    return sales.filter(s => s.libraryId === selectedLibrary.id);
  }, [sales, selectedLibrary]);

  // Filtered sales records for the specific library
  const filteredLibrarySales = useMemo(() => {
    if (!selectedLibrary) return [];
    return currentLibrarySales.filter(item => {
      if (detailSearch.trim()) {
        const q = detailSearch.toLowerCase().trim();
        const bookTitle = item.book?.title?.toLowerCase() || '';
        const authorName = item.author?.name?.toLowerCase() || '';
        const authorPen = item.author?.penName?.toLowerCase() || '';
        return bookTitle.includes(q) || authorName.includes(q) || authorPen.includes(q);
      }
      return true;
    });
  }, [currentLibrarySales, detailSearch, selectedLibrary]);

  // Specific library summary metrics
  const libraryMetrics = useMemo(() => {
    if (!selectedLibrary) return { totalPlaced: 0, totalSold: 0, totalRevenue: 0, totalRemaining: 0, uniqueAuthors: 0, totalTitles: 0 };
    
    let totalPlaced = 0;
    let totalSold = 0;
    let totalRevenue = 0;
    const authorSet = new Set<number>();
    const bookSet = new Set<number>();

    currentLibrarySales.forEach(s => {
      const local = localSalesState[s.id];
      const mrp = local?.overrideMrp ? parseFloat(local.overrideMrp) : (s.overrideMrp || s.book?.mrp || 0);
      const placed = local ? local.copiesPlaced : (s.copiesPlaced || 0);
      const sold = local ? local.soldStock : (s.soldStock || 0);

      totalPlaced += placed;
      totalSold += sold;
      totalRevenue += (sold * (isNaN(mrp) ? 0 : mrp));

      if (s.authorId) authorSet.add(s.authorId);
      if (s.bookId) bookSet.add(s.bookId);
    });

    return {
      totalPlaced,
      totalSold,
      totalRevenue,
      totalRemaining: Math.max(0, totalPlaced - totalSold),
      uniqueAuthors: authorSet.size,
      totalTitles: bookSet.size
    };
  }, [currentLibrarySales, localSalesState, selectedLibrary]);

  // Grouped sales by author for the Event-like table structure
  const authorGroupedSales = useMemo(() => {
    if (!selectedLibrary) return [];
    
    const groupsMap = new Map<number, { author: any; items: LibrarySaleItem[] }>();

    filteredLibrarySales.forEach(item => {
      const aId = item.authorId || 0;
      if (!groupsMap.has(aId)) {
        groupsMap.set(aId, {
          author: item.author || { name: 'Unknown Author', id: aId },
          items: []
        });
      }
      groupsMap.get(aId)!.items.push(item);
    });

    return Array.from(groupsMap.values());
  }, [filteredLibrarySales, selectedLibrary]);

  // Selected author books for the Add Book modal
  const selectedAuthorBooks = useMemo(() => {
    if (!newAuthorId) return [];
    const author = platformAuthors.find(a => a.id.toString() === newAuthorId);
    return author?.books?.filter((b: any) => !b.isArchived) || [];
  }, [newAuthorId, platformAuthors]);

  // Handle cell changes in the Live Excel table
  const handleCellChange = (saleId: number, field: 'copiesPlaced' | 'soldStock' | 'overrideMrp' | 'notes', value: any) => {
    setLocalSalesState(prev => {
      const current = prev[saleId] || { copiesPlaced: 0, soldStock: 0, overrideMrp: '', notes: '' };
      return {
        ...prev,
        [saleId]: {
          ...current,
          [field]: field === 'copiesPlaced' || field === 'soldStock' ? (parseInt(value) || 0) : value
        }
      };
    });
  };

  // Start single row edit
  const startEdit = (sale: LibrarySaleItem) => {
    setEditingSaleId(sale.id);
    const local = localSalesState[sale.id];
    setEditPlaced(local ? local.copiesPlaced : (sale.copiesPlaced || 0));
    setEditSold(local ? local.soldStock : (sale.soldStock || 0));
    setEditMrp(local ? local.overrideMrp : (sale.overrideMrp?.toString() || sale.book?.mrp?.toString() || ''));
    setEditNotes(local ? local.notes : (sale.notes || ''));
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
        overrideMrp: editMrp ? parseFloat(editMrp) : null,
        notes: editNotes || null
      };

      await axios.put(`${API}/api/admin/library-sales/${saleId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Record updated successfully');
      setEditingSaleId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  // Save All Changes for this specific library (Bulk Save)
  const handleSaveAllChanges = async () => {
    if (!selectedLibrary) return;
    setIsSavingAll(true);
    try {
      const token = localStorage.getItem('token');
      const itemsToSave = currentLibrarySales.map(s => {
        const local = localSalesState[s.id] || {
          copiesPlaced: s.copiesPlaced || 0,
          soldStock: s.soldStock || 0,
          overrideMrp: s.overrideMrp?.toString() || '',
          notes: s.notes || ''
        };

        return {
          libraryId: selectedLibrary.id,
          bookId: s.bookId,
          authorId: s.authorId,
          copiesPlaced: local.copiesPlaced,
          soldStock: local.soldStock,
          overrideMrp: local.overrideMrp ? parseFloat(local.overrideMrp) : null,
          notes: local.notes || null
        };
      });

      await axios.post(
        `${API}/api/admin/library-sales`,
        { sales: itemsToSave, libraryId: selectedLibrary.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('All changes saved successfully!');
      setEditingSaleId(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving all changes:', err);
      toast.error(err.response?.data?.error || 'Failed to save all changes');
    } finally {
      setIsSavingAll(false);
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

  // Delete a library
  const handleDeleteLibrary = async (libId: number, libName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${libName}"? All associated sales records will be removed.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/admin/libraries/${libId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Library removed successfully');
      if (selectedLibrary?.id === libId) {
        setSelectedLibrary(null);
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to remove library');
    }
  };

  // Add Book to Library
  const handleAddBookToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetLibId = newLibraryId || (selectedLibrary ? selectedLibrary.id.toString() : '');
    if (!targetLibId || !newAuthorId || !newBookId) {
      toast.error('Please select library, author, and book');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/admin/library-sales`,
        {
          libraryId: parseInt(targetLibId),
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

  // Export Excel for current view (All Libraries or Specific Library)
  const handleDownloadExcel = async (targetLib?: any) => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const currentLib = targetLib || selectedLibrary;

      if (currentLib) {
        // Specific library sheet
        const worksheet = workbook.addWorksheet(`${currentLib.name.slice(0, 25)} Sales`);
        const libTitle = currentLib.name.toUpperCase();

        // Title header
        worksheet.mergeCells('A1:J1');
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
        worksheet.addRow(['Report Date:', new Date().toLocaleDateString('en-GB'), '', 'Location:', `${currentLib.city}, ${currentLib.state}`]);
        worksheet.addRow(['Total Books Placed:', libraryMetrics.totalPlaced, '', 'Total Books Sold:', libraryMetrics.totalSold]);
        worksheet.addRow(['Total Revenue (₹):', `₹${libraryMetrics.totalRevenue.toLocaleString()}`, '', 'Stock Remaining:', libraryMetrics.totalRemaining]);
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
          'Pen Name',
          'Copies Placed',
          'Copies Sold',
          'Revenue (₹)',
          'Stock Remaining',
          'Notes'
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
            bottom: { style: 'medium' },
            right: { style: 'thin' }
          };
        });

        // Rows
        let sNo = 1;
        currentLibrarySales.forEach(s => {
          const mrp = s.overrideMrp || s.book?.mrp || 0;
          const placed = s.copiesPlaced || 0;
          const sold = s.soldStock || 0;
          const revenue = sold * mrp;
          const remaining = Math.max(0, placed - sold);

          const row = worksheet.addRow([
            sNo++,
            s.book?.title || 'Unknown Title',
            mrp,
            s.author?.name || 'Unknown Author',
            s.author?.penName || '-',
            placed,
            sold,
            revenue,
            remaining,
            s.notes || ''
          ]);

          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(6).alignment = { horizontal: 'center' };
          row.getCell(7).alignment = { horizontal: 'center' };
          row.getCell(8).alignment = { horizontal: 'center' };
          row.getCell(9).alignment = { horizontal: 'center' };

          // Styling
          row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan author cell
          row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }; // Light green sold cell

          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });

        // Grand total
        const grandTotalRow = worksheet.addRow([
          'GRAND TOTAL',
          '',
          '',
          '',
          '',
          libraryMetrics.totalPlaced,
          libraryMetrics.totalSold,
          libraryMetrics.totalRevenue,
          libraryMetrics.totalRemaining,
          ''
        ]);

        worksheet.mergeCells(`A${grandTotalRow.number}:E${grandTotalRow.number}`);
        grandTotalRow.height = 24;
        grandTotalRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE600' } };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'thin' },
            bottom: { style: 'medium' },
            right: { style: 'thin' }
          };
        });

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
      } else {
        // All Libraries Overview Workbook
        const worksheet = workbook.addWorksheet('All Libraries Summary');

        // Banner
        worksheet.mergeCells('A1:I1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'ALL LIBRARIES & FLYBRARIES SALES OVERVIEW REPORT';
        titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00D8F5' }
        };
        worksheet.getRow(1).height = 30;

        worksheet.addRow([]);
        worksheet.addRow(['Report Date:', new Date().toLocaleDateString('en-GB')]);
        worksheet.addRow(['Total Active Libraries:', overallMetrics.activeLibraries, '', 'Total Authors Participating:', overallMetrics.uniqueAuthors]);
        worksheet.addRow(['Total Copies Placed:', overallMetrics.totalPlaced, '', 'Total Books Sold:', overallMetrics.totalSold]);
        worksheet.addRow(['Total Revenue (₹):', `₹${overallMetrics.totalRevenue.toLocaleString()}`, '', 'Stock Remaining:', overallMetrics.totalRemaining]);
        worksheet.addRow([]);

        for (let r = 3; r <= 6; r++) {
          worksheet.getRow(r).font = { bold: true };
        }

        const headers = [
          'S.No',
          'Library / Flybrary Name',
          'Type',
          'City & State',
          'Airport Code',
          'Authors Count',
          'Total Placed',
          'Total Sold',
          'Revenue (₹)',
          'Remaining Stock',
          'Status'
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.height = 24;
        headerRow.eachCell(cell => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE600' } };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
        });

        libraries.forEach((lib, idx) => {
          const row = worksheet.addRow([
            idx + 1,
            lib.name,
            lib.type,
            `${lib.city}, ${lib.state}`,
            lib.airportCode || '-',
            lib.totalAuthors || 0,
            lib.totalPlaced || 0,
            lib.totalSold || 0,
            lib.totalRevenue || 0,
            Math.max(0, (lib.totalPlaced || 0) - (lib.totalSold || 0)),
            lib.status || 'Active'
          ]);

          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(5).alignment = { horizontal: 'center' };
          row.getCell(6).alignment = { horizontal: 'center' };
          row.getCell(7).alignment = { horizontal: 'center' };
          row.getCell(8).alignment = { horizontal: 'center' };
          row.getCell(9).alignment = { horizontal: 'center' };
          row.getCell(10).alignment = { horizontal: 'center' };
          row.getCell(11).alignment = { horizontal: 'center' };

          row.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
        });

        worksheet.columns.forEach((col: any) => {
          let maxLen = 14;
          col.eachCell({ includeEmpty: true }, (cell: any) => {
            const val = cell.value ? cell.value.toString() : '';
            if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
          });
          col.width = maxLen;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `All_Libraries_Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
        toast.success('Overall libraries report downloaded!');
      }
    } catch (err) {
      console.error('Error generating Excel:', err);
      toast.error('Failed to generate Excel sheet');
    }
  };

  // =========================================================================
  // RENDER: SPECIFIC LIBRARY SALES PAGE (EVENT-STYLE EXCEL TABLE VIEW)
  // =========================================================================
  if (selectedLibrary) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Top Navigation & Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-paa-navy/5 shadow-premium">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedLibrary(null);
                setEditingSaleId(null);
                setDetailSearch('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-paa-navy hover:text-white text-gray-700 rounded-xl text-xs font-bold transition-all shadow-sm group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to All Libraries</span>
            </button>
            <div className="hidden sm:block h-6 w-px bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-paa-navy tracking-tight">
                  {selectedLibrary.name}
                </h1>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold uppercase">
                  {selectedLibrary.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> {selectedLibrary.city}, {selectedLibrary.state}
                {selectedLibrary.airportCode && (
                  <span className="font-bold text-indigo-600">({selectedLibrary.airportCode})</span>
                )}
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

            {/* EDIT LIBRARY INFO */}
            <button
              onClick={() => openEditLibrary(selectedLibrary)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Info
            </button>

            {/* ADD PARTICIPANT / BOOK */}
            <button
              onClick={() => {
                setNewLibraryId(selectedLibrary.id.toString());
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Participant / Book
            </button>

            {/* SAVE ALL CHANGES */}
            <button
              onClick={handleSaveAllChanges}
              disabled={isSavingAll || currentLibrarySales.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingAll ? 'Saving...' : 'Save All Changes'}
            </button>

            {/* DOWNLOAD EXCEL */}
            <button
              onClick={() => handleDownloadExcel(selectedLibrary)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Download Excel
            </button>
          </div>
        </div>

        {/* Library Info Card & KPI Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Library Details Card */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                  Library Details
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedLibrary.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                  {selectedLibrary.status || 'Active'}
                </span>
              </div>
              <h3 className="font-black text-paa-navy text-sm">{selectedLibrary.name}</h3>
              <p className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                {selectedLibrary.shippingAddress || `${selectedLibrary.city}, ${selectedLibrary.state}`}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-amber-200/60 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
              {selectedLibrary.contactPerson && (
                <div className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>{selectedLibrary.contactPerson}</span>
                  {selectedLibrary.contactNumber && (
                    <span className="text-gray-500 font-normal">({selectedLibrary.contactNumber})</span>
                  )}
                </div>
              )}
              {selectedLibrary.email && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedLibrary.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Authors</span>
              </div>
              <div className="text-2xl font-black text-paa-navy">{libraryMetrics.uniqueAuthors}</div>
              <div className="text-[11px] text-gray-400 font-medium">{libraryMetrics.totalTitles} Titles Listed</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Placed</span>
              </div>
              <div className="text-2xl font-black text-paa-navy">{libraryMetrics.totalPlaced}</div>
              <div className="text-[11px] text-gray-400 font-medium">Copies Stocked</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sold</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{libraryMetrics.totalSold}</div>
              <div className="text-[11px] text-gray-400 font-medium">{libraryMetrics.totalRemaining} in Stock</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <IndianRupee className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Revenue</span>
              </div>
              <div className="text-2xl font-black text-amber-600">₹{libraryMetrics.totalRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-gray-400 font-medium">Direct Sales Value</div>
            </div>
          </div>
        </div>

        {/* Search Bar for Specific Library */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search author, pen name, or book title in this library..."
              value={detailSearch}
              onChange={e => setDetailSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500"
            />
          </div>
          <div className="text-xs text-gray-500 font-bold">
            Showing <span className="text-paa-navy font-black">{filteredLibrarySales.length}</span> listed book entries
          </div>
        </div>

        {/* EVENT-STYLE EXCEL SHEET TABLE */}
        <div className="flex flex-col border-[1.5px] border-black shadow-sm overflow-hidden bg-white">
          {/* Cyan Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#00D8F5] p-2.5 border-b-[1.5px] border-black font-bold">
            <h2 className="text-black uppercase text-xs sm:text-[13px] m-0 tracking-wide">
              LIST OF BOOKS FOR {selectedLibrary.name.toUpperCase()} - {authorGroupedSales.length} AUTHORS ({filteredLibrarySales.length} TITLES)
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-black font-black uppercase bg-white/80 px-2 py-0.5 rounded border border-black/30">
                Revenue: ₹{libraryMetrics.totalRevenue.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  setNewLibraryId(selectedLibrary.id.toString());
                  setShowAddModal(true);
                }}
                className="bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-wider border-[1.5px] border-black hover:bg-gray-100 transition-colors"
              >
                + ADD PARTICIPANT
              </button>
              <button
                onClick={handleSaveAllChanges}
                disabled={isSavingAll}
                className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSavingAll ? 'SAVING...' : 'SAVE ALL CHANGES'}
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-sans border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-10 text-center">S.No</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-56 text-left px-2">Book Title</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-20 text-center">MRP (₹)</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-40 text-left px-2">Author Name</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Suggested /<br/>Placed Copies</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Actual<br/>Copies Sold</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Revenue (₹)</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center">Stock<br/>Remaining</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-32 text-left px-2">Notes / Shelf</th>
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
                ) : filteredLibrarySales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 italic border-[1.5px] border-black">
                      No book placements found for this library. Click "+ Add Participant / Book" to add authors and books.
                    </td>
                  </tr>
                ) : (
                  authorGroupedSales.map((group, gIdx) => {
                    return group.items.map((sale, itemIdx) => {
                      const isEditing = editingSaleId === sale.id;
                      const local = localSalesState[sale.id] || {
                        copiesPlaced: sale.copiesPlaced || 0,
                        soldStock: sale.soldStock || 0,
                        overrideMrp: sale.overrideMrp?.toString() || sale.book?.mrp?.toString() || '0',
                        notes: sale.notes || ''
                      };

                      const currentPlaced = isEditing ? editPlaced : local.copiesPlaced;
                      const currentSold = isEditing ? editSold : local.soldStock;
                      const rawMrp = isEditing ? editMrp : local.overrideMrp;
                      const currentMrp = parseFloat(rawMrp) || sale.book?.mrp || 0;
                      const revenue = currentSold * currentMrp;
                      const remaining = Math.max(0, currentPlaced - currentSold);

                      // Calculate global sequential row number
                      let previousCount = 0;
                      for (let i = 0; i < gIdx; i++) {
                        previousCount += authorGroupedSales[i].items.length;
                      }
                      const rowSNo = previousCount + itemIdx + 1;

                      return (
                        <tr key={sale.id} className="hover:brightness-95 transition-all bg-white">
                          {/* S.No */}
                          <td className="border-[1.5px] border-black bg-red-600 text-white font-bold text-center p-1">
                            {rowSNo}
                          </td>

                          {/* Book Title */}
                          <td className="border-[1.5px] border-black bg-[#ffcccc] text-black font-bold p-1 px-2 truncate max-w-[200px] text-left" title={sale.book?.title}>
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
                              <input
                                type="number"
                                value={local.overrideMrp}
                                onChange={e => handleCellChange(sale.id, 'overrideMrp', e.target.value)}
                                className="w-full bg-transparent text-center font-bold outline-none text-black cursor-text"
                              />
                            )}
                          </td>

                          {/* Author Name */}
                          <td className="border-[1.5px] border-black bg-[#00ffff] text-black font-bold p-1 px-2 truncate max-w-[160px] text-left" title={group.author.name}>
                            <div className="flex flex-col">
                              <span>{group.author.name || 'Unknown Author'}</span>
                              {group.author.penName && (
                                <span className="text-[10px] text-gray-700 font-semibold italic">
                                  ({group.author.penName})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Copies Placed / Suggested */}
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
                              <input
                                type="number"
                                min="0"
                                value={local.copiesPlaced}
                                onChange={e => handleCellChange(sale.id, 'copiesPlaced', e.target.value)}
                                className="w-full bg-transparent text-center font-bold outline-none text-black cursor-text"
                              />
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
                              <input
                                type="number"
                                min="0"
                                value={local.soldStock}
                                onChange={e => handleCellChange(sale.id, 'soldStock', e.target.value)}
                                className="w-full bg-transparent text-center font-black outline-none text-emerald-900 cursor-text"
                              />
                            )}
                          </td>

                          {/* Revenue */}
                          <td className="border-[1.5px] border-black bg-[#e6f4ea] text-black text-center font-black p-1">
                            ₹{revenue.toLocaleString()}
                          </td>

                          {/* Stock Remaining */}
                          <td className="border-[1.5px] border-black bg-white text-center font-bold p-1 text-gray-900">
                            {remaining}
                          </td>

                          {/* Notes / Remarks */}
                          <td className="border-[1.5px] border-black bg-white p-1 px-2 text-left">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes..."
                                className="w-full p-1 text-xs outline-none bg-white text-gray-900 font-medium"
                              />
                            ) : (
                              <input
                                type="text"
                                value={local.notes}
                                onChange={e => handleCellChange(sale.id, 'notes', e.target.value)}
                                placeholder="-"
                                className="w-full bg-transparent text-xs text-gray-700 outline-none truncate"
                              />
                            )}
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
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => startEdit(sale)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                  title="Edit single row"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(sale.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white p-1 rounded text-[10px] font-bold shadow-sm"
                                  title="Remove book from library"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })
                )}

                {/* GRAND TOTAL FOOTER */}
                {filteredLibrarySales.length > 0 && (
                  <tr className="bg-[#FFE600] font-bold text-black border-t-2 border-black">
                    <td colSpan={4} className="border-[1.5px] border-black text-right p-2 uppercase tracking-widest text-[11px]">
                      GRAND TOTAL
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-bold">
                      {libraryMetrics.totalPlaced}
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-emerald-900 font-bold">
                      {libraryMetrics.totalSold}
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">
                      ₹{libraryMetrics.totalRevenue.toLocaleString()}
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-bold">
                      {libraryMetrics.totalRemaining}
                    </td>
                    <td colSpan={2} className="border-[1.5px] border-black bg-[#FFE600]"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="flex justify-start">
          <button
            onClick={() => {
              setSelectedLibrary(null);
              setEditingSaleId(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Libraries Table</span>
          </button>
        </div>

        {/* Modal Declarations below */}
        {renderModals()}
      </div>
    );
  }

  // =========================================================================
  // RENDER: MASTER VIEW (TABLE OF ALL LIBRARIES)
  // =========================================================================
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
              Library Book Sales Management
              <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                Directory & Sales Breakdown
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Directory of all Airport Flybraries and Public Libraries. Click "Edit" on any library to manage its sales sheet.
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
              setNewLibraryId('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Participant / Book
          </button>

          {/* DOWNLOAD REPORT */}
          <button
            onClick={() => handleDownloadExcel()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download Overall Report
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Libraries Active</div>
            <div className="text-xl font-black text-paa-navy">{overallMetrics.activeLibraries}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Authors Enrolled</div>
            <div className="text-xl font-black text-indigo-600">{overallMetrics.uniqueAuthors}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Copies Placed</div>
            <div className="text-xl font-black text-paa-navy">{overallMetrics.totalPlaced}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Copies Sold</div>
            <div className="text-xl font-black text-emerald-600">{overallMetrics.totalSold}</div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</div>
            <div className="text-xl font-black text-amber-600">₹{overallMetrics.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Type:</label>
            <select
              value={masterTypeFilter}
              onChange={e => setMasterTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Types ({libraries.length})</option>
              <option value="Airport Library">Airport Library</option>
              <option value="Institutional Library">Institutional Library</option>
              <option value="Military Library">Military Library</option>
              <option value="Public Library">Public Library</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search library name, city, state, code..."
            value={masterSearch}
            onChange={e => setMasterSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium"
          />
        </div>
      </div>

      {/* TABLE OF ALL LIBRARIES */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12 text-center">S.No</th>
                <th className="py-3 px-4">Library / Flybrary Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-3 text-center">No. of Authors</th>
                <th className="py-3 px-3 text-center">Books Placed</th>
                <th className="py-3 px-3 text-center">Books Sold</th>
                <th className="py-3 px-3 text-center">Revenue</th>
                <th className="py-3 px-3 text-center">Remaining</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                      <span className="text-xs font-bold text-gray-500">Loading libraries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLibraries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                    No libraries found matching your criteria. Click "+ Add Library" to create one.
                  </td>
                </tr>
              ) : (
                filteredLibraries.map((lib, idx) => {
                  const placed = lib.totalPlaced || 0;
                  const sold = lib.totalSold || 0;
                  const revenue = lib.totalRevenue || 0;
                  const remaining = Math.max(0, placed - sold);
                  const authorsCount = lib.totalAuthors || 0;

                  return (
                    <tr 
                      key={lib.id} 
                      className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLibrary(lib)}
                    >
                      {/* S.No */}
                      <td className="py-3.5 px-3 text-center font-bold text-gray-500">
                        {idx + 1}
                      </td>

                      {/* Library Name & Type */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                            <LibraryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-black text-paa-navy text-sm flex items-center gap-1.5">
                              {lib.name}
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                              {lib.type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-gray-700">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>{lib.city}, {lib.state}</span>
                        </div>
                        {lib.airportCode && (
                          <div className="text-[10px] font-bold text-indigo-600 ml-5">
                            Code: {lib.airportCode}
                          </div>
                        )}
                      </td>

                      {/* No. of Authors */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700">
                          <Users className="w-3 h-3" />
                          {authorsCount}
                        </span>
                      </td>

                      {/* Books Placed */}
                      <td className="py-3.5 px-3 text-center font-bold text-gray-900">
                        {placed}
                      </td>

                      {/* Books Sold */}
                      <td className="py-3.5 px-3 text-center font-black text-emerald-600">
                        {sold}
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-3 text-center font-black text-amber-700">
                        ₹{revenue.toLocaleString()}
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-3 text-center font-bold text-gray-700">
                        {remaining}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${lib.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {lib.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Primary Edit / Open Sales Button */}
                          <button
                            onClick={() => setSelectedLibrary(lib)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                            title="Open Sales Sheet"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Sales</span>
                          </button>

                          {/* Edit Info Button */}
                          <button
                            onClick={() => openEditLibrary(lib)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            title="Edit Library Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Library */}
                          <button
                            onClick={() => handleDeleteLibrary(lib.id, lib.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Delete Library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renderModals()}
    </div>
  );

  // =========================================================================
  // HELPER: MODALS (ADD BOOK & ADD/EDIT LIBRARY)
  // =========================================================================
  function renderModals() {
    return (
      <>
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
                    value={newLibraryId || (selectedLibrary ? selectedLibrary.id.toString() : '')}
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
      </>
    );
  }
}

export default LibrarySalesTab;
