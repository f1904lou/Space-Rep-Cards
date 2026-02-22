import { useRef, useState } from "react";

const MAX_FILE_SIZE_MB = 20;

interface ImageUploadProps {
  onFile: (file: File) => void;
}

export default function ImageUpload({ onFile }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.).");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setError(null);
    onFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full max-w-md flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer ${
          dragging
            ? "border-blue-500 bg-blue-950/20"
            : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/40"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-10 h-10 transition-colors ${dragging ? "text-blue-400" : "text-gray-500"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        <div className="text-center">
          <p className={`text-sm font-medium transition-colors ${dragging ? "text-blue-300" : "text-gray-300"}`}>
            Drop an image here
          </p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG · or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
