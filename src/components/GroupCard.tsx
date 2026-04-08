import React, { useState } from 'react';
import { Users, Calendar, MapPin, Plane, Copy, Trash2, Plus, MessageCircle, Share2 } from 'lucide-react';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    location: string;
    members: number;
    date: string;
    totalExpenses: number;
    currency: string;
    imageUrl?: string;
  };
  onViewDetails: (groupId: string) => void;
  onDelete: (groupId: string) => void;

  // ✅ UPDATED: no argument (same as GroupView)
  onAddExpense?: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onViewDetails,
  onDelete,
  onAddExpense
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const getCoverImageUrl = () => {
    if (group.imageUrl) return group.imageUrl;

    const covers = [
      '/images/covers/cover-1.svg',
      '/images/covers/cover-2.svg',
      '/images/covers/cover-3.svg',
      '/images/covers/cover-4.svg',
    ] as const;

    let hash = 0;
    const groupId = group.id || 'default';

    for (let i = 0; i < groupId.length; i++) {
      hash = (hash * 31 + groupId.charCodeAt(i)) | 0;
    }

    const idx = Math.abs(hash) % covers.length;
    return covers[idx];
  };

  const handleCopy = async () => {
    if (group.id) {
      console.log('Attempting to copy share code:', group.id);
      
      try {
        await navigator.clipboard.writeText(group.id);
        console.log('Share code copied successfully');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = group.id;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleNativeShare = async () => {
    if (group.id && typeof navigator.share === 'function') {
      const joinLink = `${window.location.origin}?join=${group.id}`;
      const shareMessage = `Join my expense group "${group.name}"`;
      
      try {
        await navigator.share({
          title: 'Join Expense Group',
          text: shareMessage,
          url: joinLink
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy if native share not available
      handleCopy();
    }
  };

  const handleWhatsAppShare = () => {
    if (group.id) {
      const joinLink = `${window.location.origin}?join=${group.id}`;
      const message = `Join my expense group "${group.name}" using this link: ${joinLink}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div
      className="relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group"
      onClick={() => group.id && onViewDetails(group.id)}
    >
      {/* Background */}
      <div
        className="relative h-32 bg-cover bg-center rounded-t-2xl"
        style={{
          backgroundImage: `url('${getCoverImageUrl()}')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute top-4 right-4 bg-blue-500 p-2 rounded-full shadow-lg">
          <Plane className="w-5 h-5 text-white" />
        </div>

        <div className="absolute bottom-4 left-4 flex items-center text-white text-lg font-semibold">
          <MapPin className="w-5 h-5 mr-2" />
          <span>{group.name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gradient-gold font-pacifico mb-4 capitalize">
          {group.location}
        </h3>

        <div className="flex items-center text-gray-700 mb-2">
          <Users className="w-4 h-4 mr-2 text-gray-500" />
          <span>{group.members} travelers</span>
        </div>

        <div className="flex items-center text-gray-700 mb-4">
          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
          <span>{group.date}</span>
        </div>

        {/* Share Code */}
        <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2 mb-4">
          <span className="font-mono text-gray-700 text-sm truncate flex-1 mr-2">
            {window.location.origin}?join={group.id}
          </span>

          <div className="flex space-x-2">
            {/* Copy */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopy();
              }}
              className={`transition-colors ${
                isCopied ? 'text-green-600' : 'text-gray-600 hover:text-gray-800'
              }`}
              title={isCopied ? 'Code copied!' : 'Copy share code'}
            >
              {isCopied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Native Share (for mobile) */}
            {typeof navigator.share === 'function' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNativeShare();
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                title="Share via apps"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* WhatsApp Share */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWhatsAppShare();
              }}
              className="text-gray-600 hover:text-green-600 transition-colors"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(group.id || '');
              }}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Delete group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expenses */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-800">
              Total expenses:
            </span>
            <span className="text-lg font-bold text-purple-600">
              ₹{group.totalExpenses ? group.totalExpenses.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* ✅ FIXED BUTTON */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (onAddExpense) {
              onAddExpense(); // ✅ SAME behavior as GroupView
              return;
            }

            if (group.id) {
              onViewDetails(group.id);
            }
          }}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>
    </div>
  );
};

export default GroupCard;