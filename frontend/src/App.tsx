import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, redirect, RouterProvider } from "react-router-dom";

import { readDemoSession } from "./api/client";
import GigDetailPage from "./pages/GigDetailPage";
import GigsPage from "./pages/GigsPage";
import LoginPage from "./pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function requireDemoSession(): null {
  if (!readDemoSession()) throw redirect("/");
  return null;
}

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/gigs", loader: requireDemoSession, element: <GigsPage /> },
  {
    path: "/gigs/:gigId",
    loader: requireDemoSession,
    element: <GigDetailPage />,
  },
  { path: "*", loader: () => redirect("/") },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}