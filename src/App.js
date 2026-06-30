import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import ATMStrikeAnalyzer from "./ATMStrikeAnalyzer";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ATMStrikeAnalyzer />} />
      </Routes>
    </Router>
  );
}