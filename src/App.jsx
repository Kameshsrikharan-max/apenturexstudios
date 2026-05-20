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
    <div style={{ 
      width: "100%", 
      minHeight: "100vh", 
      backgroundColor: "#020617", 
      margin: 0, 
      padding: 0 
    }}>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        onLogin={handleLoginSuccess}
        onLogout={handleLogout}
        user={user}
      />
    </div>
  );
}

export default App;