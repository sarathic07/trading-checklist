import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";

const defaultRules = [
  "CPR is narrow (weekly expiry)",
  "Camarilla S3/R3 inside CPR",
  "Both Supertrend and VWAP broken",
  "Weekly CPR is directional",
  "Monthly CPR is directional",
  "Check overall trend (index bias)",
  "Avoid major news days",
  "Wait for first 15–30 min range",
  "Confirm volume expansion",
  "Risk defined before entry",
  "Max 2 trades only",
  "Stay disciplined (no revenge trade)",
  "Opening inside CPR → expect range, avoid early trade",
  "Opening outside CPR → wait for retest before entry",
  "Previous day High/Low respected or broken"
];

function Home() {
  const [rules, setRules] = useState([]);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    const savedRules = JSON.parse(localStorage.getItem("rules")) || defaultRules;
    const savedChecks = JSON.parse(localStorage.getItem("checks")) || {};
    setRules(savedRules);
    setChecked(savedChecks);
  }, []);

  useEffect(() => {
    localStorage.setItem("checks", JSON.stringify(checked));
  }, [checked]);

  const toggleRule = (rule) => {
    setChecked({ ...checked, [rule]: !checked[rule] });
  };

  const allChecked = rules.length > 0 && rules.every(r => checked[r]);

  return (
    <div className="container">
      <h1>📊 Weekly Expiry Trading Checklist</h1>

      <Link to="/manage">
        <button className="manage-btn">Manage Rules</button>
      </Link>

      <ul>
        {rules.map((rule, index) => (
          <li key={index}>
            <input
              type="checkbox"
              checked={checked[rule] || false}
              onChange={() => toggleRule(rule)}
            />
            {rule}
          </li>
        ))}
      </ul>

      <div className={`status ${allChecked ? "pass" : "fail"}`}>
        {allChecked ? "✅ ALLOWED TO TRADE" : "❌ DO NOT TRADE"}
      </div>
    </div>
  );
}

function Manage() {
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    const savedRules = JSON.parse(localStorage.getItem("rules")) || defaultRules;
    setRules(savedRules);
  }, []);

  const addRule = () => {
    if (!newRule.trim()) return;
    const updated = [...rules, newRule];
    setRules(updated);
    localStorage.setItem("rules", JSON.stringify(updated));
    setNewRule("");
  };

  const deleteRule = (index) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
    localStorage.setItem("rules", JSON.stringify(updated));
  };

  return (
    <div className="container">
      <h1>⚙️ Manage Rules</h1>

      <Link to="/">
        <button>⬅ Back</button>
      </Link>

      <div className="add-rule">
        <input
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="Add new rule"
        />
        <button onClick={addRule}>Add</button>
      </div>

      <ul>
        {rules.map((rule, index) => (
          <li key={index}>
            {rule}
            <button onClick={() => deleteRule(index)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/manage" element={<Manage />} />
      </Routes>
    </Router>
  );
}