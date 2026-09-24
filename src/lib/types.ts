/**
 * Types mirroring the Pydantic schemas of MES_Api.
 *
 * Quirks worth knowing (verified live against MES_Api):
 *
 * - Admin schemas do not expose `status`, so draft/published state is derived
 *   from `GET /api/v1/public/universities/` (published only) - see `publishedIds()`.
 * - `ProgramSummary` exposes `tuition_fee`, but the model only stores
 *   `tuition_per_year` / `tuition_per_credit`, so `tuition_fee` is always null.
 *   Program forms send tuition fields only when the user actually types one,
 *   so an edit never wipes values it cannot see.
 */

export type UniversityType = "PUBLIC" | "PRIVATE";
export type Status = "DRAFT" | "PUBLISHED";
export type DegreeLevel = "DIPLOMA" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "PHD";
export type Currency = "USD" | "KHR";

export const UNIVERSITY_TYPES: UniversityType[] = ["PUBLIC", "PRIVATE"];
export const STATUSES: Status[] = ["DRAFT", "PUBLISHED"];
export const DEGREE_LEVELS: DegreeLevel[] = ["DIPLOMA", "ASSOCIATE", "BACHELOR", "MASTER", "PHD"];
export const CURRENCIES: Currency[] = ["USD", "KHR"];

/** Cambodian provinces, for the location dropdown. */
export const PROVINCES: string[] = [
  "Phnom Penh",
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratié",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takeo",
  "Tbong Khmum",
];

/** `GET /api/v1/admin/universities/` item. */
export interface UniversitySummary {
  id: string;
  name_en: string;
  name_kh: string | null;
  abbreviation: string | null;
  type: UniversityType;
  province: string;
  logo_url: string | null;
  moeys_accredited: boolean;
  established_year: number | null;
}

/** `GET /api/v1/admin/universities/{id}` response. */
export interface UniversityDetail extends UniversitySummary {
  address: string | null;
  website: string | null;
  cover_image_url: string | null;
  overview_en: string | null;
  overview_kh: string | null;
  has_scholarships: boolean;
  scholarship_info: string | null;
  has_dormitory: boolean;
  dormitory_details: string | null;
  programs: ProgramSummary[];
}

/** `POST /api/v1/admin/universities/` body. */
export interface UniversityCreatePayload {
  name_en: string;
  name_kh?: string | null;
  abbreviation?: string | null;
  type: UniversityType;
  province: string;
}

/** `PATCH /api/v1/admin/universities/{id}` body (field names as the API accepts them). */
export interface UniversityUpdatePayload {
  name_en?: string;
  name_kh?: string | null;
  abbreviation?: string | null;
  type?: UniversityType;
  status?: Status;
  moeys_accredited?: boolean;
  province?: string;
  address?: string | null;
  website?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  overview_en?: string | null;
  overview_kh?: string | null;
  established_year?: number | null;
  has_scholarships?: boolean;
  scholarship_info?: string | null;
  has_dormitory?: boolean;
  dormitory_details?: string | null;
}

/** `ProgramSummary` item, embedded in `UniversityDetail.programs`. */
export interface ProgramSummary {
  id: string;
  name_en: string;
  name_kh: string | null;
  faculty: string | null;
  degree_level: DegreeLevel;
  duration_years: number | null;
  tuition_fee: number | null;
  fee_currency: Currency;
}

/** `POST /api/v1/admin/universities/{id}/programs/` body. */
export interface ProgramCreatePayload {
  name_en: string;
  name_kh?: string | null;
  faculty?: string | null;
  degree_level: DegreeLevel;
  duration_years: number;
  tuition_per_year?: number | null;
  tuition_per_credit?: number | null;
  fee_currency: Currency;
}

/** `PATCH /api/v1/admin/programs/{id}` body. */
export interface ProgramUpdatePayload {
  name_en?: string;
  name_kh?: string | null;
  faculty?: string | null;
  degree_level?: DegreeLevel;
  duration_years?: number;
  tuition_per_year?: number | null;
  tuition_per_credit?: number | null;
  fee_currency?: Currency;
  overview_en?: string | null;
  overview_kh?: string | null;
  admission_req_en?: string | null;
  admission_req_kh?: string | null;
}

/** `GET /health` response. */
export interface HealthStatus {
  status: string;
  env: string;
}
