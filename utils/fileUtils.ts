
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

export const downloadBase64Image = (base64Data: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const flattenImageOnBackground = (base64Str: string, bgColorHex: string | null, topPaddingPercent = 0): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                if (bgColorHex) {
                    ctx.fillStyle = bgColorHex;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                
                const scaleFactor = 1 - topPaddingPercent / 100;
                const drawWidth = canvas.width * scaleFactor;
                const drawHeight = canvas.height * scaleFactor;
                const shiftX = (canvas.width - drawWidth) / 2;
                const shiftY = canvas.height * (topPaddingPercent / 100);
                
                ctx.drawImage(img, shiftX, shiftY, drawWidth, drawHeight);
            }
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Str);
    });
};

