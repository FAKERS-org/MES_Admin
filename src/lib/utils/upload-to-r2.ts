import apiClient from "@/lib/api/client"; // Your axios instance from the previous step

export async function uploadImageToR2(file: File): Promise<string> {
    // 1. Ask the backend for a presigned URL
    const { data } = await apiClient.post("/admin/upload/generate-presigned-url", {
        file_name: file.name,
        content_type: file.type,
    });

    const { upload_url, file_key } = data;

    // 2. Upload the file DIRECTLY to Cloudflare R2
    const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to R2");
    }

    // 3. Construct and return the final public URL
    // Make sure R2_PUBLIC_URL is in your Next.js .env.local
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${file_key}`;

    return publicUrl;
}
