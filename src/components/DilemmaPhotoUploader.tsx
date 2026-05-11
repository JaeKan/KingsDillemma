import React, { useRef } from "react";
import { dilemmaPhotoLimit, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import { DilemmaPhoto } from "../types/game";

export function getClipboardImageFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) {
    return [];
  }

  const itemFiles = Array.from(clipboardData.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (itemFiles.length) {
    return itemFiles;
  }

  return Array.from(clipboardData.files || []).filter((file) => file.type.startsWith("image/"));
}

export type DilemmaPhotoUploaderCopy = {
  sectionTitle: string;
  sectionHelp: string;
  attach: string;
  empty: string;
  limitsCaption: (cur: number, max: number) => string;
  photoAlt: string;
};

export function DilemmaPhotoUploader({
  busy,
  photoBusy,
  error,
  photos,
  onAddPhotos,
  onRemovePhoto,
  copy,
}: {
  busy: boolean;
  photoBusy: boolean;
  error: string | null;
  photos: DilemmaPhoto[];
  onAddPhotos: (files: FileList | File[]) => Promise<void>;
  onRemovePhoto: (id: string) => void;
  copy: DilemmaPhotoUploaderCopy;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(dilemmaPhotoLimit - photos.length, 0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    void onAddPhotos(files).finally(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  return (
    <section className="dilemma-photo-editor" aria-labelledby="dilemma-photo-upload-title">
      <div className="dilemma-photo-editor-head">
        <div>
          <h3 id="dilemma-photo-upload-title">{copy.sectionTitle}</h3>
          <p>{copy.sectionHelp}</p>
        </div>
        <label className={`ghost-button dilemma-photo-add${remaining <= 0 ? " disabled" : ""}`}>
          <TokenIcon type="photo" />
          <span>{copy.attach}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={busy || photoBusy || remaining <= 0}
          />
        </label>
      </div>
      {photos.length ? (
        <div className="dilemma-photo-editor-grid">
          {photos.map((photo) => (
            <figure key={photo.id} className="dilemma-photo-editor-item">
              <img src={photo.dataUrl} alt={photo.name || copy.photoAlt} />
              <figcaption>{photo.name || copy.photoAlt}</figcaption>
              <button type="button" className="stepper-button" onClick={() => onRemovePhoto(photo.id)} disabled={busy}>
                <TokenIcon type="trash" />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <p className="dilemma-photo-empty">{copy.empty}</p>
      )}
      <p className="dilemma-photo-limit">{copy.limitsCaption(photos.length, dilemmaPhotoLimit)}</p>
      {error ? (
        <p className="dilemma-photo-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export const dilemmaEditPhotoUploaderCopy: DilemmaPhotoUploaderCopy = {
  sectionTitle: ko.dilemmaEdit.photoSectionTitle,
  sectionHelp: ko.dilemmaEdit.photoHelp,
  attach: ko.dilemmaEdit.photoAttach,
  empty: ko.dilemmaEdit.photoEmpty,
  limitsCaption: ko.dilemmaEdit.photoLimitsCaption,
  photoAlt: ko.dilemmaEdit.photoAlt,
};

export const dilemmaResolutionPhotoUploaderCopy: DilemmaPhotoUploaderCopy = {
  sectionTitle: ko.dilemmaResolution.photoSectionTitle,
  sectionHelp: ko.dilemmaResolution.photoHelp,
  attach: ko.dilemmaEdit.photoAttach,
  empty: ko.dilemmaEdit.photoEmpty,
  limitsCaption: ko.dilemmaEdit.photoLimitsCaption,
  photoAlt: ko.dilemmaResolution.photoAlt,
};
