const PortraitShowCase = {
  imageSrc: null,

  init() {
    document
      .getElementById("imageInput")
      .addEventListener("change", this.handleFile.bind(this));
    document
      .getElementById("processBtn")
      .addEventListener("click", this.process.bind(this));
    document
      .getElementById("downloadBtn")
      .addEventListener("click", this.download.bind(this));
  },

  handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      this.imageSrc = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  async process() {
    if (!this.imageSrc) return alert("Silakan upload gambar terlebih dahulu.");
    const originalImage = await this.loadImage(this.imageSrc);
    const resizedImage = await this.ensureWidth(originalImage, 1536);

    const canvas = document.getElementById("resultCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const totalWidth = 1536;
    const topWidth = 580;
    const bottomWidth = totalWidth - topWidth; // 956px
    const partWidth = bottomWidth / 2; // 478px

    // Split into parts
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

    // Draw top (scaled to 1080px wide)
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

    // Draw middle + right (scaled to 540px wide each)
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
    const canvas = document.getElementById("resultCanvas");
    const link = document.createElement("a");
    link.download = "show-case-result.png";
    link.href = canvas.toDataURL();
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
