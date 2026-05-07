import React from "react";
import {
  CameraOutlined,
  ThunderboltFilled,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import "./Footer.css";

function Footer() {
  return (
    <footer className="studio-footer">
      <div className="footer-glow" />

      <div className="footer-brand">
        <div className="footer-logo">
          <CameraOutlined />
        </div>

        <div>
          <h3>Apenture X Studios</h3>
          <p>
            Creative blue admin experience for studio insights, reviews, client
            enquiries, and production flow.
          </p>
        </div>
      </div>

      <div className="footer-status">
        <div className="footer-status-item">
          <ThunderboltFilled />
          <span>Live Studio System</span>
        </div>

        <div className="footer-status-item">
          <SafetyCertificateOutlined />
          <span>Secure Admin Panel</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
