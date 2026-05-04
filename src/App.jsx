import React, { useState } from 'react';
import AppRoutes from './routes/AppRoutes';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    console.log("Access Granted:", userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  return (
    <AppRoutes 
      isAuthenticated={isAuthenticated} 
      onLogin={handleLoginSuccess}
      user={user}
    />
  );
}

export default App;