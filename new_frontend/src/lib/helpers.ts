export function convertToFormData(data: any) {
    const formData = new FormData();

    // Iterate over the object's key-value pairs
    Object.entries(data).forEach(([key, value]) => {
        // FormData expects values to be strings or Blobs (Files)
        // Ensure non-string values like numbers are converted to strings
        if (typeof value === 'number' || typeof value === 'boolean') {
            formData.append(key, String(value));
        } else if (value instanceof File) {
            formData.append(key, value);
        } else if (value !== null && value !== undefined) {
        }
    });

    return formData;
}