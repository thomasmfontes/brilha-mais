/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * @param file The original image file
 * @param maxWidth The maximum width of the resulting image
 * @param maxHeight The maximum height of the resulting image
 * @param quality The JPEG quality (0.0 to 1.0)
 * @returns A promise that resolves to a compressed Blob
 */
export const compressImage = (
    file: File | Blob, 
    maxWidth: number = 1280, 
    maxHeight: number = 720, 
    quality: number = 0.8
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Adjust dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas toBlob failed"));
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
