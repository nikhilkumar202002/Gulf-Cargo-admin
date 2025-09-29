import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { FiArrowLeft } from "react-icons/fi";
import { FaExternalLinkAlt, FaGlobe, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import "../styles.css";
import "./BranchStyles.css";

/* Skeleton chip */
const Skel = ({ w = 120, h = 14, r = 8, className = "" }) => (
  <span
    className={`skel ${className}`}
    style={{
      display: "inline-block",
      width: typeof w === "number" ? `${w}px` : w,
      height: typeof h === "number" ? `${h}px` : h,
      borderRadius: r,
    }}
    aria-hidden="true"
  />
);

export default function ViewBranch() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guard against duplicate effect runs in StrictMode (dev) and stale updates
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const fetchBranch = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/branch/${id}`, { signal: ctrl.signal });
        const b = res?.data?.branch ?? res?.data?.data ?? res?.data ?? null;
        if (!aborted) setBranch(b || null);
      } catch (err) {
        if (aborted) return;
        if (err?.name === "CanceledError") return;
        setBranch(null);
        setError(err?.response?.data?.message || "Failed to fetch branch details.");
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    // prevent duplicate immediate calls in dev strict mode
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBranch();
    } else {
      // when id changes for real navigation, refetch
      fetchBranch();
    }

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [id]);

  const isActive =
    branch &&
    (branch.status === 1 ||
      branch.status === "1" ||
      branch.status === true ||
      branch.status === "Active");

  return (
    <section className="vb-wrap">
      {/* Header bar */}
      <div className="ipx-head ipx-head-bar vb-head">
        <div className="ipx-brand">
          <h2 className="ipx-title">Branch Details</h2>
          <p className="ipx-sub">Profile and contact information for branch #{id}.</p>
        </div>
        <div className="vb-head-actions">
          <button className="ipx-btn ghost vb-back" onClick={() => navigate(-1)}>
            <FiArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="vb-card vb-error">{error}</div>}

      {/* Main card */}
      <div className="vb-card" aria-busy={loading}>
        {/* Title row */}
        <div className="vb-title-row">
          <div className="vb-title-main">
            {loading ? (
              <>
                <Skel w={220} h={22} />
                <Skel w={140} />
              </>
            ) : (
              <>
                <h3 className="vb-branch-name">{branch?.branch_name || "—"}</h3>
                <div className="vb-badges">
                  <span className={`ipx-pill ${isActive ? "ok" : "muted"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  {branch?.branch_code && (
                    <span className="vb-code-chip">Code: {branch.branch_code}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {!loading && branch?.branch_website && (
            <a
              className="ipx-btn primary vb-visit"
              href={branch.branch_website}
              target="_blank"
              rel="noopener noreferrer"
              title="Open website"
            >
              Visit Site <FaExternalLinkAlt />
            </a>
          )}
        </div>

        {/* Content grid */}
        <div className="vb-grid">
          {/* Contact */}
          <div className="vb-section">
            <div className="vb-section-head">
              <FaPhoneAlt className="vb-icon" />
              <h4>Contact</h4>
            </div>
            <div className="vb-kv">
              <span>Primary</span>
              <div>{loading ? <Skel w={160} /> : (branch?.branch_contact_number || "—")}</div>
            </div>
            <div className="vb-kv">
              <span>Alternative</span>
              <div>{loading ? <Skel w={140} /> : (branch?.branch_alternative_number || "—")}</div>
            </div>
            <div className="vb-kv">
              <span>Email</span>
              <div className="vb-clip">{loading ? <Skel w={220} /> : (branch?.branch_email || "—")}</div>
            </div>
          </div>

          {/* Location */}
          <div className="vb-section">
            <div className="vb-section-head">
              <FaMapMarkerAlt className="vb-icon" />
              <h4>Location</h4>
            </div>
            <div className="vb-kv">
              <span>Address</span>
              <div className="vb-clip">{loading ? <Skel w="80%" /> : (branch?.branch_address || "—")}</div>
            </div>
            <div className="vb-kv">
              <span>City / Area</span>
              <div>{loading ? <Skel w={160} /> : (branch?.branch_location || "—")}</div>
            </div>
            <div className="vb-kv">
              <span>Website</span>
              <div className="vb-clip">
                {loading ? (
                  <Skel w={220} />
                ) : branch?.branch_website ? (
                  <a
                    href={branch.branch_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vb-link"
                  >
                    <FaGlobe /> {branch.branch_website}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="vb-kv">
              <span>Status</span>
              <div>
                {loading ? (
                  <Skel w={80} h={22} r={999} />
                ) : (
                  <span className={`ipx-pill ${isActive ? "ok" : "muted"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
