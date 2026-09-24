/** Base URL of the MES_Api FastAPI server. Server-side only - never import from client code. */
export const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

/** FastAPI interactive docs, handed to client components as a plain string. */
export const API_DOCS_URL = `${API_URL}/docs`;

/** Version shown in the sidebar. */
export const APP_NAME = "MES Admin";
export const APP_VERSION = "0.1.0";
