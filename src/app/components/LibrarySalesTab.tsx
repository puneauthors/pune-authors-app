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
  FileSpreadsheet,
  CheckSquare,
  Square
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

  // Row Editing state (Admin must click Edit to make row editable, then Save to commit)
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [editPlaced, setEditPlaced] = useState<number>(0);
  const [editSold, setEditSold] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Add Participant modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAuthorId, setNewAuthorId] = useState<string>('');
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [bookQuantities, setBookQuantities] = useState<Record<number, number>>({});
  const [defaultQuantity, setDefaultQuantity] = useState<number>(0);

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
        return bookTitle.includes(q) || authorName.includes(q);
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
      const mrp = s.overrideMrp || s.book?.mrp || 0;
      const placed = s.copiesPlaced || 0;
      const sold = s.soldStock || 0;

      totalPlaced += placed;
      totalSold += sold;
      totalRevenue += (sold * mrp);

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
  }, [currentLibrarySales, selectedLibrary]);

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

  // Authors NOT already present in this specific library
  const availableAuthorsToAdd = useMemo(() => {
    if (!selectedLibrary) return [];
    const existingAuthorIds = new Set(currentLibrarySales.map(s => s.authorId));
    return (platformAuthors || []).filter(a => !existingAuthorIds.has(a.id));
  }, [platformAuthors, currentLibrarySales, selectedLibrary]);

  // Books of the newly selected author in modal
  const newlySelectedAuthorObj = useMemo(() => {
    if (!newAuthorId) return null;
    return platformAuthors.find(a => a.id.toString() === newAuthorId) || null;
  }, [newAuthorId, platformAuthors]);

  const newlySelectedAuthorBooks = useMemo(() => {
    if (!newlySelectedAuthorObj) return [];
    return (newlySelectedAuthorObj.books || []).filter((b: any) => !b.isArchived);
  }, [newlySelectedAuthorObj]);

  // When author changes in modal, auto-select all their books with default copies
  const handleAuthorSelectionChange = (authorIdStr: string) => {
    setNewAuthorId(authorIdStr);
    if (!authorIdStr) {
      setSelectedBookIds([]);
      setBookQuantities({});
      return;
    }

    const author = platformAuthors.find(a => a.id.toString() === authorIdStr);
    const books = (author?.books || []).filter((b: any) => !b.isArchived);
    const bookIds = books.map((b: any) => b.id);
    setSelectedBookIds(bookIds);

    const qtyMap: Record<number, number> = {};
    bookIds.forEach((id: number) => {
      qtyMap[id] = defaultQuantity || 10;
    });
    setBookQuantities(qtyMap);
  };

  // Toggle book selection checkbox in modal
  const toggleBookSelection = (bookId: number) => {
    setSelectedBookIds(prev => {
      if (prev.includes(bookId)) {
        return prev.filter(id => id !== bookId);
      } else {
        return [...prev, bookId];
      }
    });
  };

  // Select all or deselect all books in modal
  const handleSelectAllBooks = () => {
    if (selectedBookIds.length === newlySelectedAuthorBooks.length) {
      setSelectedBookIds([]);
    } else {
      const allIds = newlySelectedAuthorBooks.map((b: any) => b.id);
      setSelectedBookIds(allIds);
      const qtyMap = { ...bookQuantities };
      allIds.forEach((id: number) => {
        if (!qtyMap[id]) qtyMap[id] = defaultQuantity || 10;
      });
      setBookQuantities(qtyMap);
    }
  };

  // Start single row edit (only this row becomes editable)
  const startEdit = (sale: LibrarySaleItem) => {
    setEditingSaleId(sale.id);
    setEditPlaced(sale.copiesPlaced || 0);
    setEditSold(sale.soldStock || 0);
    setEditMrp(sale.overrideMrp !== null && sale.overrideMrp !== undefined ? sale.overrideMrp.toString() : (sale.book?.mrp?.toString() || ''));
    setEditNotes(sale.notes || '');
  };

  const cancelEdit = () => {
    setEditingSaleId(null);
  };

  // Save single row edit (committed to database)
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

  // Add Participant & Selected Books to Library
  const handleAddParticipantToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLibrary) {
      toast.error('No library selected');
      return;
    }
    if (!newAuthorId) {
      toast.error('Please select an author');
      return;
    }
    if (selectedBookIds.length === 0) {
      toast.error('Please select at least one book to place');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const authorIdNum = parseInt(newAuthorId);

      // Create payload for all selected books
      const salesPayload = selectedBookIds.map(bookId => {
        const bookObj = newlySelectedAuthorBooks.find((b: any) => b.id === bookId);
        const qty = bookQuantities[bookId] || defaultQuantity || 10;
        return {
          libraryId: selectedLibrary.id,
          authorId: authorIdNum,
          bookId: bookId,
          copiesPlaced: qty,
          soldStock: 0,
          overrideMrp: bookObj?.mrp ? parseFloat(bookObj.mrp) : null,
          notes: null
        };
      });

      await axios.post(
        `${API}/api/admin/library-sales`,
        {
          libraryId: selectedLibrary.id,
          sales: salesPayload
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Successfully added ${newlySelectedAuthorObj?.name || 'Author'} with ${selectedBookIds.length} book(s)`);
      setShowAddModal(false);
      setNewAuthorId('');
      setSelectedBookIds([]);
      setBookQuantities({});
      fetchData();
    } catch (err: any) {
      console.error('Error adding participant to library:', err);
      toast.error(err.response?.data?.error || 'Failed to add participant to library');
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
          'Books Placed',
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

          const row = worksheet.addRow([
            sNo++,
            s.book?.title || 'Unknown Title',
            mrp,
            s.author?.name || 'Unknown Author',
            placed,
            sold,
            revenue
          ]);

          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(5).alignment = { horizontal: 'center' };
          row.getCell(6).alignment = { horizontal: 'center' };
          row.getCell(7).alignment = { horizontal: 'center' };

          // Styling
          row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // Cyan author cell
          row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }; // Light green sold cell

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
          libraryMetrics.totalPlaced,
          libraryMetrics.totalSold,
          libraryMetrics.totalRevenue
        ]);

        worksheet.mergeCells(`A${grandTotalRow.number}:D${grandTotalRow.number}`);
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
        worksheet.mergeCells('A1:H1');
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
        worksheet.addRow(['Total Revenue (₹):', `₹${overallMetrics.totalRevenue.toLocaleString()}`]);
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-paa-navy hover:text-white text-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm group"
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

            {/* ADD PARTICIPANT (OPENS STREAMLINED MODAL) */}
            <button
              onClick={() => {
                setNewAuthorId('');
                setSelectedBookIds([]);
                setBookQuantities({});
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Participant / Book
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

        {/* BRIGHT COLORFUL KPI METRICS & LIBRARY INFO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Library Details Card */}
          <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-200/40 border-2 border-amber-300 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded shadow-xs">
                  Library Details
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${selectedLibrary.status === 'Inactive' ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-950'}`}>
                  {selectedLibrary.status || 'Active'}
                </span>
              </div>
              <h3 className="font-black text-paa-navy text-base tracking-tight">{selectedLibrary.name}</h3>
              <p className="text-xs text-amber-950 font-semibold mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                {selectedLibrary.shippingAddress || `${selectedLibrary.city}, ${selectedLibrary.state}`}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-amber-300/70 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-950 font-bold">
              {selectedLibrary.contactPerson && (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-800" />
                  <span>{selectedLibrary.contactPerson}</span>
                  {selectedLibrary.contactNumber && (
                    <span className="text-amber-800/80 font-semibold">({selectedLibrary.contactNumber})</span>
                  )}
                </div>
              )}
              {selectedLibrary.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-800" />
                  <span>{selectedLibrary.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* BRIGHT COLORFUL KPI CARDS */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Authors */}
            <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100">Authors</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-white">{libraryMetrics.uniqueAuthors}</div>
                <div className="text-[11px] text-indigo-100 font-bold mt-0.5">{libraryMetrics.totalTitles} Titles Listed</div>
              </div>
            </div>

            {/* Placed */}
            <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-100">Placed</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-white">{libraryMetrics.totalPlaced}</div>
                <div className="text-[11px] text-cyan-100 font-bold mt-0.5">Copies Stocked</div>
              </div>
            </div>

            {/* Sold */}
            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Sold</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-white">{libraryMetrics.totalSold}</div>
                <div className="text-[11px] text-emerald-100 font-bold mt-0.5">{libraryMetrics.totalRemaining} in Stock</div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-white">₹{libraryMetrics.totalRevenue.toLocaleString()}</div>
                <div className="text-[11px] text-amber-100 font-bold mt-0.5">Direct Sales Value</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar for Specific Library */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search author or book title in this library..."
              value={detailSearch}
              onChange={e => setDetailSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium"
            />
          </div>
          <div className="text-xs text-gray-600 font-bold">
            Showing <span className="text-paa-navy font-black text-sm">{filteredLibrarySales.length}</span> listed book entries
          </div>
        </div>

        {/* EVENT-STYLE EXCEL SHEET TABLE */}
        <div className="flex flex-col border-[2px] border-black shadow-md overflow-hidden bg-white">
          {/* Cyan Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#00D8F5] p-2.5 border-b-[2px] border-black font-bold">
            <h2 className="text-black uppercase text-xs sm:text-[13px] m-0 tracking-wide font-black">
              LIST OF BOOKS FOR {selectedLibrary.name.toUpperCase()} - {authorGroupedSales.length} AUTHORS ({filteredLibrarySales.length} TITLES)
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-black font-black uppercase bg-white/90 px-2.5 py-1 rounded border-[1.5px] border-black">
                REVENUE: ₹{libraryMetrics.totalRevenue.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  setNewAuthorId('');
                  setSelectedBookIds([]);
                  setBookQuantities({});
                  setShowAddModal(true);
                }}
                className="bg-white text-black px-3.5 py-1 text-xs font-black uppercase tracking-wider border-[1.5px] border-black hover:bg-gray-100 transition-colors shadow-xs"
              >
                + ADD PARTICIPANT
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-sans border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-10 text-center font-black text-black">S.No</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-56 text-left px-2 font-black text-black">Book Title</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-20 text-center font-black text-black">MRP (₹)</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-40 text-left px-2 font-black text-black">Author Name</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center font-black text-black">Books Placed</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center font-black text-black">Actual<br/>Copies Sold</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-24 text-center font-black text-black">Revenue (₹)</th>
                  <th className="border-[1.5px] border-black bg-[#FFE600] p-1.5 w-28 text-center font-black text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center border-[1.5px] border-black">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                        <span className="text-xs font-bold text-gray-500">Loading library sales records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLibrarySales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 italic border-[1.5px] border-black">
                      No book placements found for this library. Click "+ Add Participant / Book" to add authors and books.
                    </td>
                  </tr>
                ) : (
                  authorGroupedSales.map((group, gIdx) => {
                    return group.items.map((sale, itemIdx) => {
                      const isEditing = editingSaleId === sale.id;

                      const mrp = sale.overrideMrp || sale.book?.mrp || 0;
                      const placed = sale.copiesPlaced || 0;
                      const sold = sale.soldStock || 0;
                      const revenue = sold * mrp;

                      let previousCount = 0;
                      for (let i = 0; i < gIdx; i++) {
                        previousCount += authorGroupedSales[i].items.length;
                      }
                      const rowSNo = previousCount + itemIdx + 1;

                      return (
                        <tr key={sale.id} className="hover:brightness-95 transition-all bg-white">
                          {/* S.No */}
                          <td className="border-[1.5px] border-black bg-red-600 text-white font-black text-center p-1">
                            {rowSNo}
                          </td>

                          {/* Book Title */}
                          <td className="border-[1.5px] border-black bg-[#ffcccc] text-black font-bold p-1 px-2 truncate max-w-[200px] text-left" title={sale.book?.title}>
                            {sale.book?.title || 'Unknown Title'}
                          </td>

                          {/* MRP (Editable only when isEditing is true) */}
                          <td className={`border-[1.5px] border-black text-center font-mono font-bold ${isEditing ? 'bg-white p-0' : 'bg-[#ffddaa] p-1 text-black'}`}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editMrp}
                                onChange={e => setEditMrp(e.target.value)}
                                placeholder={sale.book?.mrp?.toString() || '0'}
                                className="w-full h-full p-1 text-center outline-none font-bold bg-white text-black border-2 border-indigo-500"
                                autoFocus
                              />
                            ) : (
                              mrp
                            )}
                          </td>

                          {/* Author Name (Primary name only, no nickname) */}
                          <td className="border-[1.5px] border-black bg-[#00ffff] text-black font-bold p-1 px-2 truncate max-w-[160px] text-left" title={group.author.name}>
                            <span className="font-black text-black">
                              {group.author.name || sale.author?.name || 'Unknown Author'}
                            </span>
                          </td>

                          {/* Copies Placed (Editable only when isEditing is true) */}
                          <td className={`border-[1.5px] border-black text-center font-bold ${isEditing ? 'bg-white p-0' : 'bg-[#ffddaa] p-1 text-black'}`}>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editPlaced}
                                onChange={e => setEditPlaced(parseInt(e.target.value) || 0)}
                                className="w-full h-full p-1 text-center outline-none font-bold bg-white text-black border-2 border-indigo-500"
                              />
                            ) : (
                              placed
                            )}
                          </td>

                          {/* Copies Sold (Editable only when isEditing is true) */}
                          <td className={`border-[1.5px] border-black text-center font-bold ${isEditing ? 'bg-white p-0' : 'bg-emerald-100 p-1 text-emerald-900 font-black'}`}>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editSold}
                                onChange={e => setEditSold(parseInt(e.target.value) || 0)}
                                className="w-full h-full p-1 text-center outline-none font-bold bg-white text-emerald-900 border-2 border-emerald-500"
                              />
                            ) : (
                              sold
                            )}
                          </td>

                          {/* Revenue */}
                          <td className="border-[1.5px] border-black bg-[#e6f4ea] text-black text-center font-black p-1">
                            ₹{revenue.toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="border-[1.5px] border-black bg-gray-50 p-1 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 justify-center px-1">
                                <button
                                  onClick={() => handleSaveRow(sale.id)}
                                  disabled={isSaving}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10px] font-black flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                  <Save className="w-3.5 h-3.5" /> Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={isSaving}
                                  className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => startEdit(sale)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                  title="Edit row"
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
                  <tr className="bg-[#FFE600] font-black text-black border-t-2 border-black">
                    <td colSpan={4} className="border-[1.5px] border-black text-right p-2 uppercase tracking-widest text-[11px] font-black">
                      GRAND TOTAL
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">
                      {libraryMetrics.totalPlaced}
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-emerald-900 font-black">
                      {libraryMetrics.totalSold}
                    </td>
                    <td className="border-[1.5px] border-black text-center p-2 text-xs bg-white text-black font-black">
                      ₹{libraryMetrics.totalRevenue.toLocaleString()}
                    </td>
                    <td className="border-[1.5px] border-black bg-[#FFE600]"></td>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-paa-navy hover:text-white text-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
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
              Directory of all Airport Flybraries and Public Libraries. Click "Edit Sales" on any library to manage its sales sheet.
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

          {/* DOWNLOAD REPORT */}
          <button
            onClick={() => handleDownloadExcel()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Download Overall Report
          </button>
        </div>
      </div>

      {/* BRIGHT COLORFUL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Libraries Active: Vibrant Blue/Sky */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-md flex items-center gap-3.5 relative overflow-hidden">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-blue-100 uppercase tracking-wider">Libraries Active</div>
            <div className="text-2xl font-black text-white">{overallMetrics.activeLibraries}</div>
          </div>
        </div>

        {/* Total Books Sold: Vibrant Emerald/Teal */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-md flex items-center gap-3.5 relative overflow-hidden">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-emerald-100 uppercase tracking-wider">Total Books Sold</div>
            <div className="text-2xl font-black text-white">{overallMetrics.totalSold}</div>
          </div>
        </div>

        {/* Total Revenue: Vibrant Amber/Orange */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex items-center gap-3.5 relative overflow-hidden">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
            <IndianRupee className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-black text-amber-100 uppercase tracking-wider">Total Revenue</div>
            <div className="text-2xl font-black text-white">₹{overallMetrics.totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-paa-navy/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Type Filter:</label>
            <select
              value={masterTypeFilter}
              onChange={e => setMasterTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
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

      {/* BRIGHT YELLOW HEADER & COLORFUL MASTER TABLE OF ALL LIBRARIES */}
      <div className="border-[2px] border-black shadow-md overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#FFE600] border-b-[2px] border-black text-black font-black uppercase tracking-wider text-[11px]">
                <th className="py-3 px-2 w-12 text-center border-r border-black/30">S.No</th>
                <th className="py-3 px-4 border-r border-black/30">Library / Flybrary Name</th>
                <th className="py-3 px-4 border-r border-black/30">Location</th>
                <th className="py-3 px-3 text-center border-r border-black/30">No. of Authors</th>
                <th className="py-3 px-3 text-center border-r border-black/30">Books Placed</th>
                <th className="py-3 px-3 text-center border-r border-black/30">Books Sold</th>
                <th className="py-3 px-3 text-center border-r border-black/30">Revenue (₹)</th>
                <th className="py-3 px-3 text-center border-r border-black/30">Status</th>
                <th className="py-3 px-4 text-center w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center border-b border-black/20">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                      <span className="text-xs font-bold text-gray-500">Loading libraries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLibraries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 italic border-b border-black/20">
                    No libraries found matching your criteria. Click "+ Add Library" to create one.
                  </td>
                </tr>
              ) : (
                filteredLibraries.map((lib, idx) => {
                  const placed = lib.totalPlaced || 0;
                  const sold = lib.totalSold || 0;
                  const revenue = lib.totalRevenue || 0;
                  const authorsCount = lib.totalAuthors || 0;
                  
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-[#fcf8e8]/60';

                  return (
                    <tr 
                      key={lib.id} 
                      className={`${rowBg} hover:bg-amber-100/70 transition-colors border-b border-gray-200 cursor-pointer`}
                      onClick={() => setSelectedLibrary(lib)}
                    >
                      {/* S.No */}
                      <td className="py-3 px-2 text-center font-black text-black border-r border-gray-200">
                        <span className="inline-block w-6 h-6 rounded bg-amber-200/90 text-black text-center leading-6 font-bold">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Library Name & Type */}
                      <td className="py-3 px-4 font-bold text-gray-900 border-r border-gray-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center flex-shrink-0 border border-amber-300">
                            <LibraryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-black text-paa-navy text-sm flex items-center gap-1.5">
                              {lib.name}
                            </div>
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded uppercase tracking-wide">
                              {lib.type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-gray-700 border-r border-gray-200">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>{lib.city}, {lib.state}</span>
                        </div>
                        {lib.airportCode && (
                          <div className="text-[10px] font-black text-indigo-700 ml-5">
                            Code: {lib.airportCode}
                          </div>
                        )}
                      </td>

                      {/* No. of Authors */}
                      <td className="py-3 px-3 text-center border-r border-gray-200">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-[#00ffff]/30 text-blue-950 border border-cyan-400">
                          <Users className="w-3 h-3" />
                          {authorsCount}
                        </span>
                      </td>

                      {/* Books Placed */}
                      <td className="py-3 px-3 text-center font-black text-gray-900 border-r border-gray-200 bg-[#ffddaa]/25">
                        {placed}
                      </td>

                      {/* Books Sold */}
                      <td className="py-3 px-3 text-center font-black text-emerald-700 border-r border-gray-200 bg-[#e6f4ea]">
                        {sold}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-3 text-center font-black text-amber-900 border-r border-gray-200 bg-amber-50">
                        ₹{revenue.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center border-r border-gray-200">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${lib.status === 'Inactive' ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-950'}`}>
                          {lib.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Primary Edit / Open Sales Button */}
                          <button
                            onClick={() => setSelectedLibrary(lib)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-lg text-xs font-black shadow-sm transition-all"
                            title="Open Sales Sheet"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Sales</span>
                          </button>

                          {/* Edit Info Button */}
                          <button
                            onClick={() => openEditLibrary(lib)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                            title="Edit Library Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Library */}
                          <button
                            onClick={() => handleDeleteLibrary(lib.id, lib.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200"
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
  // HELPER: MODALS (STREAMLINED ADD PARTICIPANT & ADD/EDIT LIBRARY)
  // =========================================================================
  function renderModals() {
    return (
      <>
        {/* STREAMLINED ADD PARTICIPANT & BOOKS MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-amber-500/15 text-amber-700 rounded-xl flex items-center justify-center font-bold border border-amber-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-paa-navy">
                      Add Participant to {selectedLibrary?.name || 'Library'}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Select an author and their books to place in this library
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddParticipantToLibrary} className="space-y-4 pt-4">
                {/* 1. Author Dropdown (Filtered to ONLY authors not yet in this library) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-gray-800">
                      Select Author *
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {availableAuthorsToAdd.length} authors available
                    </span>
                  </div>
                  <select
                    required
                    value={newAuthorId}
                    onChange={e => handleAuthorSelectionChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">
                      {availableAuthorsToAdd.length > 0 ? 'Choose an author...' : 'All authors are already in this library'}
                    </option>
                    {availableAuthorsToAdd.map(a => (
                      <option key={a.id} value={a.id.toString()}>
                        {a.name} {a.books?.length ? `(${a.books.length} book${a.books.length > 1 ? 's' : ''})` : '(0 books)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Books Selection with Checkboxes and Placed Quantities */}
                {newAuthorId && (
                  <div className="space-y-3 pt-2 border-t border-gray-100 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-gray-800">
                        Select Books to Place ({selectedBookIds.length}/{newlySelectedAuthorBooks.length})
                      </label>
                      {newlySelectedAuthorBooks.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllBooks}
                          className="text-[11px] font-black text-[#b44d28] hover:underline"
                        >
                          {selectedBookIds.length === newlySelectedAuthorBooks.length ? 'Deselect All' : 'Select All Books'}
                        </button>
                      )}
                    </div>

                    {newlySelectedAuthorBooks.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium text-center">
                        This author has no active books uploaded in their profile yet.
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                        {newlySelectedAuthorBooks.map((book: any) => {
                          const isSelected = selectedBookIds.includes(book.id);
                          const currentQty = bookQuantities[book.id] ?? defaultQuantity ?? 10;

                          return (
                            <div
                              key={book.id}
                              onClick={() => toggleBookSelection(book.id)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-white border-amber-400 shadow-xs ring-1 ring-amber-400/20'
                                  : 'bg-white/60 border-gray-200 opacity-65 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent container click
                                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                                />
                                <div className="truncate">
                                  <div className="text-xs font-bold text-gray-900 truncate">
                                    {book.title}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-semibold">
                                    MRP: ₹{book.mrp || 0}
                                  </div>
                                </div>
                              </div>

                              {/* Placed copies input for this specific book */}
                              {isSelected && (
                                <div 
                                  className="flex items-center gap-1.5 flex-shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="text-[10px] font-bold text-gray-500">Placed:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={currentQty}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 1;
                                      setBookQuantities(prev => ({ ...prev, [book.id]: val }));
                                    }}
                                    className="w-16 p-1 text-center text-xs font-black border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Submit Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !newAuthorId || selectedBookIds.length === 0}
                    className="flex-1 py-2.5 bg-[#b44d28] hover:bg-[#963c1e] text-white rounded-xl text-xs font-black shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Adding...' : `Add Participant & ${selectedBookIds.length} Book(s)`}
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
