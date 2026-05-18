import React, { useState } from "react";
import AppRoutes from "./routes/AppRoutes";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    console.log("Access Granted:", userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");

    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AppRoutes
      isAuthenticated={isAuthenticated}
      onLogin={handleLoginSuccess}
      onLogout={handleLogout}
      user={user}
    />
  );
}

export default App;
