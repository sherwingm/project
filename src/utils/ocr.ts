import Tesseract from 'tesseract.js';

export interface ReceiptData {
  text: string;
  items: Array<{
    name: string;
    amount: number;
  }>;
  total?: number;
  date?: string;
}

export async function processReceiptImage(imageFile: File): Promise<ReceiptData> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      logger: m => console.log(m)
    });

    return parseReceiptText(text);
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error('Failed to process receipt image');
  }
}

function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items: Array<{ name: string; amount: number }> = [];
  let total: number | undefined;
  let date: string | undefined;

  // Common price patterns
  const pricePattern = /[₹Rs]?(\d+\.?\d{0,2})/g;
  const totalPattern = /(?:total|sum|amount|subtotal)[\s:]*[₹Rs]?(\d+\.?\d{0,2})/i;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

  lines.forEach(line => {
    // Look for date
    const dateMatch = line.match(datePattern);
    if (dateMatch && !date) {
      date = dateMatch[1];
    }

    // Look for total
    const totalMatch = line.match(totalPattern);
    if (totalMatch) {
      total = parseFloat(totalMatch[1]);
      return;
    }

    // Look for items with prices
    const prices = line.match(pricePattern);
    if (prices && prices.length > 0) {
      const price = parseFloat(prices[prices.length - 1].replace(/[₹Rs]/g, ''));
      if (price > 0) {
        const itemName = line.replace(pricePattern, '').trim();
        if (itemName.length > 0 && !itemName.toLowerCase().includes('total')) {
          items.push({
            name: itemName,
            amount: price
          });
        }
      }
    }
  });

  // If no total found, calculate from items
  if (!total && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.amount, 0);
  }

  return {
    text,
    items,
    total,
    date
  };
}