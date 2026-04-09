import { useState } from 'react';
import { ArrowLeft, Mail, MessageCircle, Phone, Send, HelpCircle, AlertCircle } from 'lucide-react';

interface SupportProps {
  onBack: () => void;
}

export function ContactSupport({ onBack }: SupportProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [submitted, setSubmitted] = useState(false);

  const faqItems = [
    {
      question: 'How do I create a new group?',
      answer: 'Click on "Create a group" in the dropdown menu or from the Groups page. Enter the group name and add members by their names.'
    },
    {
      question: 'How do I split expenses fairly?',
      answer: 'Use the Fairness Calculator tool from the dropdown menu. Add all people and their expenses, and the calculator will show who owes whom and how much.'
    },
    {
      question: 'Can I join an existing group?',
      answer: 'Yes! Ask the group creator for a share code, paste it in the "Join Group" section, and you\'ll be added to the group.'
    },
    {
      question: 'How do I view my wallet balance?',
      answer: 'Click on "Wallet" in the dropdown menu to see your balance, income and expense history, and add new transactions.'
    },
    {
      question: 'How do I delete an expense?',
      answer: 'Open a group, find the expense in the list, and click the delete/trash icon. The expense will be removed immediately.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! Your data is encrypted and stored securely. Only you and members of your groups can view group data.'
    },
    {
      question: 'Can I edit my profile?',
      answer: 'Yes, go to "Your account" in the dropdown menu to update your display name and change your password.'
    },
    {
      question: 'How do I export my data?',
      answer: 'Currently, we support copying settlement information to clipboard. Full data export feature is coming soon!'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    console.log('Support form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        type: 'general'
      });
      setActiveTab('faq');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-8 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10">
            <ArrowLeft className="h-6 w-6 text-slate-200" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">Support</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Contact Support</h1>
          </div>
        </div>

        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setActiveTab('faq')}
            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition ${activeTab === 'faq' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
          >
            <HelpCircle className="h-5 w-5" />
            <span>FAQ</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition ${activeTab === 'contact' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
          >
            <MessageCircle className="h-5 w-5" />
            <span>Contact Us</span>
          </button>
        </div>

        {activeTab === 'faq' && (
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details key={index} className="dark-card cursor-pointer rounded-[24px] p-6">
                <summary className="flex items-center gap-3 font-semibold text-white transition hover:text-cyan-200">
                  <HelpCircle className="h-5 w-5 flex-shrink-0 text-cyan-300" />
                  <span>{item.question}</span>
                </summary>
                <p className="mt-4 ml-8 leading-relaxed text-slate-400">{item.answer}</p>
              </details>
            ))}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="dark-card rounded-[28px] p-8">
            <h2 className="mb-6 font-display text-2xl font-semibold text-white">Get in Touch</h2>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
                <Mail className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
                <h3 className="mb-1 font-semibold text-white">Email</h3>
                <p className="text-sm text-slate-400">support@budgetexpense.com</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
                <Phone className="mx-auto mb-3 h-8 w-8 text-emerald-300" />
                <h3 className="mb-1 font-semibold text-white">Phone</h3>
                <p className="text-sm text-slate-400">+1 (555) 123-4567</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
                <MessageCircle className="mx-auto mb-3 h-8 w-8 text-violet-300" />
                <h3 className="mb-1 font-semibold text-white">Chat</h3>
                <p className="text-sm text-slate-400">Live chat available 9-5 EST</p>
              </div>
            </div>

            {submitted && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
                <AlertCircle className="h-5 w-5" />
                <span>Thank you for contacting us! We’ll get back to you soon.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="your.email@example.com" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Issue Type</label>
                <select name="type" value={formData.type} onChange={handleInputChange} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25">
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="billing">Billing Issue</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Subject</label>
                <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} required className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25" placeholder="Brief subject of your inquiry" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Message</label>
                <textarea name="message" value={formData.message} onChange={handleInputChange} required rows={6} className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-100 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 resize-none" placeholder="Please describe your issue in detail..." />
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(124,58,237,0.22)] transition hover:from-violet-400 hover:to-cyan-400">
                <Send className="h-5 w-5" />
                <span>Send Message</span>
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              <span className="font-semibold">Response Time:</span> We typically respond to inquiries within 24-48 hours. Thank you for your patience!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
