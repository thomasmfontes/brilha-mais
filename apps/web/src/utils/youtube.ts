export function getYoutubeId(urlOrId: string): string {
    if (!urlOrId) return "";

    // If it's already just an ID (11 chars, typically alphanumeric + _-)
    if (urlOrId.length === 11 && !urlOrId.includes("/") && !urlOrId.includes(".")) {
        return urlOrId;
    }

    // Regular matches
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);

    if (match && match[2].length === 11) {
        return match[2];
    }

    // Handle shorts specifically if regex fails
    if (urlOrId.includes("youtube.com/shorts/")) {
        const parts = urlOrId.split("/");
        const lastPart = parts[parts.length - 1];
        return lastPart.split("?")[0].substring(0, 11);
    }

    return urlOrId; // Fallback
}
