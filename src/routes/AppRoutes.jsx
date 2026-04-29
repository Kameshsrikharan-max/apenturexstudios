import { Routes, Route } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
    </Routes>
  );
}