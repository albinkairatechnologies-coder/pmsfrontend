'use client';

import { useEffect, useState } from 'react';
import { companyAPI } from '../../utils/api';
import { FiSave } from 'react-icons/fi';

export default function CompanySettingsPage() {
  const [form, setForm] = useState({
    company_name: '', company_address: '', company_phone: '',
    company_email: '', company_website: '', company_logo_path: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    companyAPI.getLetterhead().then(r => setForm(r.data)).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyAPI.updateLetterhead(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
  };

  const fields = [
    { key: 'company_name', label: 'Company Name', type: 'text' },
    { key: 'company_address', label: 'Address', type: 'text' },
    { key: 'company_phone', label: 'Phone', type: 'text' },
    { key: 'company_email', label: 'Email', type: 'email' },
    { key: 'company_website', label: 'Website', type: 'text' },
    { key: 'company_logo_path', label: 'Logo File Path (server path)', type: 'text' },
  ];

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white mb-8">Company Settings</h1>
      <div className="card max-w-2xl">
        <h2 className="text-lg font-semibold mb-6">Letterhead Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">
          These details appear on all generated PDF reports.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key] || ''}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="input" />
            </div>
          ))}

          {/* Preview */}
          {form.company_name && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 mt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Preview</p>
              <p className="font-bold text-blue-700">{form.company_name}</p>
              {form.company_address && <p className="text-sm text-gray-600">{form.company_address}</p>}
              <p className="text-sm text-gray-500">
                {[form.company_phone, form.company_email, form.company_website].filter(Boolean).join(' | ')}
              </p>
            </div>
          )}

          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave /> Save Settings
          </button>
          {saved && <p className="text-green-600 text-sm">✓ Settings saved successfully</p>}
        </form>
      </div>
    </div>
  );
}
