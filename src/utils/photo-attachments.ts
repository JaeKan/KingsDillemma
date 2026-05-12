import {
  dilemmaPhotoAllowedTypes,
  dilemmaPhotoMaxDataUrlLength,
  dilemmaPhotoMaxDimension,
  dilemmaPhotoMaxInputBytes,
  dilemmaPhotoQuality,
  ko,
} from "../resources/gameResources";
import type { RecordAttachment } from "../types/game";
import { createClientId } from "./dilemma-helpers";

export async function createRecordPhotoAttachment(file: File): Promise<RecordAttachment> {
  if (!dilemmaPhotoAllowedTypes.has(file.type)) {
    throw new Error(ko.dilemmaHelpers.photoErrors.imageOnly);
  }

  if (file.size > dilemmaPhotoMaxInputBytes) {
    throw new Error(ko.dilemmaHelpers.photoErrors.maxSize);
  }

  const dataUrl = await resizePhoto(file);

  if (dataUrl.length > dilemmaPhotoMaxDataUrlLength) {
    throw new Error(ko.dilemmaHelpers.photoErrors.tooLarge);
  }

  return {
    id: createClientId(),
    name: file.name || ko.dilemmaEdit.photoAlt,
    mimeType: dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

export async function createRecordPhotoAttachments(files: FileList | File[], remainingSlots: number): Promise<RecordAttachment[]> {
  const nextPhotos: RecordAttachment[] = [];

  for (const file of Array.from(files || []).slice(0, Math.max(remainingSlots, 0))) {
    nextPhotos.push(await createRecordPhotoAttachment(file));
  }

  return nextPhotos;
}

async function resizePhoto(file: File) {
  const inputDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(inputDataUrl);
  const scale = Math.min(1, dilemmaPhotoMaxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(ko.dilemmaHelpers.photoErrors.processFail);
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", dilemmaPhotoQuality);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(ko.dilemmaHelpers.photoErrors.readFail));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(ko.dilemmaHelpers.photoErrors.loadFail));
    image.src = src;
  });
}
