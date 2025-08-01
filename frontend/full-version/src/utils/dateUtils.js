import dayjs from 'dayjs';

/**
 * Unified date formatting utility to ensure consistency across the application
 * Handles various input formats and always returns YYYY-MM-DD format
 */
export const formatDate = (dateInput) => {
  // Handle edge cases
  if (!dateInput || dateInput === 'Not specified') {
    return dateInput;
  }

  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  // Handle legacy DD.MM.YYYY format - convert to YYYY-MM-DD
  if (typeof dateInput === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('.');
    return `${year}-${month}-${day}`;
  }

  try {
    // Handle dayjs objects
    if (dayjs.isDayjs(dateInput)) {
      return dateInput.format('YYYY-MM-DD');
    }

    // Handle Date objects or date strings
    const date = dayjs(dateInput);
    if (date.isValid()) {
      return date.format('YYYY-MM-DD');
    }

    // If all else fails, return the original input
    return dateInput;
  } catch (error) {
    console.warn('Error formatting date:', error);
    return dateInput;
  }
};

/**
 * Parse a date string in YYYY-MM-DD format to a dayjs object
 */
export const parseDate = (dateString) => {
  if (!dateString || dateString === 'Not specified') {
    return null;
  }

  // If it's in YYYY-MM-DD format, parse it correctly
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dayjs(dateString, 'YYYY-MM-DD');
  }

  // Handle legacy DD.MM.YYYY format
  if (typeof dateString === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
    return dayjs(dateString, 'DD.MM.YYYY');
  }

  // Otherwise, let dayjs handle it
  return dayjs(dateString);
};
