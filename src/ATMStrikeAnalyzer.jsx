import React, { useMemo, useState } from "react";

// ---- Core logic ---------------------------------------------------------

function roundToNearest50(n) {
  return Math.round(n / 50) * 50;
}

/**
 * strikeData is a flat array, one entry per CE/PE leg per strike.
 * Each entry has: strikePrice, optionType ("CE" | "PE"), closePrice, prevClose, expiryDate...
 */
function buildRecords(raw) {
  // Decide price field once, globally: closePrice unless ALL records have closePrice === 0
  const allCloseZero = raw.every((r) => Number(r.closePrice) === 0);
  const priceField = allCloseZero ? "prevClose" : "closePrice";

  const byStrike = new Map();
  for (const r of raw) {
    const strike = parseFloat(String(r.strikePrice).trim());
    if (Number.isNaN(strike)) continue;
    const price = Number(r[priceField]);

    if (!byStrike.has(strike)) {
      byStrike.set(strike, { strike, ceLtp: NaN, peLtp: NaN });
    }
    const entry = byStrike.get(strike);
    if (r.optionType === "CE") entry.ceLtp = price;
    else if (r.optionType === "PE") entry.peLtp = price;
  }

  return {
    priceField,
    records: Array.from(byStrike.values()).sort((a, b) => a.strike - b.strike),
  };
}

function computeAnalysis(records) {
  const valid = records.filter(
    (r) => !Number.isNaN(r.ceLtp) && !Number.isNaN(r.peLtp)
  );
  if (valid.length === 0) return null;

  let atm = valid[0];
  let minDiff = Math.abs(valid[0].ceLtp - valid[0].peLtp);
  for (const r of valid) {
    const d = Math.abs(r.ceLtp - r.peLtp);
    if (d < minDiff) {
      minDiff = d;
      atm = r;
    }
  }

  const avgPremium = (atm.ceLtp + atm.peLtp) / 2;
  const roundedPremium = roundToNearest50(avgPremium);
  const step = roundedPremium > 0 ? roundedPremium : 50;

  const findStrike = (target) =>
    records.find((r) => Math.abs(r.strike - target) < 0.01);

  const strike1Target = atm.strike + step;
  const strike2Target = atm.strike - step;
  const strike1Row = findStrike(strike1Target);
  const strike2Row = findStrike(strike2Target);

  const widthDiff =
    strike1Row && strike2Row ? strike1Row.strike - strike2Row.strike : null;

  return {
    atm,
    avgPremium,
    roundedPremium,
    step,
    strike1Row,
    strike2Row,
    widthDiff,
  };
}

const fmt = (n, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: d }) : "—";

// ---- UI -------------------------------------------------------------------

export default function ATMStrikeAnalyzer() {
  const [strikeData, setStrikeData] = useState(null);
  const [fileError, setFileError] = useState("");

  const { result, priceField, error } = useMemo(() => {
    if (!strikeData) {
      return { result: null, priceField: "", error: "Please upload a strike JSON file.", expiry: "", underlying: "" };
    }

    try {
      let raw = strikeData;
      if (!Array.isArray(raw) && raw.records && Array.isArray(raw.records)) {
        raw = raw.records;
      }
      if (!Array.isArray(raw)) throw new Error("uploaded JSON does not contain an array of records");

      const { records, priceField } = buildRecords(raw);
      const analysis = computeAnalysis(records);
      return {
        result: analysis,
        priceField,
        error: analysis ? "" : "Could not find any strike with both CE and PE prices.",
        expiry: raw[0]?.expiryDate ?? "",
        underlying: raw[0]?.underlying ?? "",
      };
    } catch (err) {
      return { result: null, priceField: "", error: "Failed to parse uploaded JSON: " + err.message, expiry: "", underlying: "" };
    }
  }, [strikeData]);

  function handleFile(e) {
    setFileError("");
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setStrikeData(parsed);
      } catch (err) {
        setStrikeData(null);
        setFileError("Invalid JSON file: " + err.message);
      }
    };
    reader.onerror = () => {
      setFileError("Failed to read file");
    };
    reader.readAsText(f);
  }

  return (
    <div className="analyzer-root">
      <div className="analyzer-container">
        <div className="analyzer-header">
          <div className="meta-label">Option Chain · Strike Analyzer</div>
          <h1 className="main-title">ATM Strike &amp; Strangle Finder</h1>
          <div className="file-input-wrap">
            <input type="file" accept="application/json" onChange={handleFile} />
            {fileError && <div className="file-error">{fileError}</div>}
          </div>
          {priceField === "prevClose" && (
            <div className="prevclose-badge">
              closePrice was 0 across all records — using prevClose instead.
            </div>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {result && (
          <div className="result-grid">
            {/* ATM card */}
            <div className="card">
              <div className="card-subtitle">ATM Strike</div>
              <div className="atm-value">{fmt(result.atm.strike, 0)}</div>
              <div className="price-row">
                <div>
                  <span className="muted-label">CE {priceField === "prevClose" ? "PrevClose" : "Close"} </span>
                  <span className="mono">{fmt(result.atm.ceLtp)}</span>
                </div>
                <div>
                  <span className="muted-label">PE {priceField === "prevClose" ? "PrevClose" : "Close"} </span>
                  <span className="mono">{fmt(result.atm.peLtp)}</span>
                </div>
                <div>
                  <span className="muted-label">|CE − PE| </span>
                  <span className="mono">{fmt(Math.abs(result.atm.ceLtp - result.atm.peLtp))}</span>
                </div>
              </div>

              <div className="card-footer">
                <div>
                  <div className="small-uppercase">Premium Avg</div>
                  <div className="stat-value">{fmt(result.avgPremium)}</div>
                </div>
                <div>
                  <div className="small-uppercase">Premium Rounded (₹50)</div>
                  <div className={"stat-value stat-value-accent"}>{fmt(result.roundedPremium, 0)}</div>
                </div>
              </div>
            </div>

            {/* Strike pair cards */}
            <div className="strike-grid">
              <StrikeCard
                label={`Strike1 (ATM + ${result.step})`}
                row={result.strike1Row}
                widthDiff={result.widthDiff}
              />
              <StrikeCard
                label={`Strike2 (ATM − ${result.step})`}
                row={result.strike2Row}
                widthDiff={result.widthDiff}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StrikeCard({ label, row, widthDiff }) {
  const diff = row ? row.ceLtp - row.peLtp : null;
  return (
    <div className="strike-card">
      <div className="card-subtitle-small">{label}</div>

      {!row ? (
        <div className="empty-text">No matching strike row found in the data.</div>
      ) : (
        <>
          <div className="strike-value">{fmt(row.strike, 0)}</div>
          <div className="strike-lines">
            <Line label="Strike1 − Strike2" value={fmt(widthDiff, 0)} />
            <Line label="CE − PE" value={fmt(diff)} accent />
          </div>
        </>
      )}
    </div>
  );
}

function Line({ label, value, accent }) {
  return (
    <div className="line-row">
      <span className="line-label">{label}</span>
      <span className={"line-value" + (accent ? " accent" : "")}>
        {value}
      </span>
    </div>
  );
}
