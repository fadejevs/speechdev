import dayjs from 'dayjs';

/**
 * Unified date formatting utility to ensure consistency across the application
 * Handles various input formats and always returns DD.MM.YYYY format
 */
export const formatDate = (dateInput) => {
  // Handle edge cases
  if (!dateInput || dateInput === 'Not specified') {
    return dateInput;
  }

  // If it's already in DD.MM.YYYY format, return as is
  if (typeof dateInput === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
    return dateInput;
  }

  try {
    // Handle dayjs objects
    if (dayjs.isDayjs(dateInput)) {
      return dateInput.format('DD.MM.YYYY');
    }

    // Handle Date objects or date strings
    const date = dayjs(dateInput);
    if (date.isValid()) {
      return date.format('DD.MM.YYYY');
    }

    // If all else fails, return the original input
    return dateInput;
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateInput;
  }
};

/**
 * Parse a date string in DD.MM.YYYY format to a dayjs object
 */
export const parseDate = (dateString) => {
  if (!dateString || dateString === 'Not specified') {
    return null;
  }

  // If it's in DD.MM.YYYY format, parse it correctly
  if (typeof dateString === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
    return dayjs(dateString, 'DD.MM.YYYY');
  }

  // Otherwise, let dayjs handle it
  return dayjs(dateString);
}; 