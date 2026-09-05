import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@/lib/i18n";
import RootLayout from "./pages/layout";
import DashboardPage from "./pages/dashboard/page";
import ErrorPage from "./pages/error/page";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "*", element: <ErrorPage /> },
    ],
  },
]);

const element = document.getElementById("root");
if (!element) throw new Error("Root element #root not found");

const app = (
  <StrictMode>
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>
  </StrictMode>
);

(import.meta.hot.data.root ??= createRoot(element)).render(app);
