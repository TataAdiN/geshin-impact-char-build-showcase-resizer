const PortraitShowCase = {
    imageSrc: null,
    currentMode: "single",
    slots: [
        { image: null, sy: 84.89, filename: "" },
        { image: null, sy: 84.89, filename: "" },
        { image: null, sy: 84.89, filename: "" },
        { image: null, sy: 84.89, filename: "" }
    ],

    init() {
        this.imageInput = document.getElementById("imageInput");
        this.downloadBtn = document.getElementById("downloadBtn");
        this.dropzone = document.getElementById("dropzone");
        this.fileInfo = document.getElementById("fileInfo");
        this.previewPlaceholder = document.getElementById("previewPlaceholder");
        this.resultCanvas = document.getElementById("resultCanvas");
        this.loadingOverlay = document.getElementById("loadingOverlay");

        this.tabSingle = document.getElementById("tabSingle");
        this.tabLineup = document.getElementById("tabLineup");
        this.singleModeContainer = document.getElementById("singleModeContainer");
        this.lineupModeContainer = document.getElementById("lineupModeContainer");
        this.lineupFitMode = document.getElementById("lineupFitMode");
        this.dragInstructions = document.getElementById("dragInstructions");

        this.imageInput.addEventListener("change", this.handleFile.bind(this));
        this.downloadBtn.addEventListener("click", this.download.bind(this));

        if (this.tabSingle && this.tabLineup) {
            this.tabSingle.addEventListener("click", () => this.setMode("single"));
            this.tabLineup.addEventListener("click", () => this.setMode("lineup"));
        }

        if (this.lineupFitMode) {
            this.lineupFitMode.addEventListener("change", () => {
                this.updateDragInstructions();
                this.drawCanvas(false);
            });
        }

        if (this.dropzone) {
            this.dropzone.addEventListener("click", () => this.imageInput.click());

            this.dropzone.addEventListener("dragenter", (e) => {
                e.preventDefault();
                this.dropzone.classList.add("dragover");
            });

            this.dropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                this.dropzone.classList.add("dragover");
            });

            this.dropzone.addEventListener("dragleave", () => {
                this.dropzone.classList.remove("dragover");
            });

            this.dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                this.dropzone.classList.remove("dragover");
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.imageInput.files = files;
                    this.handleFile({ target: { files: files } });
                }
            });
        }

        // Initialize individual slot upload handlers
        for (let i = 0; i < 4; i++) {
            const input = document.getElementById(`slot-input-${i}`);
            const uploadBtn = document.getElementById(`slot-upload-btn-${i}`);
            const clearBtn = document.getElementById(`slot-clear-${i}`);
            const container = document.getElementById(`slot-container-${i}`);

            if (uploadBtn && input) {
                uploadBtn.addEventListener("click", () => input.click());
            }
            if (input) {
                input.addEventListener("change", (e) => this.handleSlotFileChange(i, e));
            }
            if (clearBtn) {
                clearBtn.addEventListener("click", () => this.clearSlot(i));
            }

            // Add drag and drop support to the slot container
            if (container && input) {
                container.addEventListener("dragenter", (e) => {
                    e.preventDefault();
                    container.classList.add("dragover");
                });
                container.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    container.classList.add("dragover");
                });
                container.addEventListener("dragleave", () => {
                    container.classList.remove("dragover");
                });
                container.addEventListener("drop", (e) => {
                    e.preventDefault();
                    container.classList.remove("dragover");
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        input.files = files;
                        this.handleSlotFileChange(i, { target: { files: files } });
                    }
                });
            }
        }

        this.initCanvasDrag();
    },

    updateDragInstructions() {
        if (this.currentMode === "lineup" && this.lineupFitMode && this.lineupFitMode.value === "crop") {
            if (this.dragInstructions) this.dragInstructions.style.display = "block";
        } else {
            if (this.dragInstructions) this.dragInstructions.style.display = "none";
        }
    },

    setMode(mode) {
        if (this.currentMode === mode) return;
        this.currentMode = mode;

        if (mode === "single") {
            this.tabSingle.classList.add("active");
            this.tabLineup.classList.remove("active");
            this.singleModeContainer.style.display = "block";
            this.lineupModeContainer.style.display = "none";

            this.updateDragInstructions();

            if (this.imageSrc) {
                this.process();
            } else {
                this.hideResultUI();
            }
        } else {
            this.tabSingle.classList.remove("active");
            this.tabLineup.classList.add("active");
            this.singleModeContainer.style.display = "none";
            this.lineupModeContainer.style.display = "block";

            this.updateDragInstructions();
            this.drawCanvas(false);
        }
    },

    handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (this.fileInfo) {
            this.fileInfo.textContent = `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            this.fileInfo.style.display = "block";
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.imageSrc = event.target.result;
            this.process();
        };
        reader.readAsDataURL(file);
    },

    async handleSlotFileChange(i, e) {
        const file = e.target.files[0];
        if (!file) return;

        const nameEl = document.getElementById(`slot-name-${i}`);
        if (nameEl) {
            nameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }

        if (this.loadingOverlay) this.loadingOverlay.style.display = "flex";

        try {
            const reader = new FileReader();
            const imageSrc = await new Promise((resolve, reject) => {
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const originalImage = await this.loadImage(imageSrc);
            const resizedImage = await this.ensureDimensions(originalImage, 1536, 640);

            this.slots[i].image = resizedImage;
            this.slots[i].filename = file.name;

            const sh = 470.22;
            this.slots[i].sy = (640 - sh) / 2; // Center position

            const thumbEl = document.getElementById(`slot-thumb-${i}`);
            if (thumbEl) {
                thumbEl.innerHTML = `<img src="${resizedImage.src}" alt="slot-${i}-preview" />`;
            }

            const clearBtn = document.getElementById(`slot-clear-${i}`);
            if (clearBtn) clearBtn.removeAttribute("disabled");

            const container = document.getElementById(`slot-container-${i}`);
            if (container) container.classList.add("has-image");

            await this.drawCanvas(false);

        } catch (err) {
            console.error(err);
            alert("Gagal memproses gambar slot.");
        } finally {
            setTimeout(() => {
                if (this.loadingOverlay) this.loadingOverlay.style.display = "none";
            }, 500);
        }
    },

    clearSlot(i) {
        this.slots[i] = { image: null, sy: 84.89, filename: "" };

        const input = document.getElementById(`slot-input-${i}`);
        if (input) input.value = "";

        const nameEl = document.getElementById(`slot-name-${i}`);
        if (nameEl) nameEl.textContent = "No image uploaded";

        const thumbEl = document.getElementById(`slot-thumb-${i}`);
        if (thumbEl) {
            thumbEl.innerHTML = '<i class="fa-solid fa-image"></i>';
        }

        const clearBtn = document.getElementById(`slot-clear-${i}`);
        if (clearBtn) clearBtn.setAttribute("disabled", "true");

        const container = document.getElementById(`slot-container-${i}`);
        if (container) container.classList.remove("has-image");

        this.drawCanvas(false);
    },

    initCanvasDrag() {
        this.isDragging = false;
        this.activeSlotIndex = null;
        this.startY = 0;
        this.startSy = 0;

        const handleStart = (clientY) => {
            if (this.currentMode !== "lineup") return;
            if (this.lineupFitMode && this.lineupFitMode.value !== "crop") return;
            const rect = this.resultCanvas.getBoundingClientRect();
            const clickY = (clientY - rect.top) * (this.resultCanvas.height / rect.height);
            const slotIndex = Math.floor(clickY / 480);

            if (slotIndex >= 0 && slotIndex < 4 && this.slots[slotIndex].image) {
                this.isDragging = true;
                this.activeSlotIndex = slotIndex;
                this.startY = clientY;
                this.startSy = this.slots[slotIndex].sy;
                this.resultCanvas.style.cursor = "ns-resize";
            }
        };

        const handleMove = (clientY) => {
            if (!this.isDragging || this.activeSlotIndex === null) return;
            const rect = this.resultCanvas.getBoundingClientRect();
            const deltaY = clientY - this.startY;
            const canvasDeltaY = deltaY * (1920 / rect.height);

            const sh = 470.22;
            const dh = 480;
            const scale = sh / dh;

            let newSy = this.startSy - canvasDeltaY * scale;
            const maxSy = 640 - sh;
            if (newSy < 0) newSy = 0;
            if (newSy > maxSy) newSy = maxSy;

            this.slots[this.activeSlotIndex].sy = newSy;
            this.drawCanvas(false);
        };

        const handleEnd = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.activeSlotIndex = null;
                if (this.resultCanvas) this.resultCanvas.style.cursor = "default";
                this.drawCanvas(false);
            }
        };

        if (this.resultCanvas) {
            this.resultCanvas.addEventListener("mousedown", (e) => handleStart(e.clientY));
            window.addEventListener("mousemove", (e) => handleMove(e.clientY));
            window.addEventListener("mouseup", handleEnd);

            this.resultCanvas.addEventListener("touchstart", (e) => {
                if (e.touches.length > 0) handleStart(e.touches[0].clientY);
            }, { passive: true });
            window.addEventListener("touchmove", (e) => {
                if (e.touches.length > 0) handleMove(e.touches[0].clientY);
            }, { passive: true });
            window.addEventListener("touchend", handleEnd);
        }
    },

    async drawCanvas(isDownloading = false) {
        const canvas = this.resultCanvas || document.getElementById("resultCanvas");
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const fitMode = this.lineupFitMode ? this.lineupFitMode.value : "stretch";

        for (let i = 0; i < 4; i++) {
            const slot = this.slots[i];
            if (slot.image) {
                if (fitMode === "stretch") {
                    ctx.drawImage(
                        slot.image,
                        0,
                        0,
                        1058,
                        640,
                        0,
                        i * 480,
                        1080,
                        480
                    );
                } else if (fitMode === "blur") {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, i * 480, 1080, 480);
                    ctx.clip();

                    ctx.filter = "blur(18px) brightness(0.65)";
                    ctx.drawImage(
                        slot.image,
                        0,
                        0,
                        1058,
                        640,
                        -30,
                        i * 480 - 30,
                        1080 + 60,
                        480 + 60
                    );
                    ctx.restore();
                    const sharpWidth = 793.5;
                    const sharpX = (1080 - sharpWidth) / 2;
                    ctx.drawImage(
                        slot.image,
                        0,
                        0,
                        1058,
                        640,
                        sharpX,
                        i * 480,
                        sharpWidth,
                        480
                    );
                } else {
                    const sh = 470.22;
                    const sw = 1058;
                    ctx.drawImage(
                        slot.image,
                        0,
                        slot.sy,
                        sw,
                        sh,
                        0,
                        i * 480,
                        1080,
                        480
                    );
                }
            }
        }

        if (!isDownloading) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 10]);
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * 480);
                ctx.lineTo(1080, i * 480);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        const hasAnyImage = this.slots.some((s) => s.image !== null);
        if (hasAnyImage) {
            this.showResultUI();
        } else {
            this.hideResultUI();
        }
    },

    showResultUI() {
        if (this.previewPlaceholder) this.previewPlaceholder.style.opacity = "0";
        setTimeout(() => {
            if (this.previewPlaceholder) this.previewPlaceholder.style.display = "none";
            if (this.resultCanvas) this.resultCanvas.style.display = "block";
        }, 300);

        if (this.downloadBtn) {
            this.downloadBtn.removeAttribute("disabled");
        }
    },

    hideResultUI() {
        if (this.previewPlaceholder) {
            this.previewPlaceholder.style.display = "flex";
            this.previewPlaceholder.style.opacity = "1";
        }
        if (this.resultCanvas) this.resultCanvas.style.display = "none";
        if (this.downloadBtn) {
            this.downloadBtn.setAttribute("disabled", "true");
        }
    },

    async process() {
        if (this.currentMode === "single") {
            if (!this.imageSrc) {
                alert("Silakan upload gambar terlebih dahulu.");
                return;
            }

            if (this.loadingOverlay) this.loadingOverlay.style.display = "flex";

            try {
                const originalImage = await this.loadImage(this.imageSrc);
                const resizedImage = await this.ensureWidth(originalImage, 1536);

                const canvas = this.resultCanvas || document.getElementById("resultCanvas");
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const totalWidth = 1536;
                const topWidth = 580;
                const bottomWidth = totalWidth - topWidth;
                const partWidth = bottomWidth / 2;

                const topImage = await this.crop(
                    resizedImage,
                    0,
                    0,
                    topWidth,
                    resizedImage.height,
                );
                const middleImage = await this.crop(
                    resizedImage,
                    topWidth,
                    0,
                    partWidth,
                    resizedImage.height,
                );
                const rightImage = await this.crop(
                    resizedImage,
                    topWidth + partWidth,
                    0,
                    partWidth,
                    resizedImage.height,
                );

                const topHeight = 1080 * (topImage.height / topWidth);
                ctx.drawImage(
                    topImage,
                    0,
                    0,
                    topWidth,
                    topImage.height,
                    0,
                    0,
                    1080,
                    topHeight,
                );

                const bottomHeight = 540 * (middleImage.height / partWidth);
                const yOffset = topHeight;
                ctx.drawImage(
                    middleImage,
                    0,
                    0,
                    partWidth,
                    middleImage.height,
                    0,
                    yOffset,
                    540,
                    bottomHeight,
                );
                ctx.drawImage(
                    rightImage,
                    0,
                    0,
                    partWidth,
                    rightImage.height,
                    540,
                    yOffset,
                    540,
                    bottomHeight,
                );

                this.showResultUI();

            } catch (err) {
                console.error(err);
                alert("Gagal memproses gambar. Pastikan format gambar sesuai.");
            } finally {
                setTimeout(() => {
                    if (this.loadingOverlay) this.loadingOverlay.style.display = "none";
                }, 500);
            }
        } else {
            if (this.loadingOverlay) this.loadingOverlay.style.display = "flex";
            try {
                await this.drawCanvas(false);
            } catch (err) {
                console.error(err);
                alert("Gagal memproses lineup gambar.");
            } finally {
                setTimeout(() => {
                    if (this.loadingOverlay) this.loadingOverlay.style.display = "none";
                }, 500);
            }
        }
    },

    async crop(img, sx, sy, sw, sh) {
        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        return await this.loadImage(canvas.toDataURL());
    },

    async ensureWidth(img, targetWidth) {
        if (img.width === targetWidth) return img;
        const scale = targetWidth / img.width;
        const targetHeight = img.height * scale;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return await this.loadImage(canvas.toDataURL());
    },

    async ensureDimensions(img, targetWidth, targetHeight) {
        if (img.width === targetWidth && img.height === targetHeight) return img;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return await this.loadImage(canvas.toDataURL());
    },

    async download() {
        const canvas = this.resultCanvas || document.getElementById("resultCanvas");

        if (this.currentMode === "lineup") {
            await this.drawCanvas(true);
        }

        const link = document.createElement("a");
        link.download = this.currentMode === "single" ? "showcase-portrait-result.png" : "showcase-lineup-result.png";
        link.href = canvas.toDataURL("image/png");
        link.click();

        if (this.currentMode === "lineup") {
            await this.drawCanvas(false);
        }
    },

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    },
};

document.addEventListener("DOMContentLoaded", () => PortraitShowCase.init());
