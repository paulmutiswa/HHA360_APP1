import { useEffect, useState, useMemo } from 'react';
import { Search, Copy, Check, FileText, Info, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { seedTemplates, TEMPLATE_CATEGORIES, type TemplateDef } from '@/lib/templateData';

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('template_library').select('*').order('sort_order');
      if (data && data.length > 0) {
        setTemplates(data.map(t => ({ id: t.id, title: t.title, category: t.category, description: t.description, body: t.body })));
      } else {
        setTemplates(seedTemplates);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const ms = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
      const mc = category === 'All' || t.category === category;
      return ms && mc;
    });
  }, [templates, search, category]);

  const handleCopy = async (id: string, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadWord = (t: TemplateDef) => {
    const documentHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(t.title)}</title><style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.6;color:#111827;}h1{font-size:20px;margin-bottom:24px;}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11pt;}</style></head><body><h1>${escapeHtml(t.title)}</h1><pre>${escapeHtml(t.body)}</pre></body></html>`;
    const blob = new Blob([documentHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${toFileName(t.title)}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };  const handlePrint = (t: TemplateDef) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${escapeHtml(t.title)}</title><style>body{font-family:Inter,sans-serif;padding:40px;max-width:700px;margin:auto;line-height:1.6;}h1{font-size:18px;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h1>${escapeHtml(t.title)}</h1><pre>${escapeHtml(t.body)}</pre></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Template Center</h2>
        <p className="mt-1 text-sm text-slate-500">Home health and home care templates you can preview, copy, download as Word, and print.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-xs text-amber-800">These templates are for general guidance only and are not legal advice. Have all documents reviewed by an attorney or compliance professional before use.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${category === cat ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map(t => (
          <div key={t.id} className="card flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><FileText className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                  <span className="badge mt-0.5 bg-slate-100 text-slate-600">{t.category}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => handleDownloadWord(t)} className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-700">
                  <Download className="h-3.5 w-3.5" />
                  Word
                </button>
                <button onClick={() => handleCopy(t.id, t.body)} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${copiedId === t.id ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {copiedId === t.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === t.id ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => handlePrint(t)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Print</button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t.description}</p>
            <pre className="mt-3 flex-1 overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 ring-1 ring-slate-100" style={{ maxHeight: '280px' }}>{t.body}</pre>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">No templates found</p></div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
