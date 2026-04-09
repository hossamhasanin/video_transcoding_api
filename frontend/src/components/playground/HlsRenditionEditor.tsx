import React, { useState } from "react";
import type { RenditionState } from "../../types/index";

interface HlsRenditionEditorProps {
  renditions: RenditionState[];
  onAdd: (rendition: RenditionState) => void;
  onEdit: (id: string, updates: Partial<Omit<RenditionState, "id">>) => void;
  onRemove: (id: string) => void;
  locked?: boolean;
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
  locked = false,
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
      <label className="block text-sm font-semibold text-text-primary">
        Renditions
      </label>
      <p className="text-xs text-text-secondary -mt-1 mb-2">
        {locked
          ? "These renditions come from the selected template. Click &quot;Customize&quot; to edit."
          : "Each rendition defines an output quality level (resolution + bitrate). " +
            "Players automatically switch between them based on viewer bandwidth."}
      </p>

      {/* Existing renditions */}
      {renditions.length > 0 && (
        <div className="space-y-2">
          {renditions.map((r) =>
            locked ? (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_60px_60px_80px_80px] gap-2 items-center text-xs border border-border rounded-lg p-2 bg-surface-raised"
              >
                <span className="font-medium text-text-primary">{r.name}</span>
                <span className="text-text-secondary">{r.width}</span>
                <span className="text-text-secondary">{r.height}</span>
                <span className="text-text-secondary">{r.video_bitrate}</span>
                <span className="text-text-secondary">{r.audio_bitrate}</span>
              </div>
            ) : (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_60px_60px_80px_80px_auto] gap-2 items-start text-xs border border-border rounded-lg p-2 bg-surface-raised"
              >
                <div>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) =>
                      handleFieldChange(r.id, "name", e.target.value)
                    }
                    className={`w-full p-1 border rounded text-xs ${
                      renditions.filter((x) => x.id !== r.id).some((x) => x.name === r.name) ||
                      (r.name && !NAME_PATTERN.test(r.name))
                        ? "border-red-400"
                        : "border-border"
                    }`}
                    placeholder="name"
                  />
                  {(renditions.filter((x) => x.id !== r.id).some((x) => x.name === r.name) ||
                    (r.name && !NAME_PATTERN.test(r.name))) && (
                    <span className="text-red-600 text-[10px]">
                      {renditions.filter((x) => x.id !== r.id).some((x) => x.name === r.name)
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
                  className="w-full p-1 border border-border rounded text-xs"
                  placeholder="W"
                  min={1}
                />
                <input
                  type="number"
                  value={r.height}
                  onChange={(e) =>
                    handleFieldChange(r.id, "height", e.target.value)
                  }
                  className="w-full p-1 border border-border rounded text-xs"
                  placeholder="H"
                  min={1}
                />
                <input
                  type="text"
                  value={r.video_bitrate}
                  onChange={(e) =>
                    handleFieldChange(r.id, "video_bitrate", e.target.value)
                  }
                  className="w-full p-1 border border-border rounded text-xs"
                  placeholder="v-bitrate"
                />
                <input
                  type="text"
                  value={r.audio_bitrate}
                  onChange={(e) =>
                    handleFieldChange(r.id, "audio_bitrate", e.target.value)
                  }
                  className="w-full p-1 border border-border rounded text-xs"
                  placeholder="a-bitrate"
                />
                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded text-xs font-bold cursor-pointer"
                  title="Remove rendition"
                >
                  &times;
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {/* Add new rendition row — only when unlocked */}
      {!locked && (
        <div className="grid grid-cols-[1fr_60px_60px_80px_80px_auto] gap-2 items-start text-xs">
          <div>
            <input
              type="text"
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              className={`w-full p-1 border rounded text-xs ${
                nameError ? "border-red-400" : "border-border"
              }`}
              placeholder="720p"
            />
            {nameError && (
              <span className="text-red-600 text-[10px]">{nameError}</span>
            )}
          </div>
          <input
            type="number"
            value={nextWidth}
            onChange={(e) => setNextWidth(e.target.value)}
            className={`w-full p-1 border rounded text-xs ${
              widthError ? "border-red-400" : "border-border"
            }`}
            placeholder="W"
            min={1}
          />
          <input
            type="number"
            value={nextHeight}
            onChange={(e) => setNextHeight(e.target.value)}
            className={`w-full p-1 border rounded text-xs ${
              heightError ? "border-red-400" : "border-border"
            }`}
            placeholder="H"
            min={1}
          />
          <input
            type="text"
            value={nextVideoBitrate}
            onChange={(e) => setNextVideoBitrate(e.target.value)}
            className="w-full p-1 border border-border rounded text-xs"
            placeholder="2500k"
          />
          <input
            type="text"
            value={nextAudioBitrate}
            onChange={(e) => setNextAudioBitrate(e.target.value)}
            className="w-full p-1 border border-border rounded text-xs"
            placeholder="128k"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="p-1 text-accent hover:text-accent-hover disabled:text-text-tertiary disabled:cursor-not-allowed text-lg font-bold cursor-pointer"
            title="Add rendition"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default HlsRenditionEditor;
