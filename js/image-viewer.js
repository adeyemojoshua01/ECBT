// ============================================================
// IMAGE VIEWER MODULE
// Handles reference-image gallery modal, zoom, full-size view,
// and the shared compressImage() helper used by AI uploads.
// ============================================================

window.compressImage = function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width  = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width  = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width  = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width  = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

window.imageViewer = {
    images: [],
    scale: 1,

    init: function () {
        this.setupEventListeners();
    },

    setupEventListeners: function () {
        // Reserved for future admin upload listeners; no-op for candidates.
    },

    open: function (images, title) {
        this.images = images || [];
        const modal = document.getElementById('image-modal');
        document.getElementById('image-modal-title').textContent = title || 'Reference Images';
        document.getElementById('image-count').textContent = `${this.images.length} images`;

        if (this.images.length === 0) {
            document.getElementById('image-viewer-container').classList.add('hidden');
            document.getElementById('no-images-message').classList.remove('hidden');
        } else {
            document.getElementById('image-viewer-container').classList.remove('hidden');
            document.getElementById('no-images-message').classList.add('hidden');
            this.renderGallery();
        }
        modal.classList.remove('hidden');
    },

    close: function () {
        document.getElementById('image-modal').classList.add('hidden');
        this.images = [];
    },

    renderGallery: function () {
        const gallery = document.getElementById('image-gallery');
        gallery.innerHTML = '';
        this.images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.onclick = () => this.viewFullSize(image.data);

            const img = document.createElement('img');
            img.src = image.data;
            img.alt = image.filename;

            const filename = document.createElement('div');
            filename.className = 'filename';
            filename.textContent = image.filename;

            item.appendChild(img);
            item.appendChild(filename);
            gallery.appendChild(item);
        });
    },

    viewFullSize: function (imageData) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[60]';
        overlay.onclick = () => overlay.remove();

        const img = document.createElement('img');
        img.src = imageData;
        img.className = 'max-h-[90vh] max-w-[90vw] object-contain';

        overlay.appendChild(img);
        document.body.appendChild(overlay);
    },

    zoomIn: function () {
        this.scale += 0.1;
        this.applyZoom();
    },

    zoomOut: function () {
        if (this.scale > 0.3) {
            this.scale -= 0.1;
            this.applyZoom();
        }
    },

    applyZoom: function () {
        document.querySelectorAll('.image-item img').forEach(img => {
            img.style.transform = `scale(${this.scale})`;
        });
    },

    downloadAll: function () {
        this.images.forEach((image, index) => {
            const link = document.createElement('a');
            link.href = image.data;
            link.download = image.filename || `image-${index + 1}.jpg`;
            link.click();
        });
        app.showNotification(`Downloading ${this.images.length} images...`, 'success');
    }
};
