/**
 * Safely parses a date string into a Date object.
 * Handles common Safari/iOS incompatibilities like "YYYY-MM-DD HH:mm:ss" (SQL style).
 * Returns null if the date is invalid.
 */
export const parseDateSafe = (dateString: string | number | Date | undefined | null): Date | null => {
    if (!dateString) return null;

    // If it's already a Date object
    if (dateString instanceof Date) {
        return isNaN(dateString.getTime()) ? null : dateString;
    }

    // If standard parsing works, use it (Chrome/Firefox are good at this)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    // Fallback for Safari handles: "2023-10-25 12:00:00" -> "2023/10/25 12:00:00"
    if (typeof dateString === 'string') {
        // Replace dashes with slashes (Safari likes slashes better for YYYY/MM/DD)
        const safeString = dateString.replace(/-/g, '/');
        date = new Date(safeString);
        if (!isNaN(date.getTime())) return date;

        // Try T separator if space exists
        const tString = dateString.replace(' ', 'T');
        date = new Date(tString);
        if (!isNaN(date.getTime())) return date;
    }

    console.warn("Could not parse date:", dateString);
    return null;
};

/**
 * Formats a date string safely.
 */
export const formatDateSafe = (dateString: any): string => {
    const date = parseDateSafe(dateString);
    if (!date) return 'Invalid Date';
    return date.toLocaleDateString();
};
