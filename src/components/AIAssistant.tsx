import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Info } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTED = [
  'Who should I contact at a hospital for referrals?',
  'What should I say to a discharge planner?',
  'What documents should be in an employee file?',
  'Create a hospital introduction email.',
  'What should I bring when meeting a case manager?',
  'How should I follow up after contacting a hospital?',
];

function generateResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('hospital') && q.includes('contact')) {
    return `For hospital referrals, the key contacts are typically:\n\n1. Discharge Planners / Case Managers — They coordinate patient discharges and often select home care providers.\n2. Social Workers — They help patients find community resources, including home care.\n3. Care Coordinators — Some hospitals have dedicated care coordination teams.\n\nApproach: Start with the discharge planning department. Ask for the discharge planner or social work supervisor. Introduce your agency professionally, bring a referral packet, and ask about their referral process.\n\nNote: This is general business guidance. Each hospital has its own structure and processes.`;
  }
  if (q.includes('discharge planner') && q.includes('say')) {
    return `When speaking with a discharge planner:\n\n1. Be concise — they are busy. Lead with what you offer.\n2. Introduce yourself and your agency briefly.\n3. Ask about their referral process — don't just pitch.\n4. Mention your services, service area, and availability.\n5. Offer to send a referral packet or schedule a visit.\n6. Ask for a specific follow-up time.\n\nExample opener: "Hi, this is [Name] with [Agency]. We provide [services] in [area] and I'd love to learn about your referral process and whether we could be a resource for your team."\n\nLog the call in your CRM and schedule a follow-up.`;
  }
  if (q.includes('employee file') || q.includes('caregiver file')) {
    return `An employee/caregiver file should include:\n\n- Completed employment application\n- Resume and interview notes\n- Signed offer letter\n- I-9 with supporting documents\n- W-4\n- Emergency contact information\n- Signed job description\n- Background check authorization and results\n- Drug screen results (if applicable)\n- Driver's license and auto insurance copies\n- CPR / First Aid certifications\n- OIG exclusion list check\n- Signed employee handbook acknowledgment\n- HIPAA confidentiality agreement\n- Orientation completion sign-off\n- Training certificates\n- Performance evaluations\n- Any disciplinary documentation\n\nVerify file retention requirements with your state.`;
  }
  if (q.includes('hospital') && q.includes('email')) {
    return `Here's a hospital introduction email template:\n\nSubject: Introduction — [Agency Name] Home Care Services\n\nDear [Contact Name],\n\nI'm writing to introduce [Agency Name], a [state-licensed] home care agency serving [service area].\n\nWe provide [services] and work closely with discharge planners to ensure smooth transitions home. Our team is available 7 days a week and can accept referrals quickly.\n\nI'd welcome the opportunity to learn about your facility's referral process. Please contact me at [phone] or [email].\n\nThank you,\n[Your Name]\n[Agency Name]\n\nThis is a template — customize it for your agency and the specific facility.`;
  }
  if (q.includes('case manager') && q.includes('bring')) {
    return `When meeting a case manager in person, bring:\n\n1. Agency introduction / brochure\n2. Services list with service area\n3. License and insurance certificates\n4. W-9\n5. Referral form / intake process overview\n6. Business cards\n7. Any required affiliation documents\n8. A one-page summary of what makes your agency different\n\nBe prepared to discuss: your services, coverage area, availability, how quickly you can start care, and your quality/compliance practices.\n\nAfter the meeting, log it in your CRM and send a thank-you note.`;
  }
  if (q.includes('follow up') && q.includes('hospital')) {
    return `After contacting a hospital:\n\n1. Within 24 hours: Send a thank-you email with your referral packet attached.\n2. Within 1 week: Follow up by phone to confirm they received it and ask if they have questions.\n3. Within 2 weeks: Request an in-person visit if you haven't met yet.\n4. Ongoing: Stay in regular contact without being pushy — every 2-4 weeks is reasonable.\n5. Log every contact in your CRM with date, type, and summary.\n\nPatience is key — hospital relationships take time to develop. Focus on being helpful and responsive.`;
  }
  return `I can help with home-care business questions about:\n\n- Referral outreach and relationship building\n- Employee file and compliance requirements\n- Template documents (introduction letters, call scripts)\n- Meeting preparation with referral sources\n- Follow-up strategies\n- Caregiver file organization\n\nAsk me any of these, or try one of the suggested questions below.\n\nNote: For state-specific regulatory questions, I'll identify the jurisdiction and encourage you to verify with the appropriate government authority. I won't invent regulations or requirements.`;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm the HHA360 Assistant. I can help with home-care business questions, outreach scripts, compliance topics, and document templates. What would you like to know?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      const response = generateResponse(text);
      setMessages(m => [...m, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl"><Bot className="h-6 w-6 text-brand-600" /> HHA360 Assistant</h2>
        <p className="mt-1 text-sm text-slate-500">AI-powered guidance for home-care business operations.</p>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
        <p className="text-xs text-brand-800">For regulatory questions, I'll identify the jurisdiction and encourage verification with the appropriate authority. I never invent regulations or requirements.</p>
      </div>

      <div className="card flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="rounded-xl bg-slate-100 px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div></div>}
          <div ref={endRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)} className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="Ask a question..." value={input} onKeyDown={e => e.key === 'Enter' && send(input)} onChange={e => setInput(e.target.value)} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()} className="btn-primary"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
