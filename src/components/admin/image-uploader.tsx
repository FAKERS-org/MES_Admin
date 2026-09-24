import { uploadImageToR2 } from "@/lib/utils/upload-to-r2";
import { useState } from "react";

export function ImageUploader({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // This handles the whole 3-step process!
            const publicUrl = await uploadImageToR2(file);
            onUploadSuccess(publicUrl); // Pass the URL back to your form state
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
            {uploading && <p>Uploading to R2...</p>}
        </div>
    );
}
