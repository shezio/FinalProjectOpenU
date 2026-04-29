import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/families_missing_data_report.css";
import { hasSomePermissions } from "../../components/utils";
import axios from "../../axiosConfig";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 5;

// Same duplicate criteria as the backend create_family dup check:
//   surname + mother_phone
//   surname + father_phone
//   mother_phone + father_phone
//   child_phone_number (alone)
//   date_of_birth + surname
function findDuplicateGroups(families) {
  // Build a map of groupKey → Set of child_ids
  const groupMap = {};

  const addPair = (key, idA, idB) => {
    if (idA === idB) return;
    if (!groupMap[key]) groupMap[key] = new Set();
    groupMap[key].add(idA);
    groupMap[key].add(idB);
  };

  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const a = families[i];
      const b = families[j];

      // API returns: id, last_name, date_of_birth (as "dd/mm/yyyy"), mother_phone, father_phone, child_phone_number
      const surnameA = (a.last_name || "").trim().toLowerCase();
      const surnameB = (b.last_name || "").trim().toLowerCase();
      const mPhoneA  = (a.mother_phone || "").trim();
      const mPhoneB  = (b.mother_phone || "").trim();
      const fPhoneA  = (a.father_phone || "").trim();
      const fPhoneB  = (b.father_phone || "").trim();
      const cPhoneA  = (a.child_phone_number || "").trim();
      const cPhoneB  = (b.child_phone_number || "").trim();
      const dobA     = (a.date_of_birth || "").trim();
      const dobB     = (b.date_of_birth || "").trim();

      // surname + mother_phone
      if (surnameA && mPhoneA && surnameA === surnameB && mPhoneA === mPhoneB) {
        addPair(`surname_mphone:${surnameA}:${mPhoneA}`, a.id, b.id);
      }
      // surname + father_phone
      if (surnameA && fPhoneA && surnameA === surnameB && fPhoneA === fPhoneB) {
        addPair(`surname_fphone:${surnameA}:${fPhoneA}`, a.id, b.id);
      }
      // mother_phone + father_phone
      if (mPhoneA && fPhoneA && mPhoneA === mPhoneB && fPhoneA === fPhoneB) {
        addPair(`mphone_fphone:${mPhoneA}:${fPhoneA}`, a.id, b.id);
      }
      // child_phone_number
      if (cPhoneA && cPhoneA === cPhoneB) {
        addPair(`cphone:${cPhoneA}`, a.id, b.id);
      }
      // date_of_birth + surname
      if (dobA && surnameA && dobA === dobB && surnameA === surnameB) {
        addPair(`dob_surname:${dobA}:${surnameA}`, a.id, b.id);
      }
    }
  }

  // Merge overlapping groups (union-find style)
  const idToGroup = {};
  const groups = [];

  for (const [reason, idSet] of Object.entries(groupMap)) {
    const ids = [...idSet];
    // Find existing groups that contain any of these ids
    const matchingGroupIndices = [];
    for (let g = 0; g < groups.length; g++) {
      if (ids.some(id => groups[g].ids.has(id))) {
        matchingGroupIndices.push(g);
      }
    }

    if (matchingGroupIndices.length === 0) {
      // New group
      const newGroup = { ids: new Set(ids), reasons: [reason] };
      groups.push(newGroup);
      ids.forEach(id => idToGroup[id] = groups.length - 1);
    } else {
      // Merge into first matching group
      const baseIdx = matchingGroupIndices[0];
      ids.forEach(id => groups[baseIdx].ids.add(id));
      groups[baseIdx].reasons.push(reason);
      // Merge other matching groups into base
      for (let k = matchingGroupIndices.length - 1; k >= 1; k--) {
        const mergeIdx = matchingGroupIndices[k];
        groups[mergeIdx].ids.forEach(id => {
          groups[baseIdx].ids.add(id);
          idToGroup[id] = baseIdx;
        });
        groups[baseIdx].reasons.push(...groups[mergeIdx].reasons);
        groups.splice(mergeIdx, 1);
        // Re-index after splice
        for (let id in idToGroup) {
          if (idToGroup[id] >= mergeIdx) idToGroup[id]--;
        }
      }
      ids.forEach(id => idToGroup[id] = baseIdx);
    }
  }

  return groups;
}

function reasonLabel(reason) {
  if (reason.startsWith("surname_mphone")) return "שם משפחה + טלפון אם";
  if (reason.startsWith("surname_fphone")) return "שם משפחה + טלפון אב";
  if (reason.startsWith("mphone_fphone"))  return "טלפון אם + טלפון אב";
  if (reason.startsWith("cphone"))         return "טלפון ילד";
  if (reason.startsWith("dob_surname"))    return "תאריך לידה + שם משפחה";
  return reason;
}

const COMPARE_FIELDS = [
  { key: "first_name",           label: "שם פרטי" },
  { key: "last_name",            label: "שם משפחה" },
  { key: "date_of_birth",        label: "תאריך לידה" },
  { key: "gender",               label: "מגדר",     fmt: v => v ? "נקבה" : "זכר" },
  { key: "city",                 label: "עיר" },
  { key: "child_phone_number",   label: "טלפון ילד" },
  { key: "mother_name",          label: "שם אם" },
  { key: "mother_phone",         label: "טלפון אם" },
  { key: "father_name",          label: "שם אב" },
  { key: "father_phone",         label: "טלפון אב" },
  { key: "treating_hospital",    label: "בית חולים מטפל" },
  { key: "medical_diagnosis",    label: "אבחנה רפואית" },
  { key: "tutoring_status",      label: "סטטוס חונכות" },
  { key: "status",               label: "סטטוס" },
  { key: "marital_status",       label: "מצב משפחתי" },
];

const FamiliesDuplicateReport = () => {
  const navigate = useNavigate();
  const [allFamilies, setAllFamilies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroup, setExpandedGroup] = useState(null); // group index
  const [compareFamily, setCompareFamily] = useState(null); // {groupIdx, familyId}

  const families_resource = "childsmile_app_children";
  const staff_resource    = "childsmile_app_staff";
  const hasPermission = hasSomePermissions([
    { resource: families_resource, action: "CREATE" },
    { resource: staff_resource,    action: "CREATE" },
  ]);

  useEffect(() => {
    if (!hasPermission) return;
    const fetch = async () => {
      try {
        const res = await axios.get("/api/get_complete_family_details/");
        const fams = res.data.families || [];
        setAllFamilies(fams);
        const g = findDuplicateGroups(fams);
        setGroups(g);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (!hasPermission) {
    return (
      <div className="missing-main-content">
        <Sidebar />
        <InnerPageHeader title="דוח כפילויות משפחות" />
        <div className="page-content">
          <div className="no-permission"><h2>אין הרשאה</h2></div>
        </div>
      </div>
    );
  }

  const familyById = Object.fromEntries(allFamilies.map(f => [f.id, f]));

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = groups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // date_of_birth from API is already "dd/mm/yyyy" — no reformatting needed
  const fmtDate = (v) => v || "—";

  return (
    <div className="missing-main-content">
      <Sidebar />
      <InnerPageHeader title="דוח כפילויות משפחות" />
      <div className="page-content">
        <div className="missing-filter-card" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 24, fontWeight: 600, color: "#5a3d8c" }}>
              {loading ? "טוען..." : `${groups.length} קבוצות כפילות אפשריות`}
            </span>
            <button
              className="back-button"
              onClick={() => navigate("/reports")}
              style={{ marginRight: "auto" }}
            >
              ← חזרה לדוחות
            </button>
          </div>
        </div>

        {loading ? (
          <div className="missing-compact-table" style={{ textAlign: "center", padding: 48, fontSize: 24 }}>
            טוען נתונים...
          </div>
        ) : groups.length === 0 ? (
          <div className="missing-compact-table" style={{ textAlign: "center", padding: 48, fontSize: 24 }}>
            🎉 לא נמצאו כפילויות אפשריות
          </div>
        ) : (
          <>
            <div className="missing-table-container">
              <table className="missing-compact-table" dir="rtl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>מספר רשומות</th>
                    <th>סיבות דמיון</th>
                    <th>שמות המשפחות</th>
                    <th>פרטים</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((group, relIdx) => {
                    const absIdx = (safePage - 1) * PAGE_SIZE + relIdx;
                    const familyIds = [...group.ids];
                    const uniqueReasons = [...new Set(group.reasons.map(r => r.split(":")[0]).map(reasonLabel))];
                    const names = familyIds.map(id => {
                      const f = familyById[id];
                      return f ? `${f.first_name} ${f.last_name} (#${id})` : `#${id}`;
                    });
                    const isExpanded = expandedGroup === absIdx;

                    return (
                      <React.Fragment key={absIdx}>
                        <tr
                          className="missing-compact-table tr"
                          style={{ cursor: "pointer", background: isExpanded ? "#f3eff9" : undefined }}
                          onClick={() => setExpandedGroup(isExpanded ? null : absIdx)}
                        >
                          <td style={{ textAlign: "center", color: "#888" }}>{absIdx + 1}</td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>{familyIds.length}</td>
                          <td>
                            <div className="missing-badges-cell">
                              {uniqueReasons.map(r => (
                                <span key={r} className="missing-badge missing-badge-diagnosis">{r}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {names.map(n => <span key={n} style={{ fontSize: 20 }}>{n}</span>)}
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontSize: 22 }}>{isExpanded ? "▲ סגור" : "▼ השווה"}</span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div style={{ padding: "16px 24px", background: "#faf8ff", borderBottom: "2px solid #e2d9f3" }}>
                                {/* Horizontal side-by-side comparison table */}
                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 20, direction: "rtl" }}>
                                    <thead>
                                      <tr>
                                        <th style={{ background: "#e9e2f8", padding: "8px 14px", textAlign: "right", border: "1px solid #d5caf0", width: 160 }}>שדה</th>
                                        {familyIds.map(id => {
                                          const f = familyById[id];
                                          return (
                                            <th key={id} style={{ background: "#e9e2f8", padding: "8px 14px", textAlign: "center", border: "1px solid #d5caf0", minWidth: 180 }}>
                                              {f ? `${f.first_name} ${f.last_name}` : `#${id}`}
                                              <br />
                                              <span style={{ fontWeight: 400, fontSize: 16, color: "#7c5cbf" }}>#{id}</span>
                                            </th>
                                          );
                                        })}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {COMPARE_FIELDS.map(({ key, label, fmt }) => {
                                        const vals = familyIds.map(id => {
                                          const f = familyById[id];
                                          if (!f) return "—";
                                          const raw = f[key];
                                          if (fmt) return fmt(raw) || "—";
                                          if (key === "date_of_birth") return fmtDate(raw);
                                          return raw || "—";
                                        });
                                        // Highlight if all values are the same and non-empty
                                        const allSame = vals.every(v => v !== "—" && v === vals[0]);
                                        return (
                                          <tr key={key}>
                                            <td style={{ padding: "7px 14px", border: "1px solid #e2d9f3", fontWeight: 600, background: "#f8f5ff" }}>{label}</td>
                                            {vals.map((v, vi) => (
                                              <td key={vi} style={{
                                                padding: "7px 14px",
                                                border: "1px solid #e2d9f3",
                                                textAlign: "center",
                                                background: allSame ? "#dff4e8" : undefined,
                                                color:      allSame ? "#1e7c45" : undefined,
                                                fontWeight: allSame ? 600 : undefined,
                                              }}>
                                                {v}
                                              </td>
                                            ))}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination" style={{ marginTop: 24 }}>
              <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
              <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
              {Array.from({ length: totalPages }, (_, i) => {
                const pageNum = i + 1;
                const maxButtons = 5;
                const halfRange = Math.floor(maxButtons / 2);
                let start = Math.max(1, safePage - halfRange);
                let end = Math.min(totalPages, start + maxButtons - 1);
                if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
                return pageNum >= start && pageNum <= end ? (
                  <button
                    key={pageNum}
                    className={safePage === pageNum ? "active" : ""}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ) : null;
              })}
              <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FamiliesDuplicateReport;
