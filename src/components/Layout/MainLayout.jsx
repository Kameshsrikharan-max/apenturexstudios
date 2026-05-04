// src/components/Layout/MainLayout.jsx
import React from "react";
import Sidebar from "../UI/Sidebar";   // Adjust path if needed
import "./MainLayout.css";

const MainLayout = ({ children, user }) => {
  return (
    <div className="main-layout">
      <Sidebar dark={true} />

      <div className="main-content-area">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;