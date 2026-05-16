'use client';

import { useState, useEffect } from 'react';
import { proposalAPI } from '../utils/api';
import { FiX, FiSend, FiFileText, FiUser, FiMapPin, FiBriefcase, FiCalendar } from 'react-icons/fi';

interface Props {
  client: { id: number; company_name: string; contact_person: string; email: string; phone?: string; };
  onClose: () => void;
  onSent: () => void;
}

const generateMOU = (client: any, data: { subject: string; clientAddress: string; technology: string; totalCost: number; advancePayment: number; balancePayment: number; timelineDays: number; }) => {
  const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const formattedCost = data.totalCost.toLocaleString('en-IN');
  const formattedAdvance = data.advancePayment.toLocaleString('en-IN');
  const formattedBalance = data.balancePayment.toLocaleString('en-IN');
  
  return `MEMORANDUM OF UNDERSTANDING (MOU)
Subject: ${data.subject}

This Memorandum of Understanding (MOU) is made on this ${todayDate}, between:

Service Provider:
Kaira Technologies
Represented by: Mrs. Selvalakshmi, Founder & CEO
Address: Kovilpatti, Tamil Nadu, India
Phone: +91 63834 94116

Client:
Name: ${client.contact_person || '[Client Name]'}
Company/Firm Name: ${client.company_name || '[Company Name]'}
Address: ${data.clientAddress || '[Client Address]'}
Contact No: ${client.phone || '[Contact No]'}

Project Scope
The Service Provider agrees to design and develop a ${data.technology} for ${client.company_name || '[Company Name]'}. The scope of work includes:
- Custom UI Design and layout creation
- Responsive (mobile-friendly) execution
- Basic Search Engine Optimization
- Essential Security integration
- Standard Contact form and setup
Any additional features outside the primary scope will be agreed and billed separately.

Project Timeline
The estimated project completion time is ${data.timelineDays} working days from the date of advance payment and receipt of all digital assets from the Client.

Payment Terms
Total Project Cost: ₹ ${formattedCost}
Advance Payment: ₹ ${formattedAdvance} before project commencement
Balance Payment: ₹ ${formattedBalance} upon project completion before final handover
All payments shall be made via Bank Transfer, GPay / PhonePe, or corporate UPI channels.

Client Responsibilities
The Client agrees to:
- Provide required logos, brand assets, and copy on time
- Coordinate and provide consolidated feedback rounds
- Release milestone payments as per the agreed schedule

Ownership & Rights
Upon clear balance payment, complete intellectual and structural ownership will transfer to the Client. The Service Provider retains portfolio showcasing rights.

Termination
Either party may formally terminate with written notice. Payments are non-refundable for work completed to date.

Confidentiality
Both legal entities commit to strictly safeguard proprietary data and code shared during engagement.

Website Handover & Offboarding
If the client chooses to transition to independent hosting or a different team down the line, Kaira Technologies guarantees the smooth handover of all cPanel credentials, source files, and ownership parameters upon request.

Additional Terms & Conditions
Revisions Limit
A limit of up to 2 design / content iterations is native to this agreement. Overflow revisions are billed at mutual flat rates.

Post-Delivery Support
We guarantee a 15-day complimentary hyper-care support window after final launch for troubleshooting bugs and guidance.

Limitation of Liability
Under no jurisdiction shall Kaira Technologies be liable for passive digital losses, third-party plugin breaks, or host outages.

Acceptance
By signing below, both parties agree to the terms and conditions mentioned in this MOU.

For Kaira Technologies
Name: Mrs. Selvalakshmi, Founder & CEO

For ${client.company_name || '[Company Name]'}
Name: ${client.contact_person || '[Client Name]'}`;
};

export default function SendProposalModal({ client, onClose, onSent }: Props) {
  // Form variables that drive the template
  const [subject, setSubject]           = useState('Website Development Agreement');
  const [clientAddress, setClientAddress] = useState('');
  const [technology, setTechnology]     = useState('professional website');
  const [totalCost, setTotalCost]       = useState(18500);
  const [advancePayment, setAdvancePayment] = useState(10000);
  const [balancePayment, setBalancePayment] = useState(8500);
  const [timelineDays, setTimelineDays] = useState(10);
  
  const [note, setNote]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [error, setError]               = useState('');
  
  const [proposalText, setProposalText] = useState(() => 
    generateMOU(client, { subject: 'Website Development Agreement', clientAddress: '', technology: 'professional website', totalCost: 18500, advancePayment: 10000, balancePayment: 8500, timelineDays: 10 })
  );
  const [isTextDirty, setIsTextDirty]   = useState(false);

  // Live-inject variables into template only if user hasn't manually typed in the editor
  useEffect(() => {
    if (!isTextDirty) {
      setProposalText(generateMOU(client, { subject, clientAddress, technology, totalCost, advancePayment, balancePayment, timelineDays }));
    }
  }, [subject, clientAddress, technology, totalCost, advancePayment, balancePayment, timelineDays, isTextDirty, client]);

  // Auto-calculate balance if total/advance changes
  const handleTotalChange = (val: number) => {
    setTotalCost(val);
    const adv = Math.round(val * 0.5);
    setAdvancePayment(adv);
    setBalancePayment(val - adv);
  };

  const handleSend = async () => {
    setSending(true); setError('');
    try {
      await proposalAPI.send({
        client_id:    client.id,
        template_id:  'custom-mou',
        template_name: 'Custom MOU / Agreement',
        line_items:   [{ description: `Project Service: ${subject}`, quantity: 1, unit_price: totalCost, total: totalCost }],
        subtotal:     totalCost,
        tax_percent:  0,
        tax_amount:   0,
        total_amount: totalCost,
        note:         note || null,
        proposal_text: proposalText,
      });
      onSent();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box w-full max-w-6xl mx-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiFileText className="text-amber-500" /> Smart Proposal Workspace
            </h2>
            <p className="text-sm text-gray-500 mt-1">Crafting agreement for: <span className="font-bold text-gray-700 dark:text-gray-300">{client.company_name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            
            {/* LEFT: Dynamic Editor Workspace */}
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Live MOU Output Preview
                </label>
                {isTextDirty ? (
                  <button 
                    onClick={() => { setIsTextDirty(false); setProposalText(generateMOU(client, { subject, clientAddress, technology, totalCost, advancePayment, balancePayment, timelineDays })); }} 
                    className="text-[11px] font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                  >
                    🔄 Reset manual edits to sync with form
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    ● Fully synced with inputs
                  </span>
                )}
              </div>
              
              <textarea
                className="w-full flex-1 h-[580px] p-6 font-mono text-[11px] leading-relaxed bg-gray-50 dark:bg-[#161e2d] border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none resize-none text-gray-800 dark:text-gray-200 shadow-inner transition-all"
                value={proposalText}
                onChange={e => {
                  setProposalText(e.target.value);
                  setIsTextDirty(true);
                }}
                placeholder="Writing legal document..."
              />
            </div>

            {/* RIGHT: The Intelligent Form Sidebar */}
            <div className="flex flex-col justify-between space-y-6 overflow-y-auto max-h-[620px] pr-1">
              
              <div className="space-y-5">
                {/* Basic Dynamic Data Section */}
                <div className="rounded-2xl p-5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                    1. Document Setup
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FiBriefcase size={12} /> Project Subject
                    </label>
                    <input 
                      type="text" 
                      className="input w-full text-sm py-2" 
                      placeholder="E.g. E-Commerce Solution"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FiMapPin size={12} /> Client Address
                    </label>
                    <input 
                      type="text" 
                      className="input w-full text-sm py-2" 
                      placeholder="Enter Address (e.g., Thoothukudi, TN)"
                      value={clientAddress}
                      onChange={e => setClientAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Technology / Scope Keyword
                    </label>
                    <input 
                      type="text" 
                      className="input w-full text-sm py-2" 
                      placeholder="e.g., Flutter Mobile Application"
                      value={technology}
                      onChange={e => setTechnology(e.target.value)}
                    />
                  </div>
                </div>

                {/* Commercials Section */}
                <div className="rounded-2xl p-5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 pb-2">
                    2. Financial Terms
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        Total Cost (₹)
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        className={`input w-full py-1.5 text-sm font-bold ${(totalCost <= 0) ? 'border-red-500 dark:border-red-500/50 focus:ring-red-500/50' : ''}`} 
                        value={totalCost}
                        onChange={e => handleTotalChange(parseFloat(e.target.value) || 0)}
                      />
                      {totalCost <= 0 && <p className="text-[9px] text-red-500 mt-0.5">Must be &gt; 0</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <FiCalendar size={11} /> Duration
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        className={`input w-full py-1.5 text-sm ${(timelineDays <= 0) ? 'border-red-500 dark:border-red-500/50 focus:ring-red-500/50' : ''}`} 
                        value={timelineDays}
                        onChange={e => setTimelineDays(parseInt(e.target.value) || 0)}
                      />
                      {timelineDays <= 0 && <p className="text-[9px] text-red-500 mt-0.5">Must be &gt; 0</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">
                        Advance (₹)
                      </label>
                      <input 
                        type="number" 
                        className="input w-full py-1.5 text-[13px]" 
                        value={advancePayment}
                        onChange={e => setAdvancePayment(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">
                        Balance (₹)
                      </label>
                      <input 
                        type="number" 
                        className="input w-full py-1.5 text-[13px]" 
                        value={balancePayment}
                        onChange={e => setBalancePayment(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {totalCost !== (advancePayment + balancePayment) && (
                    <p className="text-[10px] font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-500/20 leading-tight flex items-start gap-1">
                      ⚠️ Split Mismatch: Advance ({advancePayment}) + Balance ({balancePayment}) equals {advancePayment + balancePayment}, but should equal Total ({totalCost}).
                    </p>
                  )}
                </div>

                {/* Note Section */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Quick Email Note (Optional)
                  </label>
                  <textarea
                    className="input w-full h-16 resize-none text-xs"
                    placeholder="Review the attached Website Development Agreement..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="space-y-3 pt-2 mt-auto border-t border-gray-100 dark:border-white/5">
                {error && (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-2 rounded-xl">
                    ⚠️ {error}
                  </div>
                )}

                {(() => {
                  const isFinancialValid = totalCost > 0 && timelineDays > 0 && totalCost === (advancePayment + balancePayment);
                  return (
                    <button 
                      onClick={handleSend} 
                      disabled={sending || !isFinancialValid} 
                      className={`btn-gold w-full py-3.5 shadow-xl flex items-center justify-center gap-2 font-bold transition-all ${(!isFinancialValid) ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}`}
                    >
                      {sending
                        ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Generating PDF...</>
                        : !isFinancialValid 
                          ? 'Resolve Mismatch above...'
                          : <><FiSend size={15} /> Send Agreement to {client.contact_person?.split(' ')[0] || 'Client'}</>
                      }
                    </button>
                  );
                })()}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
