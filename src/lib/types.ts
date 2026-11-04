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
export type DegreeLevel =
    | "DIPLOMA"
    | "ASSOCIATE"
    | "BACHELOR"
    | "ENGINEERING"
    | "MASTER"
    | "PHD"
    | "CERTIFICATE"
    | "VOCATIONAL"
    | "POSTGRADUATE_DIPLOMA"
    | "RESIDENCY"
    | "OTHER";
export type Currency = "USD" | "KHR";

export type Ministry = "MOEYS" | "MLVT" | "MOH" | "MAFF" | "MPTC" | "MCFA" | "MEF" | "OTHER";

export const MINISTRIES: Ministry[] = [
    "MOEYS",
    "MLVT",
    "MOH",
    "MAFF",
    "MPTC",
    "MCFA",
    "MEF",
    "OTHER",
];

export const MINISTRY_LABELS: Record<Ministry, { en: string; kh: string; short: string }> = {
    MOEYS: {
        short: "MoEYS",
        en: "Ministry of Education, Youth and Sport",
        kh: "ក្រសួងអប់រំ យុវជន និងកីឡា",
    },
    MLVT: {
        short: "MLVT",
        en: "Ministry of Labour and Vocational Training",
        kh: "ក្រសួងការងារ និងបណ្តុះបណ្តាលវិជ្ជាជីវៈ",
    },
    MOH: {
        short: "MOH",
        en: "Ministry of Health",
        kh: "ក្រសួងសុខាភិបាល",
    },
    MAFF: {
        short: "MAFF",
        en: "Ministry of Agriculture, Forestry and Fisheries",
        kh: "ក្រសួងកសិកម្ម រុក្ខាប្រមាញ់ និងនេសាទ",
    },
    MPTC: {
        short: "MPTC",
        en: "Ministry of Post and Telecommunications",
        kh: "ក្រសួងប្រៃសណីយ៍ និងទូរគមនាគមន៍",
    },
    MCFA: {
        short: "MCFA",
        en: "Ministry of Culture and Fine Arts",
        kh: "ក្រសួងវប្បធម៌ និងវិចិត្រសិល្បៈ",
    },
    MEF: {
        short: "MEF",
        en: "Ministry of Economy and Finance",
        kh: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ",
    },
    OTHER: {
        short: "Other",
        en: "Other / Private Independent",
        kh: "ផ្សេងៗ",
    },
};

export type StudyShift = "MORNING" | "AFTERNOON" | "EVENING" | "WEEKEND";

export const STUDY_SHIFTS: StudyShift[] = ["MORNING", "AFTERNOON", "EVENING", "WEEKEND"];

export const STUDY_SHIFT_LABELS: Record<StudyShift, { en: string; kh: string; time: string }> = {
    MORNING: {
        en: "Morning",
        kh: "ព្រឹក",
        time: "07:30 - 11:00",
    },
    AFTERNOON: {
        en: "Afternoon",
        kh: "រសៀល",
        time: "13:30 - 17:00",
    },
    EVENING: {
        en: "Evening",
        kh: "យប់",
        time: "17:30 - 20:30",
    },
    WEEKEND: {
        en: "Weekend",
        kh: "ចុងសប្តាហ៍",
        time: "Sat PM + Sun",
    },
};

export type UnitKind =
    | "FACULTY"
    | "DEPARTMENT"
    | "SUB_DEPARTMENT"
    | "FOUNDATION"
    | "INSTITUTE"
    | "SCHOOL"
    | "COLLEGE"
    | "CENTER"
    | "ACADEMY"
    | "DIVISION"
    | "OTHER";

export const UNIVERSITY_TYPES: UniversityType[] = ["PUBLIC", "PRIVATE"];
export const STATUSES: Status[] = ["DRAFT", "PUBLISHED"];
export const DEGREE_LEVELS: DegreeLevel[] = [
    "DIPLOMA",
    "ASSOCIATE",
    "BACHELOR",
    "ENGINEERING",
    "MASTER",
    "PHD",
    "CERTIFICATE",
    "VOCATIONAL",
    "POSTGRADUATE_DIPLOMA",
    "RESIDENCY",
    "OTHER",
];
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

/** Lightweight campus item returned in university details */
export interface CampusSummary {
    id: number;
    public_id: string;
    campus_name?: string | null;
    is_main_campus: boolean;
    province: string;
    address?: string | null;
}

/** `GET /api/v1/admin/universities/` item. */
export interface UniversitySummary {
    id: string;
    name_en: string;
    name_kh: string | null;
    abbreviation: string | null;
    type: UniversityType;
    ministry: Ministry;
    status?: Status;
    province: string;
    logo_url: string | null;
    moeys_accredited: boolean;
    established_year: number | null;
    parent_id?: number | null;
    campus_name?: string | null;
    is_main_campus?: boolean;
    metadata_json?: Record<string, unknown> | null;
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
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_telegram?: string | null;
    advisor_name?: string | null;
    advisor_role?: string | null;
    advisor_avatar_url?: string | null;
    admissions_requirements_en?: string | null;
    admissions_requirements_kh?: string | null;
    default_tuition_per_year?: number | null;
    default_tuition_female_per_year?: number | null;
    tuition_model?: string | null;
    tuition_min_per_year?: number | null;
    tuition_max_per_year?: number | null;
    has_female_tuition_discount?: boolean;
    metadata_json?: Record<string, unknown> | null;
    programs: ProgramSummary[];
    campuses?: CampusSummary[];
}

/** `POST /api/v1/admin/universities/` body. */
export interface UniversityCreatePayload {
    name_en: string;
    name_kh?: string | null;
    abbreviation?: string | null;
    type: UniversityType;
    ministry?: Ministry;
    status?: Status;
    province: string;
    parent_id?: number | null;
    campus_name?: string | null;
    is_main_campus?: boolean;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_telegram?: string | null;
    advisor_name?: string | null;
    advisor_role?: string | null;
    advisor_avatar_url?: string | null;
    admissions_requirements_en?: string | null;
    admissions_requirements_kh?: string | null;
    metadata_json?: Record<string, unknown> | null;
}

/** `PATCH /api/v1/admin/universities/{id}` body (field names as the API accepts them). */
export interface UniversityUpdatePayload {
    name_en?: string;
    name_kh?: string | null;
    abbreviation?: string | null;
    type?: UniversityType;
    ministry?: Ministry;
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
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_telegram?: string | null;
    advisor_name?: string | null;
    advisor_role?: string | null;
    advisor_avatar_url?: string | null;
    admissions_requirements_en?: string | null;
    admissions_requirements_kh?: string | null;
    default_tuition_per_year?: number | null;
    default_tuition_female_per_year?: number | null;
    parent_id?: number | null;
    campus_name?: string | null;
    is_main_campus?: boolean;
    metadata_json?: Record<string, unknown> | null;
}

/** `ProgramSummary` item, embedded in `UniversityDetail.programs`. */
export interface ProgramSummary {
    id: string;
    unit_id?: number | null;
    unit_name?: string | null;
    name_en: string;
    name_kh: string | null;
    faculty: string | null;
    degree_level: DegreeLevel;
    duration_years: number | null;
    tuition_per_year: number | null;
    tuition_female_per_year?: number | null;
    tuition_per_credit: number | null;
    effective_tuition_per_year?: number | null;
    effective_tuition_female_per_year?: number | null;
    tuition_discount_percent?: number | null;
    fee_currency: Currency;
    shifts?: StudyShift[] | null;
    curriculum_sections?: CurriculumSection[] | null;
    field_of_study?: string | null;
    cqf_level?: string | null;
    language_track?: string | null;
    accreditations?: string[] | null;
    estimated_annual_min_usd?: number | null;
    estimated_annual_max_usd?: number | null;
    metadata_json?: Record<string, unknown> | null;
}

/** `UnitSummary` item, from `GET /api/v1/admin/universities/{university_id}/units`. */
export interface UnitSummary {
    id: string;
    slug: string;
    university_id?: string | number | null;
    parent_id?: string | null;
    kind: UnitKind;
    name_en: string;
    name_kh?: string | null;
    category_en: string;
    category_kh?: string | null;
    logo?: string | null;
    default_tuition_per_year?: number | null;
    default_tuition_female_per_year?: number | null;
    is_autonomous?: boolean;
    acronym?: string | null;
    position?: number;
    metadata_json?: Record<string, unknown> | null;
}

export interface UnitListItem extends UnitSummary {
    university_name?: string | null;
    university_abbreviation?: string | null;
    parent_name?: string | null;
    programs_count?: number;
}

export const UNIT_KINDS: UnitKind[] = [
    "FACULTY",
    "INSTITUTE",
    "SCHOOL",
    "COLLEGE",
    "DEPARTMENT",
    "SUB_DEPARTMENT",
    "CENTER",
    "ACADEMY",
    "DIVISION",
    "FOUNDATION",
    "OTHER",
];

/** `POST /api/v1/admin/universities/{university_id}/units/` body. */
export interface UnitCreatePayload {
    name_en: string;
    name_kh?: string | null;
    acronym?: string | null;
    is_autonomous?: boolean;
    kind: UnitKind;
    parent_id?: string | null;
    category_en?: string;
    category_kh?: string | null;
    logo?: string | null;
    position?: number;
    default_tuition_per_year?: number | null;
    default_tuition_female_per_year?: number | null;
    metadata_json?: Record<string, unknown> | null;
}

export interface UnitCreateDirectPayload extends UnitCreatePayload {
    university_id: number;
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

/** One curriculum section row of a unit or program. */
export interface CurriculumSection {
    id: string;
    unit_id?: string | null;
    program_id?: string | null;
    heading_en: string;
    heading_kh: string;
    banner_text: string | null;
    blocks: CurriculumBlock[];
    position: number;
}

export type CurriculumSectionCreatePayload = Omit<CurriculumSection, "id" | "unit_id" | "program_id">;

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
    unit_id?: number | null;
    degree_level: DegreeLevel;
    duration_years: number;
    tuition_per_year?: number | null;
    tuition_female_per_year?: number | null;
    tuition_per_credit?: number | null;
    fee_currency: Currency;
    shifts?: StudyShift[] | null;
    curriculum_sections?: CurriculumSection[] | null;
    field_of_study?: string | null;
    cqf_level?: string | null;
    language_track?: string | null;
    accreditations?: string[] | null;
    estimated_annual_min_usd?: number | null;
    estimated_annual_max_usd?: number | null;
    metadata_json?: Record<string, unknown> | null;
}

/** `PATCH /api/v1/admin/programs/{id}` body. */
export interface ProgramUpdatePayload {
    name_en?: string;
    name_kh?: string | null;
    faculty?: string | null;
    unit_id?: number | null;
    degree_level?: DegreeLevel;
    duration_years?: number;
    tuition_per_year?: number | null;
    tuition_female_per_year?: number | null;
    tuition_per_credit?: number | null;
    fee_currency?: Currency;
    shifts?: StudyShift[] | null;
    overview_en?: string | null;
    overview_kh?: string | null;
    admission_req_en?: string | null;
    admission_req_kh?: string | null;
    field_of_study?: string | null;
    cqf_level?: string | null;
    language_track?: string | null;
    accreditations?: string[] | null;
    metadata_json?: Record<string, unknown> | null;
}

/** `GET /health` response. */
export interface HealthStatus {
    status: string;
    env: string;
}

/**
 * Standard paginated envelope returned by every list endpoint.
 *
 * Mirrors `app.schemas.pagination.Page` in MES_Api: flat snake_case,
 * 1-based `page`, exact `total_items` COUNT(*), plus convenience flags
 * so the frontend never has to recompute `total_pages`.
 */
export interface Page<T> {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    items: T[];
}

/** `ProgramListItem` from `GET /api/v1/admin/programs/`. */
export interface ProgramListItem extends ProgramSummary {
    university_id: string | number;
    university_name: string | null;
    university_abbreviation: string | null;
}

/** `ScholarshipListItem` from `GET /api/v1/admin/scholarships/`. */
export interface ScholarshipListItem {
    id: string | number;
    public_id: string;
    name_en: string;
    name_kh?: string | null;
    coverage_en: string;
    coverage_kh?: string | null;
    requirements?: Array<Record<string, unknown>> | null;
    position: number;
    unit_id?: string | number | null;
    university_id?: string | number | null;
    university_name?: string | null;
    unit_name?: string | null;
}

export interface ScholarshipCreateDirectPayload {
    name_en: string;
    name_kh?: string | null;
    coverage_en: string;
    coverage_kh?: string | null;
    requirements?: Array<Record<string, unknown>> | null;
    position?: number;
    university_id?: number | null;
    unit_id?: number | null;
}

export interface RoleSummary {
    id: number;
    name: string;
    description: string | null;
}

export interface UserSummary {
    id: number;
    public_id: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    roles: string[];
    created_at: string;
}

export interface UserDetail extends UserSummary {
    role_ids: number[];
}

export interface UserCreatePayload {
    email: string;
    password: string;
    is_active?: boolean;
    is_superuser?: boolean;
    role_ids?: number[];
}

export interface UserUpdatePayload {
    email?: string;
    password?: string;
    is_active?: boolean;
    is_superuser?: boolean;
    role_ids?: number[];
}

export interface UserProfile {
    id: number;
    public_id: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    roles: string[];
    permissions: string[];
}

export interface SystemInfo {
    project_name: string;
    environment: string;
    database_status: string;
    r2_storage_configured: boolean;
    total_universities: number;
    total_programs: number;
    total_units: number;
    total_scholarships: number;
    total_users: number;
}
