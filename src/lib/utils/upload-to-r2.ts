export async function uploadImageToR2(file: File): Promise<string> {
    const response = await fetch("/api/admin/upload/generate-presigned-url", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            file_name: file.name,
            content_type: file.type,
        }),
    });

    if (!response.ok) {
        throw new Error("Could not generate upload URL");
    }

    const { upload_url, public_url } = await response.json();

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

    return public_url;
}
