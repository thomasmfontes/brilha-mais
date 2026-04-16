/**
 * Compresses an image file on the client side using HTML5 Canvas.
 * It intelligently tries to find the best quality that fits within the targetSizeKB.
 * 
 * @param file The original image file
 * @param maxWidth The maximum width of the resulting image
 * @param maxHeight The maximum height of the resulting image
 * @param targetSizeKB The target maximum size in KB (default: 500)
 * @returns A promise that resolves to a compressed Blob
 */
export const compressImage = (
    file: File | Blob, 
    maxWidth: number = 1280, 
    maxHeight: number = 720, 
    targetSizeKB: number = 500
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = async () => {
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
                
                // Intelligent Compression Loop
                let quality = 1.0;
                let blob: Blob | null = null;
                const targetBytes = targetSizeKB * 1024;

                // Try to find the best quality that fits the target size
                // We do a jump of 0.1 for efficiency, then maybe a finer adjustment if needed
                while (quality > 0.1) {
                    blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
                    
                    if (blob && blob.size <= targetBytes) {
                        break; // Found a quality that fits!
                    }
                    
                    quality -= 0.1; // Reduce quality and try again
                }

                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas toBlob failed"));
                }
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
