"use client";

const allowedInputTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumOriginalBytes = 40 * 1024 * 1024;
const targetBytes = 750 * 1024;
const maximumOutputBytes = 1536 * 1024;
const maximumDimension = 2048;
const minimumQuality = 0.52;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler esta imagem."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível otimizar esta imagem."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

function outputName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "imagem";
  return `${base}.webp`;
}

export async function compressImage(file: File) {
  if (!allowedInputTypes.has(file.type)) {
    throw new Error("Selecione uma imagem JPEG, PNG ou WebP.");
  }

  if (file.size < 1) {
    throw new Error("A imagem selecionada está vazia.");
  }

  if (file.size > maximumOriginalBytes) {
    throw new Error("A imagem original pode ter no máximo 40 MB.");
  }

  const image = await loadImage(file);

  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("Não foi possível identificar as dimensões desta imagem.");
  }

  let scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  let best: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Não foi possível otimizar esta imagem.");

    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.76, 0.70, 0.64, 0.58, minimumQuality]) {
      const blob = await canvasToBlob(canvas, quality);
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) {
        return new File([blob], outputName(file.name), {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }
    }

    width = Math.max(1, Math.round(width * 0.84));
    height = Math.max(1, Math.round(height * 0.84));
  }

  if (best && best.size <= maximumOutputBytes) {
    return new File([best], outputName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  throw new Error("Não foi possível reduzir esta imagem para o tamanho permitido.");
}

export const imageCompressionRules = {
  maximumOriginalBytes,
  maximumOutputBytes,
  maximumDimension,
};
