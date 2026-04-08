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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Contact Support</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            <span>FAQ</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Contact Us</span>
          </button>
        </div>

        {/* FAQ Section */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details key={index} className="bg-white rounded-lg shadow-md p-6 cursor-pointer">
                <summary className="font-semibold text-gray-900 flex items-center space-x-3 hover:text-blue-600 transition-colors">
                  <HelpCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{item.question}</span>
                </summary>
                <p className="mt-4 ml-8 text-gray-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        )}

        {/* Contact Form Section */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>

            {/* Contact Methods */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col items-center p-6 bg-blue-50 rounded-lg">
                <Mail className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                <p className="text-gray-600 text-center text-sm">support@budgetexpense.com</p>
              </div>
              <div className="flex flex-col items-center p-6 bg-green-50 rounded-lg">
                <Phone className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                <p className="text-gray-600 text-center text-sm">+1 (555) 123-4567</p>
              </div>
              <div className="flex flex-col items-center p-6 bg-purple-50 rounded-lg">
                <MessageCircle className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Chat</h3>
                <p className="text-gray-600 text-center text-sm">Live chat available 9-5 EST</p>
              </div>
            </div>

            {/* Success Message */}
            {submitted && (
              <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5" />
                <span>Thank you for contacting us! We'll get back to you soon.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General Inquiry</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="billing">Billing Issue</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief subject of your inquiry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Please describe your issue in detail..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Send Message</span>
              </button>
            </form>

            {/* Response Time */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Response Time:</span> We typically respond to inquiries within 24-48 hours. Thank you for your patience!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
