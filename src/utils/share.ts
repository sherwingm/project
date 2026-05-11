/**
 * Build the join URL for a group share code.
 * Opening this URL should prompt the user to join the group (via ?join=CODE).
 */
export function getJoinUrl(shareCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  return `${origin}${pathname}?join=${encodeURIComponent(shareCode)}`;
}

export function normalizeShareIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function buildMemberShareUrl(groupShareCode: string, memberIdentifier: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const normalizedGroupCode = encodeURIComponent(groupShareCode.trim());
  const normalizedMemberId = encodeURIComponent(normalizeShareIdentifier(memberIdentifier));

  return `${origin}/share/${normalizedGroupCode}/member/${normalizedMemberId}`;
}

export function findMemberByIdentifier<T extends { id?: string; name: string }>(members: T[], memberIdentifier: string): T | undefined {
  const normalizedIdentifier = normalizeShareIdentifier(memberIdentifier);

  return members.find((member) => {
    const candidateIds = [member.id, member.name].filter(Boolean).map((value) => normalizeShareIdentifier(String(value)));
    return candidateIds.includes(normalizedIdentifier);
  });
}

/**
 * Copy join URL to clipboard. Returns true if successful.
 */
export async function copyJoinLink(shareCode: string): Promise<boolean> {
  const url = getJoinUrl(shareCode);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Use native share when available (e.g. mobile share sheet, share to WhatsApp, SMS, Email, etc.).
 * Falls back to copying the link when share is not available.
 */
export async function shareJoinLink(shareCode: string, groupName: string): Promise<'shared' | 'copied' | 'unsupported'> {
  const url = getJoinUrl(shareCode);
  const title = 'Join expense group';
  const text = `Join "${groupName}" on BudgeSplit to split expenses: ${url}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
      // Fallback to copy
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'unsupported';
  }
}

/**
 * Share to specific apps and methods - WhatsApp, SMS, Email, Telegram, etc.
 */
export async function shareToAllApps(shareCode: string, groupName: string): Promise<void> {
  const url = getJoinUrl(shareCode);
  const message = `Join "${groupName}" on BudgeSplit to split expenses: ${url}`;
  
  // WhatsApp
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  
  // SMS
  const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
  
  // Email
  const emailUrl = `mailto:?subject=${encodeURIComponent('Join expense group')}&body=${encodeURIComponent(message)}`;
  
  // Telegram
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join "${groupName}" on BudgeSplit to split expenses`)}`;
  
  // Facebook Messenger
  const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=1234567890&redirect_uri=${encodeURIComponent(url)}`;
  
  // Twitter/X
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
  
  // Create share options
  const shareOptions = [
    { name: 'WhatsApp', url: whatsappUrl },
    { name: 'SMS', url: smsUrl },
    { name: 'Email', url: emailUrl },
    { name: 'Telegram', url: telegramUrl },
    { name: 'Twitter/X', url: twitterUrl },
    { name: 'Copy Link', action: 'copy' },
    { name: 'Native Share', action: 'native' }
  ];
  
  // Try native share first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'Join expense group',
        text: message,
        url: url,
      });
      return;
    } catch (err) {
      // Continue with other options
    }
  }
  
  // Copy to clipboard as fallback
  try {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard! Share it with anyone via any app.');
  } catch {
    // Open in new window as last resort
    window.open(url, '_blank');
  }
}

/**
 * Get share URLs for different platforms
 */
export function getShareUrls(shareCode: string, groupName: string) {
  const url = getJoinUrl(shareCode);
  const message = `Join "${groupName}" on BudgeSplit to split expenses: ${url}`;
  
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    sms: `sms:?&body=${encodeURIComponent(message)}`,
    email: `mailto:?subject=${encodeURIComponent('Join expense group')}&body=${encodeURIComponent(message)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join "${groupName}" on BudgeSplit to split expenses`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    copy: url
  };
}

/**
 * Parse join code from current URL (e.g. ?join=ABC123).
 * Returns the code in uppercase or null.
 */
export function getJoinCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.search.match(/[?&]join=([^&]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]).trim().toUpperCase() || null;
}

/**
 * Remove join param from URL without reload (clean URL after handling).
 */
export function clearJoinFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  const newUrl = url.pathname + (url.search || '') + url.hash;
  window.history.replaceState(null, '', newUrl);
}
