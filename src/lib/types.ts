/**
 * Types mirroring the Pydantic schemas of MES_Api.
 *
 * Quirks worth knowing (verified live against MES_Api):
 *
 * - Admin schemas do not expose `status`, so draft/published state is derived
 *   from `GET /api/v1/public/universities/` (published only) - see `publishedIds()`.
 * - `ProgramSummary` returns the stored fee fields
 *   `tuition_per_year` / `tuition_per_credit`.
 *   Program forms send tuition fields only when the user actually types one,
 *   so an edit never wipes values it cannot see.
 */

export type UniversityType = "PUBLIC" | "PRIVATE";
export type Status = "DRAFT" | "PUBLISHED";
export type DegreeLevel = "DIPLOMA" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "PHD";
export type Currency = "USD" | "KHR";

export type UnitKind = "FACULTY" | "DEPARTMENT" | "SUB_DEPARTMENT" | "FOUNDATION";

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
  tuition_per_year: number | null;
  tuition_per_credit: number | null;
  fee_currency: Currency;
}

/** `UnitSummary` item, from `GET /api/v1/admin/universities/{university_id}/units`. */
export interface UnitSummary {
  id: string;
  slug: string;
  parent_id?: string | null;
  kind: UnitKind;
  name_en: string;
  name_kh?: string | null;
  category_en: string;
  category_kh?: string | null;
  logo?: string | null;
  position: number;
}

export const UNIT_KINDS: UnitKind[] = ["FACULTY", "DEPARTMENT", "SUB_DEPARTMENT", "FOUNDATION"];

/** `POST /api/v1/admin/universities/{university_id}/units/` body. */
export interface UnitCreatePayload {
  name_en: string;
  name_kh?: string | null;
  kind: UnitKind;
  parent_id?: string | null;
  category_en?: string;
  category_kh?: string | null;
  logo?: string | null;
  position: number;
}

/** `PATCH /api/v1/admin/universities/{university_id}/units/{unit_id}` body. */
export type UnitUpdatePayload = Partial<UnitCreatePayload>;

/** One facility (lab/centre) row of a unit. */
export interface Facility {
  id: string;
  unit_id: string;
  title: string;
  subtitle: string | null;
  description: string;
  image: string;
  position: number;
}

export type FacilityCreatePayload = Omit<Facility, "id" | "unit_id">;

/** One scholarship row of a unit. */
export interface UnitScholarship {
  id: string;
  unit_id: string;
  name_en: string;
  name_kh: string | null;
  coverage_en: string;
  coverage_kh: string | null;
  requirements: Array<Record<string, unknown>> | null;
  position: number;
}

export type UnitScholarshipCreatePayload = Omit<UnitScholarship, "id" | "unit_id">;

/** One course block inside a curriculum section. */
export interface CurriculumBlock {
  badge_text: string;
  badge_background?: string | null;
  title: string;
  english_title?: string | null;
  credits: string;
  description: string;
  courses: string[];
  special_badge?: string | null;
}

/** One curriculum section row of a unit. */
export interface CurriculumSection {
  id: string;
  unit_id: string;
  heading_en: string;
  heading_kh: string;
  banner_text: string | null;
  blocks: CurriculumBlock[];
  position: number;
}

export type CurriculumSectionCreatePayload = Omit<CurriculumSection, "id" | "unit_id">;

/**
 * `UnitDetail` from `GET /api/v1/admin/universities/{id}/units/{unit_id}`.
 * `facilities` / `scholarships` / `curriculum_sections` are the *effective*
 * rows - inherited from the nearest ancestor that declares any - while the
 * admin content endpoints (`/admin/units/{unit_id}/...`) edit the unit's own
 * rows. Both carry real row ids.
 */
export interface UnitDetail extends UnitSummary {
  curriculum_sections: CurriculumSection[];
  facilities: Facility[];
  scholarships: UnitScholarship[];
  requirements: Array<Record<string, unknown>>;
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
