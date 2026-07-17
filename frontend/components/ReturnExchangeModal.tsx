"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

const REASONS = [
  "Size doesn't fit (Too small/large)",
  "Wrong product received",
  "Product is damaged or defective",
  "Quality not as expected",
  "Changed my mind",
];

export default function ReturnExchangeModal({
  orderId,
  orderNumber,
  onClose,
  onSubmitted,
}: {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [requestType, setRequestType] = useState<"Return" | "Exchange">("Return");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>(`/api/order/${orderId}/return-exchange`, {
        method: "POST",
        body: JSON.stringify({ request_type: requestType, reason: `${reason} - ${details}` }),
      });
      if (result.success) {
        alert(result.message);
        onSubmitted();
      } else {
        alert(result.message || "Failed to submit request.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred while submitting your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 25, maxWidth: 500, width: "90%", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1.5px solid #eee", paddingBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "1.3rem", margin: 0, color: "#000" }}>
            Apply Return / Exchange — Order #{orderNumber}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.8rem", lineHeight: 1, cursor: "pointer", color: "#aaa", padding: 5 }}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: 700, fontSize: "0.85rem", display: "block", marginBottom: 8, color: "#333" }}>Request Type *</label>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" name="request_type" checked={requestType === "Return"} onChange={() => setRequestType("Return")} style={{ width: 18, height: 18 }} /> Return Item
              </label>
              <label style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" name="request_type" checked={requestType === "Exchange"} onChange={() => setRequestType("Exchange")} style={{ width: 18, height: 18 }} /> Exchange Item
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: 700, fontSize: "0.85rem", display: "block", marginBottom: 8, color: "#333" }}>Select Reason *</label>
            <select required value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", padding: 12, border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: "0.9rem" }}>
              <option value="">-- Choose a Reason --</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 700, fontSize: "0.85rem", display: "block", marginBottom: 8, color: "#333" }}>Additional Comments / Details *</label>
            <textarea required rows={3} placeholder="Provide extra details for return/exchange approval..." value={details} onChange={(e) => setDetails(e.target.value)} style={{ width: "100%", padding: 12, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1.5px solid #eee", paddingTop: 15 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: "10px 20px", fontWeight: 700 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: "10px 25px", fontWeight: 700, background: "var(--primary)", color: "#fff", border: "none" }}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
