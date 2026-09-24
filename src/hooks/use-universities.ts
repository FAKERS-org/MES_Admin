import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
// Import types generated in Step 1!

export function useUniversities() {
    return useQuery({
        queryKey: ["universities"],
        queryFn: async () => {
            // Notice how clean this is. No loading state management needed here.
            const response = await apiClient.get("/public/universities");
            return response.data;
        },
    });// src/hooks/useUniversities.ts
}
