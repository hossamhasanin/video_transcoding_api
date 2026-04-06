import React, { useState } from "react";
import type { RenditionState } from "../../types/index";

interface HlsRenditionEditorProps {
  renditions: RenditionState[];
  onAdd: (rendition: RenditionState) => void;
  onEdit: (id: string, updates: Partial<Omit<RenditionState, "id">>) => void;
  onRemove: (id: string) => void;
}

const NAME_PATTERN = /^[a-zA-Z0-9_\-]+$/;

function generateId(): string {
  return crypto.randomUUID();
}

function HlsRenditionEditor({
  renditions,
  onAdd,
  onEdit,
  onRemove,
}: HlsRenditionEditorProps): React.ReactElement {
  const [nextName, setNextName] = useState("");
  const [nextWidth, setNextWidth] = useState("");
  const [nextHeight, setNextHeight] = useState("");
  const [nextVideoBitrate, setNextVideoBitrate] = useState("");
  const [nextAudioBitrate, setNextAudioBitrate] = useState("128k");

  const nameError = (() => {
    if (!nextName) return null;
    if (!NAME_PATTERN.test(nextName))
      return "Only letters, numbers, hyphens, and underscores";
    if (renditions.some((r) => r.name === nextName))
      return "Name must be unique";
    return null;
  })();

  const widthError =
    nextWidth && (isNaN(Number(nextWidth)) || Number(nextWidth) <= 0)
      ? "Must be a positive number"
      : null;
  const heightError =
    nextHeight && (isNaN(Number(nextHeight)) || Number(nextHeight) <= 0)
      ? "Must be a positive number"
      : null;

  const canAdd =
    nextName &&
    nextWidth &&
    nextHeight &&
    nextVideoBitrate &&
    !nameError &&
    !widthError &&
    !heightError;

  function handleAdd(): void {
    if (!canAdd) return;
    onAdd({
      id: generateId(),
      name: nextName,
      width: Number(nextWidth),
      height: Number(nextHeight),
      video_bitrate: nextVideoBitrate,
      audio_bitrate: nextAudioBitrate || "128k",
    });
    setNextName("");
    setNextWidth("");
    setNextHeight("");
    setNextVideoBitrate("");
    setNextAudioBitrate("128k");
  }

  function handleFieldChange(
    id: string,
    field: keyof Omit<RenditionState, "id">,
    value: string,
  ): void {
    if (field === "width" || field === "height") {
      onEdit(id, { [field]: Number(value) || 0 });
    } else {
      onEdit(id, { [field]: value });
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-[#333]">
        Renditions
      </label>

      {/* Existing renditions */}
      {renditions.length > 0 && (
        <div className="space-y-2">
          {renditions.map((r) => {
            const existingNames = renditions.filter((x) => x.id !== r.id).map((x) => x.name);
            const duplicateName = existingNames.includes(r.name);
            const invalidName = r.name && !NAME_PATTERN.test(r.name);

            return (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_60px_60px_80px_80px_auto] gap-2 items-start text-xs border border-pg-border rounded p-2 bg-white"
              >
                <div>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) =>
                      handleFieldChange(r.id, "name", e.target.value)
                    }
                    className={`w-full p-1 border rounded text-xs ${
                      duplicateName || invalidName
                        ? "border-danger"
                        : "border-pg-border"
                    }`}
                    placeholder="name"
                  />
                  {(duplicateName || invalidName) && (
                    <span className="text-danger text-[10px]">
                      {duplicateName
                        ? "Duplicate name"
                        : "Invalid characters"}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={r.width}
                  onChange={(e) =>
                    handleFieldChange(r.id, "width", e.target.value)
                  }
                  className="w-full p-1 border border-pg-border rounded text-xs"
                  placeholder="W"
                  min={1}
                />
                <input
                  type="number"
                  value={r.height}
                  onChange={(e) =>
                    handleFieldChange(r.id, "height", e.target.value)
                  }
                  className="w-full p-1 border border-pg-border rounded text-xs"
                  placeholder="H"
                  min={1}
                />
                <input
                  type="text"
                  value={r.video_bitrate}
                  onChange={(e) =>
                    handleFieldChange(r.id, "video_bitrate", e.target.value)
                  }
                  className="w-full p-1 border border-pg-border rounded text-xs"
                  placeholder="v-bitrate"
                />
                <input
                  type="text"
                  value={r.audio_bitrate}
                  onChange={(e) =>
                    handleFieldChange(r.id, "audio_bitrate", e.target.value)
                  }
                  className="w-full p-1 border border-pg-border rounded text-xs"
                  placeholder="a-bitrate"
                />
                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  className="p-1 text-danger hover:bg-danger-bg rounded text-xs font-bold"
                  title="Remove rendition"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new rendition row */}
      <div className="grid grid-cols-[1fr_60px_60px_80px_80px_auto] gap-2 items-start text-xs">
        <div>
          <input
            type="text"
            value={nextName}
            onChange={(e) => setNextName(e.target.value)}
            className={`w-full p-1 border rounded text-xs ${
              nameError ? "border-danger" : "border-pg-border"
            }`}
            placeholder="720p"
          />
          {nameError && (
            <span className="text-danger text-[10px]">{nameError}</span>
          )}
        </div>
        <input
          type="number"
          value={nextWidth}
          onChange={(e) => setNextWidth(e.target.value)}
          className={`w-full p-1 border rounded text-xs ${
            widthError ? "border-danger" : "border-pg-border"
          }`}
          placeholder="W"
          min={1}
        />
        <input
          type="number"
          value={nextHeight}
          onChange={(e) => setNextHeight(e.target.value)}
          className={`w-full p-1 border rounded text-xs ${
            heightError ? "border-danger" : "border-pg-border"
          }`}
          placeholder="H"
          min={1}
        />
        <input
          type="text"
          value={nextVideoBitrate}
          onChange={(e) => setNextVideoBitrate(e.target.value)}
          className="w-full p-1 border border-pg-border rounded text-xs"
          placeholder="2500k"
        />
        <input
          type="text"
          value={nextAudioBitrate}
          onChange={(e) => setNextAudioBitrate(e.target.value)}
          className="w-full p-1 border border-pg-border rounded text-xs"
          placeholder="128k"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="p-1 text-brand hover:text-brand-dark disabled:text-muted disabled:cursor-not-allowed text-lg font-bold"
          title="Add rendition"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default HlsRenditionEditor;
