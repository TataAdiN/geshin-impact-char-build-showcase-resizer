const PortraitShowCase = {
  imageSrc: null,

  init() {
    this.imageInput = document.getElementById("imageInput");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.dropzone = document.getElementById("dropzone");
    this.fileInfo = document.getElementById("fileInfo");
    this.previewPlaceholder = document.getElementById("previewPlaceholder");
    this.resultCanvas = document.getElementById("resultCanvas");
    this.loadingOverlay = document.getElementById("loadingOverlay");

    this.imageInput.addEventListener("change", this.handleFile.bind(this));
    this.downloadBtn.addEventListener("click", this.download.bind(this));

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

  async process() {
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

      if (this.previewPlaceholder) this.previewPlaceholder.style.opacity = "0";
      setTimeout(() => {
        if (this.previewPlaceholder) this.previewPlaceholder.style.display = "none";
        if (canvas) canvas.style.display = "block";
      }, 300);

      if (this.downloadBtn) {
        this.downloadBtn.removeAttribute("disabled");
      }

    } catch (err) {
      console.error(err);
      alert("Gagal memproses gambar. Pastikan format gambar sesuai.");
    } finally {
      setTimeout(() => {
        if (this.loadingOverlay) this.loadingOverlay.style.display = "none";
      }, 500);
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

  download() {
    const canvas = this.resultCanvas || document.getElementById("resultCanvas");
    const link = document.createElement("a");
    link.download = "showcase-portrait-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
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
