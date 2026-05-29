
export const fileToBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

/**
 * Redimensiona uma imagem base64 para garantir que não ultrapasse um limite de tamanho,
 * prevenindo timeouts e erros de payload na API do Gemini.
 */
export const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

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
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 0.8));
        };
        img.onerror = () => resolve(base64Str); // Fallback para original se falhar
    });
};

export const downloadBase64Image = async (imgUrl: string, filename: string) => {
    try {
        if (imgUrl.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = imgUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Public URL download mechanism using Blobs to prevent browser CORS download blocking
            const res = await fetch(imgUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        }
    } catch (err) {
        console.error('Failed to download image directly:', err);
        // Safe fallback: open in new tab if CORS/network fails
        window.open(imgUrl, '_blank');
    }
};

export const flattenImageOnBackground = (
    base64Str: string, 
    bgColorHex: string | null, 
    topPaddingPercent = 0, 
    printSizePercent = 45,
    isBack = false,
    printOffsetXPercent = 0
): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // We use a high resolution 1600x1600 fixed square canvas
            canvas.width = 1600;
            canvas.height = 1600;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 1. Fill the entire canvas with the exact fabric color (matches shirt color)
                // This acts as the physical t-shirt fabric backdrop
                const fabricColor = bgColorHex || '#ffffff';
                ctx.fillStyle = fabricColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // 2. Proportional chest-width scale calculation
                // Define chest width as 650px (representing standard chest width on the t-shirt front)
                const chestWidth = 650;
                const sizeFactor = printSizePercent / 100;
                
                let drawWidth = chestWidth * sizeFactor;
                const imgAspectRatio = img.height / img.width;
                let drawHeight = drawWidth * imgAspectRatio;
                
                // Centered horizontally on the shirt canvas + horizontal slider shift
                const shiftX = canvas.width * (printOffsetXPercent / 100) * 0.8;
                let drawX = (canvas.width - drawWidth) / 2 + shiftX;
                
                // 3. Neckline vertical offset positioning
                const startY = canvas.height * 0.20; // Neckline start position
                const shiftY = canvas.height * (topPaddingPercent / 100) * 0.8;
                let drawY = startY + shiftY;
                
                // 4. Paste the design exactly as-is (pixel perfect, zero deformation)
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            }
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Str);
    });
};

