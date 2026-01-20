export function convertToFormData(data: any) {
    const formData = new FormData();

    // Iterate over the object's key-value pairs
    Object.entries(data).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (value instanceof File) {
            formData.append(key, value);
        } else {
            // Handles strings, numbers, booleans
            formData.append(key, String(value));
        }
    });

    return formData;
}