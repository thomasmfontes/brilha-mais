export const resolveThumbnail = (thumbnail: string | undefined): string => {
    if (!thumbnail) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'; // Default fallback

    if (thumbnail.startsWith('http')) {
        return thumbnail;
    }

    // Relative path from our API
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Ensure we don't have double slashes if thumbnail starts with /
    const cleanThumbnail = thumbnail.startsWith('/') ? thumbnail : `/${thumbnail}`;
    return `${baseUrl}${cleanThumbnail}`;
};
