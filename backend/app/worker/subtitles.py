import os
import gc


def format_timestamp(seconds: float) -> str:
    hours = int(seconds / 3600)
    minutes = int((seconds % 3600) / 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def generate_subtitles_from_audio(audio_path: str, output_vtt_path: str) -> bool:
    """
    Speech-to-text utility that generates a WebVTT file from an audio file using WhisperX.
    Optimized for CPU inference. Models are loaded dynamically and immediately
    purged from memory to save server resources.
    """
    try:
        import whisperx

        print("Loading WhisperX model onto CPU...")
        # Load 'base' model with 'int8' directly in function scope to allow garbage collection later
        model = whisperx.load_model("base", "cpu", compute_type="int8")
        print("WhisperX model loaded.")

        print(f"Loading audio for transcription: {audio_path}")
        audio = whisperx.load_audio(audio_path)

        print("Transcribing audio...")
        # Batch size 4 is reasonable for CPU to balance speed/memory
        result = model.transcribe(audio, batch_size=4)

        language = result["language"]
        print(f"Detected language: {language}")

        # Free base model explicitly before loading alignment model
        del model
        gc.collect()

        # Align segments for precise timestamps
        try:
            print("Aligning subtitles...")
            model_a, metadata = whisperx.load_align_model(
                language_code=language, device="cpu"
            )
            result = whisperx.align(
                result["segments"],
                model_a,
                metadata,
                audio,
                "cpu",
                return_char_alignments=False,
            )
            del model_a
            gc.collect()
        except Exception as align_err:
            print(
                f"Alignment skipped or failed (falling back to default segments): {align_err}"
            )

        print(f"Writing VTT to {output_vtt_path}")
        with open(output_vtt_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for i, segment in enumerate(result["segments"]):
                # Handle potential missing start/end from alignment failures
                start = segment.get("start", 0.0)
                end = segment.get("end", start + 1.0)

                f.write(f"{format_timestamp(start)} --> {format_timestamp(end)}\n")
                f.write(f"{segment['text'].strip()}\n\n")

        return True
    except Exception as e:
        print(f"Subtitle generation exception: {e}")
        raise Exception(f"Subtitle generation failed: {e}")
