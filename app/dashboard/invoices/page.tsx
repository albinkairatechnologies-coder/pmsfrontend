'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoiceAPI, clientAPI } from '../../utils/api';
import { useAuth } from '../../utils/AuthContext';
import { FiFileText, FiPlus, FiPrinter, FiTrash2, FiCheckCircle, FiClock, FiDollarSign, FiShare2, FiMail, FiSend, FiAlertCircle, FiChevronRight, FiX, FiInfo, FiRotateCw, FiFolderMinus, FiPhone } from 'react-icons/fi';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ClientInfo {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);

  // UI Modals & View State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [form, setForm] = useState({
    client_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due
    billed_to: { name: '', company: '', email: '', phone: '', address: '', gst_number: '' },
    billed_by: { company: 'KAIRA TECHNOLOGIES', email: 'info@kairatechnologies.in', phone: '6379430293', address: 'Kovilpatti, Tamil Nadu, India' },
    tax_percent: 18.00, // Default GST in India
    notes: '',
    payment_terms: 'Payable within 14 days via UPI, Net Banking, or GPay.',
    invoice_type: 'with_gst',
  });
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Summary stats
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, cancelled: 0, count: 0 });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);

    // Safe independent load for Invoices
    try {
      const invRes = await invoiceAPI.getAll();
      setInvoices(invRes.data);

      // Calculate statistics
      let total = 0, pending = 0, paid = 0, cancelled = 0;
      invRes.data.forEach((inv: any) => {
        const val = parseFloat(inv.total_amount || 0);
        if (inv.status === 'cancelled') {
          cancelled += val;
        } else {
          total += val;
          if (inv.status === 'paid') paid += val;
          else if (inv.status === 'sent' || inv.status === 'overdue') pending += val;
        }
      });
      setStats({ total, pending, paid, cancelled, count: invRes.data.length });
    } catch (err) {
      console.error("Failed to load invoices ledger data:", err);
    }

    // Safe independent load for Clients list
    try {
      const clRes = await clientAPI.getAll();
      setClients(clRes.data || []);
    } catch (err) {
      console.error("Failed to load clients list for invoicing dropdown:", err);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Helper: Sync billed_to when client_id changes
  const handleClientChange = (cid: string) => {
    const selected = clients.find(c => c.id === parseInt(cid));
    if (selected) {
      setForm(prev => ({
        ...prev,
        client_id: cid,
        billed_to: {
          name: selected.contact_person || '',
          company: selected.company_name || '',
          email: selected.email || '',
          phone: selected.phone || '',
          address: 'Client Office Address', // Placeholder
          gst_number: ''
        }
      }));
    } else {
      setForm(prev => ({
        ...prev,
        client_id: '',
        billed_to: { name: '', company: '', email: '', phone: '', address: '', gst_number: '' }
      }));
    }
  };

  // Line item management
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateItemField = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const nextItems = [...lineItems];
    const item = { ...nextItems[idx] };

    if (field === 'description') {
      item.description = value as string;
    } else {
      const num = parseFloat(value as string) || 0;
      if (field === 'quantity') item.quantity = num;
      if (field === 'unit_price') item.unit_price = num;
      item.total = item.quantity * item.unit_price;
    }
    nextItems[idx] = item;
    setLineItems(nextItems);
  };

  // Realtime totals
  const subtotal = lineItems.reduce((acc, it) => acc + it.total, 0);
  const taxAmount = (subtotal * (form.tax_percent / 100));
  const grandTotal = subtotal + taxAmount;

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.billed_to.company || lineItems.some(i => !i.description.trim() || i.total < 0)) {
      alert("Please fill complete invoice details.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        client_id: form.client_id ? parseInt(form.client_id) : null,
        line_items: lineItems,
        subtotal,
        tax_percent: form.tax_percent,
        tax_amount: taxAmount,
        total_amount: grandTotal,
        status: 'sent' // Default as sent (Unpaid) on creation
      };

      await invoiceAPI.create(payload);
      setShowCreateModal(false);
      // Reset form
      setForm({
        client_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        billed_to: { name: '', company: '', email: '', phone: '', address: '', gst_number: '' },
        billed_by: { company: 'KAIRA TECHNOLOGIES', email: 'info@kairatechnologies.in', phone: '6379430293', address: 'Kovilpatti, Tamil Nadu, India' },
        tax_percent: 18.00,
        notes: '',
        payment_terms: 'Payable within 14 days via UPI, Net Banking, or GPay.',
        invoice_type: 'with_gst',
      });
      setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
      fetchInvoices();
    } catch (err) {
      alert("Error creating invoice. Make sure all required fields are valid.");
    } finally {
      setSubmitting(false);
    }
  };

  // INSTANT STATUS MODIFICATION SYSTEM
  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await invoiceAPI.update(id, { status: newStatus });
      // Reflect update in Preview state if active
      if (previewInvoice && previewInvoice.id === id) {
        setPreviewInvoice({ ...previewInvoice, status: newStatus });
      }
      fetchInvoices();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this invoice?")) return;
    try {
      await invoiceAPI.delete(id);
      setPreviewInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleWhatsAppShare = (inv: any) => {
    const to = typeof inv.billed_to === 'string' ? JSON.parse(inv.billed_to) : inv.billed_to;
    const clientName = to?.company || to?.name || 'Client';
    const phone = to?.phone?.replace(/\D/g, '');

    const message = `Hi ${clientName},\n\nThis is a quick update regarding your Invoice *${inv.invoice_number}* from *Kaira Technologies*.\n\n*Total Outstanding Amount:* ₹${parseFloat(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n*Invoice Status:* ${inv.status?.toUpperCase()}\n*Due Date:* ${new Date(inv.due_date).toLocaleDateString()}\n\nPlease clear the dues via GPay or Net Banking.\n\nThank you for your business!`;

    const url = phone
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const downloadDirectPDF = (inv: any) => {
    const element = document.getElementById('printable-invoice-surface');
    if (!element) {
      alert("Printable canvas area not initialized.");
      return;
    }

    const getBase64FromUrl = async (url: string): Promise<string> => {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const getBase64FromImage = (imgEl: HTMLImageElement | null): string => {
      if (!imgEl) return '';
      try {
        const canvas = document.createElement('canvas');
        // Ensure we capture full natural resolution of already-rendered graphic
        canvas.width = imgEl.naturalWidth || imgEl.width || 800;
        canvas.height = imgEl.naturalHeight || imgEl.height || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(imgEl, 0, 0);
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.error("Direct canvas capture failed:", e);
        return '';
      }
    };

    const opt = {
      margin: [1.75, 0, 1.25, 0], // Dynamically inject physical [top, left, bottom, right] gaps in inches on EVERY sliced page
      filename: `Invoice_${inv.invoice_number || 'record'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css', avoid: '.avoid-break' }
    };

    const runSave = async () => {
      const html2pdf = (window as any).html2pdf;

      // 1. Bypassing Network Routes: Extract loaded Image binaries directly from the active DOM canvas!
      // This ensures 100% immunity against custom subdirectories or reverse-proxy routing on DigitalOcean!
      const topImgEl = element.querySelector('.letterhead-top-fixed') as HTMLImageElement | null;
      const botImgEl = element.querySelector('.letterhead-bottom-fixed') as HTMLImageElement | null;

      let topData = getBase64FromImage(topImgEl);
      let bottomData = getBase64FromImage(botImgEl);

      // Secondary Network Fallback if DOM extraction is blocked by Security Policies
      if (!topData) {
        try {
          topData = await getBase64FromUrl(topImgEl?.src || '/letterpadtop.png');
        } catch (e) {
          console.error("Letterhead top network fallback failed:", e);
        }
      }
      if (!bottomData) {
        try {
          bottomData = await getBase64FromUrl(botImgEl?.src || '/letterpadbottom.png');
        } catch (e) {
          console.error("Letterhead bottom network fallback failed:", e);
        }
      }

      // 2. Get original DOM styling and temporarily force fully visible auto-height expansion with locked width to prevent content shifting
      const origOverflow = element.style.overflow;
      const origHeight = element.style.height;
      const origWidth = element.style.width;
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      element.style.width = '794px'; // Lock layout to exact A4 pixel width for absolute capture alignment

      // CRITICAL FIX: Force parent window body & documentElement to allow infinite scrolling during capture
      // NextJS / Tailwind modals set body overflow to 'hidden', which triggers html2canvas to clip at Page 1!
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      // We MUST temporarily zero out the on-screen margin-top/bottom of the content area
      // because html2pdf's opt.margin is now injecting those gaps dynamically on every physical page!
      const contentEl = element.querySelector('.print-area-content') as HTMLElement;
      let origContentMTop = '', origContentMBot = '';
      if (contentEl) {
        origContentMTop = contentEl.style.marginTop;
        origContentMBot = contentEl.style.marginBottom;
        contentEl.style.setProperty('margin-top', '0', 'important');
        contentEl.style.setProperty('margin-bottom', '0', 'important');
      }

      // 3. Temporarily hide HTML letterhead images to prevent duplicate renders on static capture
      const rawImgs = element.querySelectorAll('.letterhead-top-fixed, .letterhead-bottom-fixed');
      rawImgs.forEach((img: any) => { img.style.visibility = 'hidden'; });

      // 4. Dynamically compute the EXACT vertical viewport height required to capture ALL sliced pages
      const totalHeight = element.scrollHeight || 1200;
      const dynamicOpt = {
        ...opt,
        html2canvas: {
          ...opt.html2canvas,
          height: totalHeight,
          windowHeight: totalHeight
        }
      };

      // 5. Execute html2pdf pipeline with industrial multi-page jsPDF injection!
      try {
        await html2pdf()
          .set(dynamicOpt)
          .from(element)
          .toPdf()
          .get('pdf')
          .then((pdf: any) => {
            if (!topData || !bottomData) return;
            const pdfPages = pdf.internal.getNumberOfPages();
            const PAGE_W = 8.2673; // A4 width in inches
            const PAGE_H = 11.6929; // A4 height in inches
            const topH = PAGE_W * 0.20759; // Calculated header aspect ratio (fits precisely into top margin gap)
            const bottomH = PAGE_W * 0.14341; // Calculated footer aspect ratio (fits precisely into bottom margin gap)

            for (let i = 1; i <= pdfPages; i++) {
              pdf.setPage(i);
              // Top image anchored absolutely at (0,0) in its clean, pre-spaced margin
              pdf.addImage(topData, 'PNG', 0, 0, PAGE_W, topH, undefined, 'FAST');
              // Bottom image anchored absolutely at (0, PAGE_H - bottomH) in its clean, pre-spaced margin
              pdf.addImage(bottomData, 'PNG', 0, PAGE_H - bottomH, PAGE_W, bottomH, undefined, 'FAST');
            }
            (window as any).LATEST_PDF_BASE64 = pdf.output('datauristring');
          })
          .save();
      } catch (err) {
        console.error("PDF Generation failed", err);
        alert("Could not generate PDF correctly. Try using 'Print Window' mode.");
      } finally {
        // 6. Restore HTML node visibility and layout properties for visual consistency
        element.style.overflow = origOverflow;
        element.style.height = origHeight;
        element.style.width = origWidth;
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
        if (contentEl) {
          contentEl.style.marginTop = origContentMTop;
          contentEl.style.marginBottom = origContentMBot;
        }
        rawImgs.forEach((img: any) => { img.style.visibility = 'visible'; });
      }
    };

    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = runSave;
      document.head.appendChild(script);
    } else {
      runSave();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Printable Style Hacks */}
      <style>{`
        /* Content Boundary Safeguards for both Screen & Print (Using strict pixels for html2canvas reliability) */
        .print-area-content {
          margin-top: 174px !important;
          margin-bottom: 136px !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        /* Screen-based Absolute Anchors */
        .letterhead-top-fixed {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          z-index: 50 !important;
        }
        .letterhead-bottom-fixed {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          width: 100% !important;
          z-index: 50 !important;
        }

        @media print {
          body { 
            background-color: #FFFFFF !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { 
            visibility: visible !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-only { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            box-shadow: none !important; 
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }

          /* Re-apply high-precision millimeters for native printer driver splitting */
          .print-area-content {
            margin-top: 46mm !important;
            margin-bottom: 36mm !important;
          }

          /* Locked Repetition Anchors for browser page splitting */
          .letterhead-top-fixed {
            position: fixed !important;
            top: 0 !important;
          }
          .letterhead-bottom-fixed {
            position: fixed !important;
            bottom: 0 !important;
          }

          @page { 
            size: A4 portrait; 
            margin: 0 !important; 
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Header Layout */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text">Sales Billing & Ledgers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Build robust GST invoices, manage returned orders and monitor receivables.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchInvoices} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 hover:text-white transition-all" title="Refresh Data">
            <FiRotateCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary py-2.5 px-5 shadow-lg shadow-primary-500/20">
            <FiPlus size={16} className="stroke-[3px]" /> Generate Invoice
          </button>
        </div>
      </div>

      {/* Financial Dashboard Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 no-print">
        <div className="stat-card-luxury border-l-4 border-l-primary-500">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Sales Billed</p>
            <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-2">{formatCurrency(stats.total)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Excluding cancelled invoices</p>
          </div>
        </div>

        <div className="stat-card-luxury border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest">Paid / Collected</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(stats.paid)}</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card-luxury border-l-4 border-l-yellow-500">
          <div>
            <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest">Pending (Unpaid)</p>
            <h3 className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mt-2">{formatCurrency(stats.pending)}</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-yellow-500 h-full" style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card-luxury border-l-4 border-l-rose-500">
          <div>
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Returned / Cancelled</p>
            <h3 className="text-2xl font-black text-red-500 dark:text-red-400 mt-2">{formatCurrency(stats.cancelled)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">{stats.count} total records logged</p>
          </div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="card overflow-hidden p-0 border border-gray-100 dark:border-white/5 no-print">
        <div className="bg-gray-50 dark:bg-white/[0.02] px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><FiFileText className="text-primary-400" /> Invoices & Billing Ledger</h3>
          <span className="text-xs bg-primary-500/10 text-primary-400 font-mono px-2.5 py-1 rounded-lg border border-primary-500/20">{invoices.length} Total Entries</span>
        </div>

        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center text-gray-400">
            <FiRotateCw className="animate-spin text-4xl text-primary-500 mb-4" />
            <p className="font-medium font-mono text-sm uppercase tracking-wider">Synchronizing Ledger...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-24 text-center">
            <FiFileText className="mx-auto text-gray-700 text-5xl mb-4 stroke-[1.5]" />
            <h4 className="text-lg font-bold text-gray-300">No Sales History Found</h4>
            <p className="text-gray-500 text-sm mt-1">You haven't generated any tax invoices yet.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-6 px-6">Generate First Invoice</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/5">
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Invoice ID</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Client / Recipient</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Billed Date</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Due</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Payment Status</th>
                  <th className="py-3.5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {invoices.map(inv => {
                  const clientData = typeof inv.billed_to === 'string' ? JSON.parse(inv.billed_to) : inv.billed_to;
                  const status = inv.status || 'draft';

                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-primary-400 font-black bg-primary-500/10 border border-primary-500/20 px-2 py-1 rounded">{inv.invoice_number}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{clientData?.company || 'Walk-in Client'}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{clientData?.name}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date(inv.invoice_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                        <p className="text-[10px] text-red-400 font-medium mt-1">Due: {new Date(inv.due_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-black text-gray-800 dark:text-white text-sm">{formatCurrency(parseFloat(inv.total_amount))}</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Incl. GST</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center">
                          {/* EASY SELECT BOX FOR INSTANT STATUS CHANGES */}
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                            className={`text-xs font-bold rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer transition-all ${status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                              status === 'overdue' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                status === 'cancelled' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                  'bg-blue-500/10 border-blue-500/30 text-blue-400' // standard sent/unpaid
                              }`}
                          >
                            <option value="sent" className="bg-dark text-white">Unpaid (Sent)</option>
                            <option value="paid" className="bg-dark text-white">Paid</option>
                            <option value="overdue" className="bg-dark text-white">Overdue</option>
                            <option value="cancelled" className="bg-dark text-white">Cancelled / Return</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setPreviewInvoice(inv)} className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 hover:bg-primary-500/20 text-gray-400 hover:text-primary-400 border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all" title="Print / Preview">
                            <FiPrinter size={14} />
                          </button>
                          <button onClick={() => handleWhatsAppShare(inv)} className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 hover:bg-green-500/20 text-green-500 border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all" title="WhatsApp Client">
                            <FiShare2 size={14} />
                          </button>
                          {user?.role === 'admin' && (
                            <button onClick={() => handleDeleteInvoice(inv.id)} className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" title="Delete Record">
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── BEAUTIFUL NEAT CREATE INVOICE FORM MODAL ── */}
      {showCreateModal && (
        <div className="modal-overlay no-print flex items-center justify-center">
          <div className="modal-box max-w-4xl w-full p-0 overflow-hidden bg-white dark:bg-[#0d0f14] border border-gray-200 dark:border-white/10 shadow-2xl rounded-3xl animate-zoom-in">

            {/* Premium Branded Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-[#131722] dark:to-[#0d0f14]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20">
                  <FiFileText size={20} className="stroke-[2px]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Generate Sales Tax Invoice</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider">Official GST Billing Management</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-red-500 transition-all"><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar text-gray-900 dark:text-white">

              {/* STEP 1: Core Billing Particulars Container */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left side: Customer Selection & Dates (3 cols) */}
                <div className="lg:col-span-3 space-y-6">

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary-500">
                      <span className="text-[10px] font-black bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded">01</span>
                      <label className="text-xs font-bold uppercase tracking-widest">Select Billing Recipient</label>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/40 transition-all cursor-pointer text-gray-800 dark:text-gray-200 appearance-none"
                        value={form.client_id}
                        onChange={(e) => handleClientChange(e.target.value)}
                        required
                      >
                        <option value="" className="bg-white dark:bg-dark text-gray-400">-- Choose Active Client to Invoice --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-dark text-gray-800 dark:text-white">{c.company_name} ({c.contact_person})</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <FiChevronRight className="rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-primary-500">
                        <span className="text-[10px] font-black bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded">02</span>
                        <label className="text-xs font-bold uppercase tracking-widest">Billed Date</label>
                      </div>
                      <input type="date" className="w-full rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold outline-none focus:border-primary-500 text-gray-800 dark:text-gray-100" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Due</span> Deadline</label>
                      <input type="date" className="w-full rounded-xl bg-red-50/50 dark:bg-red-500/[0.03] border border-red-100 dark:border-red-500/20 px-4 py-2.5 text-xs font-bold outline-none text-red-600 dark:text-red-400 focus:border-red-500" value={form.due_date} min={form.invoice_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
                    </div>
                  </div>
                </div>

                {/* Right side: Rich Auto Populated Client Display (2 cols) */}
                <div className="lg:col-span-2 bg-primary-50/30 dark:bg-primary-500/[0.03] border border-primary-100/60 dark:border-primary-500/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-inner">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary-500/5 rounded-full blur-xl group-hover:bg-primary-500/10 transition-all duration-700"></div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between border-b border-primary-100 dark:border-primary-500/10 pb-2.5">
                      <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest flex items-center gap-1.5"><FiInfo /> Recipient Info</span>
                      <span className="text-[10px] bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold px-2 py-0.5 rounded border border-primary-500/20">Auto Sync</span>
                    </div>

                    {form.billed_to.company ? (
                      <div className="space-y-2 pt-1">
                        <p className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight leading-tight">{form.billed_to.company}</p>
                        <div className="space-y-1 font-semibold text-xs text-gray-600 dark:text-gray-400">
                          {form.billed_to.name && <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span> {form.billed_to.name}</p>}
                          {form.billed_to.email && <p className="flex items-center gap-1.5"><FiMail className="text-primary-500" size={12} /> {form.billed_to.email}</p>}
                          {form.billed_to.phone && <p className="flex items-center gap-1.5"><FiPhone className="text-primary-500" size={12} /> {form.billed_to.phone}</p>}
                        </div>
                        {form.tax_percent > 0 && (
                          <div className="mt-3 pt-3 border-t border-primary-100 dark:border-primary-500/10">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Client GSTIN (Optional)</label>
                            <input type="text" className="w-full rounded-xl bg-white dark:bg-[#0d0f14] border border-gray-200 dark:border-white/10 px-3 py-2 text-xs font-bold outline-none focus:border-primary-500 text-gray-800 dark:text-gray-100 uppercase transition-all" placeholder="Enter 15-digit GSTIN" value={form.billed_to.gst_number || ''} onChange={e => setForm({ ...form, billed_to: { ...form.billed_to, gst_number: e.target.value.toUpperCase() } })} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-400 font-medium flex flex-col items-center justify-center gap-2 animate-pulse">
                        <FiChevronRight className="rotate-90 text-primary-400" size={20} />
                        Choose a client to populate their verified business details.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 2: Service Particulars Catalog Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">03</span>
                    <label className="text-xs font-black text-gray-900 dark:text-gray-200 uppercase tracking-widest flex items-center gap-1.5"><FiFolderMinus className="text-gray-400" /> Particulars & Rates Catalog</label>
                  </div>
                  <button type="button" onClick={addLineItem} className="text-[11px] text-primary-500 dark:text-primary-400 hover:bg-primary-500/10 hover:text-primary-600 bg-primary-50 dark:bg-primary-500/[0.05] border border-primary-200 dark:border-primary-500/20 px-3.5 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all shadow-sm"><FiPlus size={13} className="stroke-[3px]" /> Add Item Row</button>
                </div>

                {/* Line Item Grid Headers */}
                <div className="grid grid-cols-12 gap-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <div className="col-span-6">Description of Service</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Rate (₹)</div>
                  <div className="col-span-1 text-right">Subtotal</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-gray-50/60 dark:bg-white/[0.02] border border-gray-200/80 dark:border-white/5 p-3 rounded-2xl transition-all hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                      <div className="col-span-6">
                        <input type="text" className="w-full rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5 bg-white dark:bg-[#13161c] text-xs font-bold outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 text-gray-800 dark:text-white placeholder-gray-400" placeholder="Particular specification (e.g., Digital Marketing Package)" value={item.description} onChange={e => updateItemField(idx, 'description', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="1" className="w-full rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5 bg-white dark:bg-[#13161c] text-xs font-extrabold text-center outline-none focus:border-primary-500 text-gray-800 dark:text-white" value={item.quantity} onChange={e => updateItemField(idx, 'quantity', e.target.value)} required />
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" className="w-full rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5 bg-white dark:bg-[#13161c] text-xs font-extrabold text-right outline-none focus:border-primary-500 text-gray-800 dark:text-white" placeholder="0.00" value={item.unit_price} onChange={e => updateItemField(idx, 'unit_price', e.target.value)} required />
                      </div>
                      <div className="col-span-1 font-black text-xs text-gray-900 dark:text-white text-right font-mono tracking-tighter">
                        ₹{item.total.toLocaleString('en-IN')}
                      </div>
                      <div className="col-span-1 text-center">
                        <button type="button" disabled={lineItems.length === 1} onClick={() => removeLineItem(idx)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 disabled:opacity-10 mx-auto transition-all" title="Remove Row"><FiTrash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 3: Summary Balance & GST Breakdown */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 pt-4 border-t border-gray-100 dark:border-white/5">

                {/* Left: Custom Notes Inputs */}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice Note / Remarks</label>
                    <textarea className="w-full rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 p-3 h-[76px] text-xs font-semibold resize-none outline-none focus:border-primary-500 text-gray-800 dark:text-gray-200 placeholder-gray-400/60" placeholder="Add internal tracking notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settlement Instructions</label>
                    <textarea className="w-full rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 p-3 h-[76px] text-xs font-semibold resize-none outline-none focus:border-primary-500 text-gray-800 dark:text-gray-200" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} />
                  </div>
                </div>

                {/* Right: Beautiful Total Box */}
                <div className="w-full md:w-80 bg-gray-50 dark:bg-[#131722] border border-gray-200 dark:border-white/5 p-6 rounded-3xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between gap-2 bg-gray-200/50 dark:bg-white/5 p-1 rounded-xl mb-4">
                    <button type="button" onClick={() => setForm({ ...form, tax_percent: 18 })} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.tax_percent > 0 ? 'bg-white dark:bg-[#1f2937] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>With GST</button>
                    <button type="button" onClick={() => setForm({ ...form, tax_percent: 0 })} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.tax_percent === 0 ? 'bg-white dark:bg-[#1f2937] text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Without GST</button>
                  </div>

                  <div className="flex justify-between text-gray-500 dark:text-gray-400 font-extrabold text-[11px] uppercase tracking-wider">
                    <span>Gross Subtotal</span>
                    <span className="text-gray-900 dark:text-white font-mono font-black">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {form.tax_percent > 0 && (
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-extrabold text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">GST Tax (%) <input type="number" step="0.5" className="w-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-primary-500 text-primary-500 dark:text-primary-400 font-black font-mono" value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: parseFloat(e.target.value) || 0 })} /></span>
                      <span className="text-gray-900 dark:text-white font-mono font-black">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-white/10 my-2.5"></div>

                  <div className="flex justify-between items-center pt-0.5">
                    <span className="uppercase text-[11px] tracking-widest text-gray-400 font-extrabold">Grand Total</span>
                    <div className="text-right">
                      <span className="text-2xl text-primary-600 dark:text-primary-400 font-black font-mono tracking-tighter">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <p className="text-[9px] text-gray-400 font-semibold tracking-normal uppercase -mt-0.5">All Inclusive Due</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Modal Actions Footer */}
              <div className="flex items-center justify-end gap-4 pt-2 no-print">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-extrabold tracking-wider uppercase rounded-xl border border-gray-200 dark:border-white/10 transition-all">Discard</button>
                <button type="submit" disabled={submitting} className="px-8 py-3 bg-primary-600 text-white text-xs font-black tracking-wider uppercase rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50">
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving Ledger...
                    </>
                  ) : (
                    'Finalize & Generate Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── HIGH QUALITY BRANDED PRINTABLE INVOICE MODAL ── */}
      {previewInvoice && (() => {
        const to = typeof previewInvoice.billed_to === 'string' ? JSON.parse(previewInvoice.billed_to) : previewInvoice.billed_to;
        const from = typeof previewInvoice.billed_by === 'string' ? JSON.parse(previewInvoice.billed_by) : previewInvoice.billed_by;
        const items = typeof previewInvoice.line_items === 'string' ? JSON.parse(previewInvoice.line_items) : previewInvoice.line_items || [];

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4 md:p-8 no-scrollbar backdrop-blur-sm no-print">
            <div className="modal-box w-full max-w-3xl my-8 p-0 bg-white text-gray-900 print-only rounded-2xl shadow-2xl border border-gray-200 overflow-visible animate-slide-up">
              {/* Screen Controls Bar (Always hidden during native print) */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl no-print">
                <div className="flex items-center gap-2">
                  <FiFileText className="text-primary-600" size={18} />
                  <span className="font-black text-gray-700 font-mono">Invoice #{previewInvoice.invoice_number}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => downloadDirectPDF(previewInvoice)} className="px-5 py-2 bg-emerald-600 text-white text-xs font-black tracking-wider uppercase rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-md transition-all">
                    <FiSend size={14} /> Direct Download PDF
                  </button>
                  <button onClick={() => window.print()} className="px-5 py-2 bg-primary-600 text-white text-xs font-black tracking-wider uppercase rounded-xl hover:bg-primary-700 flex items-center gap-2 shadow-md transition-all">
                    <FiPrinter size={14} className="stroke-[3px]" /> Print Window
                  </button>
                  <button onClick={() => setPreviewInvoice(null)} className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-all">Close</button>
                </div>
              </div>

              {/* PRINTABLE PHYSICAL SURFACE AREA */}
              <div id="printable-invoice-surface" className="bg-white print-area relative w-full min-h-[297mm] flex flex-col justify-between">

                {/* Top Letterhead Image */}
                <img src="/letterpadtop.png" alt="Header" data-html2canvas-ignore="true" className="w-full h-auto object-cover z-10 block letterhead-top-fixed" />

                <div className="px-12 pt-2 pb-12 relative z-20 flex-1 print-area-content">
                  {/* Header Section */}
                  <div className="flex items-center mb-4">
                    <h1 className="text-2xl md:text-3xl font-black text-[#0F2537] tracking-tighter uppercase">Invoice</h1>
                  </div>

                  {/* Bill To & Meta Info */}
                  <div className="grid grid-cols-2 gap-8 mt-8">
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-900 mb-3 tracking-wide">Bill To:</h3>
                      <div className="space-y-1 text-xs font-bold text-gray-900">
                        <p>Client Name: <span className="font-medium text-gray-600">{to?.name || 'Walk-in Customer'}</span></p>
                        <p>Company Name: <span className="font-medium text-gray-600">{to?.company || 'N/A'}</span></p>
                        <p>Billing Address: <span className="font-medium text-gray-600">{to?.address || 'Local Customer Address'}</span></p>
                        {to?.gst_number && parseFloat(previewInvoice.tax_percent) > 0 && (
                          <p>GSTIN: <span className="font-medium text-gray-600 tracking-wider uppercase">{to.gst_number}</span></p>
                        )}
                        <p>Phone: <span className="font-medium text-gray-600">{to?.phone || 'N/A'}</span></p>
                        <p>Email: <span className="font-medium text-gray-600">{to?.email || 'N/A'}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end text-right text-xs font-bold text-gray-900 mb-1">
                      <p className="mb-1">Invoice Number: <span className="font-medium text-gray-600">{previewInvoice.invoice_number}</span></p>
                      <p>Invoice Date: <span className="font-medium text-gray-600">{new Date(previewInvoice.invoice_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                      {parseFloat(previewInvoice.tax_percent) > 0 && (
                        <p className="mt-1">GSTIN: <span className="font-medium text-gray-600 tracking-wider">33CYRPM9388Q1Z0</span></p>
                      )}
                    </div>
                  </div>

                  {/* Service Details Header & Elegant Yellow Table */}
                  <h3 className="font-extrabold text-xl text-gray-900 mt-10 mb-3 tracking-wide">Service Details:</h3>
                  <div className="overflow-hidden border-b border-gray-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F3C246] text-[#1F2937] font-extrabold">
                          <th className="py-3 px-4 w-12 text-center">No</th>
                          <th className="py-3 px-4">Description of Service</th>
                          <th className="py-3 px-4 text-center w-20">Quantity</th>
                          <th className="py-3 px-4 text-right w-28">Rate (₹)</th>
                          <th className="py-3 px-4 text-right w-28">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#374151] font-semibold">
                        {items.map((item: any, i: number) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-[#F3F4F6]' : 'bg-white'}>
                            <td className="py-3 px-4 text-center text-gray-900">{i + 1}</td>
                            <td className="py-3 px-4 text-gray-900 font-bold">{item.description}</td>
                            <td className="py-3 px-4 text-center">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-gray-900 font-bold">₹{parseFloat(item.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Terms and Summary Block */}
                  <div className="grid grid-cols-2 gap-8 mt-8">
                    <div className="text-xs text-gray-800 font-bold">
                      <h3 className="text-base font-extrabold text-gray-900 mb-3 tracking-wide">Terms and Conditions:</h3>
                      <ul className="list-disc list-inside pl-1 space-y-1 font-medium text-gray-600">
                        <li>Payment is due upon receipt of this invoice.</li>
                        <li>Late payments may incur additional statutory interest charges.</li>
                        <li>{previewInvoice.payment_terms || 'Please complete payments via authorized bank transfer.'}</li>
                        {previewInvoice.notes && <li>Note: {previewInvoice.notes}</li>}
                      </ul>
                    </div>
                    <div className="flex justify-end">
                      <div className="w-64 text-sm font-semibold text-gray-800">
                        <div className="flex justify-between py-1 px-1 border-b border-gray-100">
                          <span className="text-gray-500 font-bold">Subtotal</span>
                          <span>₹{parseFloat(previewInvoice.subtotal).toFixed(2)}</span>
                        </div>
                        {parseFloat(previewInvoice.tax_percent) > 0 && (
                          <div className="flex justify-between py-1 px-1 border-b border-gray-100">
                            <span className="text-gray-500 font-bold">Tax ({parseFloat(previewInvoice.tax_percent)}%)</span>
                            <span>₹{parseFloat(previewInvoice.tax_amount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-3 px-1 font-black text-gray-900 border-b-4 border-double border-gray-900 mt-1 text-base">
                          <span>Total Amount Due</span>
                          <span>₹{parseFloat(previewInvoice.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="avoid-break break-inside-avoid">
                    {/* Thick Navy Separator Bar */}
                    <div className="w-full bg-[#0F2537] text-white py-3.5 px-12 -mx-12 mt-14 flex items-center font-extrabold text-lg tracking-widest uppercase">
                      Payment Information:
                    </div>

                    {/* Footer Section holding details & signature area */}
                    <div className="grid grid-cols-2 gap-8 mt-8">
                      <div className="text-xs font-bold text-[#111827] space-y-6">
                        <div className="space-y-1">
                          <p>Payment Method: <span className="font-medium text-gray-600">NEFT / RTGS / IMPS</span></p>
                          <p>Due Date: <span className="font-medium text-gray-600">{new Date(previewInvoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                          <div className="mt-2 pt-3 border-t border-gray-200">
                            <p className="text-gray-500 uppercase tracking-widest text-[9px] mb-1.5 font-black">Bank Account Details</p>
                            <p>Account Name: <span className="font-medium text-gray-600">KAIRA TECHNOLOGIES</span></p>
                            <p>Account No: <span className="font-medium text-gray-600 font-mono tracking-wider">50200100674261</span></p>
                            <p>IFSC Code: <span className="font-medium text-gray-600 font-mono tracking-wider">HDFC0002021</span></p>
                            <p>Bank Name: <span className="font-medium text-gray-600">HDFC Bank, KOVILPATTI BRANCH</span></p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-black text-lg text-gray-900 tracking-wide mb-2">Questions</h4>
                          <p>Email US: <span className="font-medium text-gray-600">info@kairatechnologies.in</span></p>
                          <p>Call US: <span className="font-medium text-gray-600">6379430293</span></p>
                        </div>
                      </div>

                      {/* Date and Authorize Section */}
                      <div className="flex flex-col items-center justify-end">
                        <p className="text-xs font-bold text-gray-900 mb-6">Date: <span className="font-medium text-gray-600">{new Date(previewInvoice.invoice_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>

                        <div className="w-56 flex flex-col items-center text-center relative">
                          {/* Clean digital representation of an authorized signature mark - ABOVE THE LINE */}
                          <div className="text-blue-800 text-4xl opacity-90 select-none transform -rotate-3 mb-1 font-semibold" style={{ fontFamily: "'Brush Script MT', 'Alex Brush', 'Great Vibes', cursive" }}>
                            {from?.company?.split(' ')[0] || 'Kaira'}
                          </div>

                          {/* Divider and text below it */}
                          <div className="w-full border-t border-gray-900 pt-2 mt-1">
                            <p className="font-extrabold text-gray-900 text-xs tracking-wide uppercase">{from?.company || 'Kaira Technologies'}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Authorized Signatory</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Letterhead Image */}
                <div className="w-full mt-auto block letterhead-bottom-fixed" data-html2canvas-ignore="true">
                  <img src="/letterpadbottom.png" alt="Footer" className="w-full h-auto object-cover block" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
