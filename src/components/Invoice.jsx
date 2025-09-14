import React from "react";
import "./invoice.css";

/**
 * @typedef {Object} Company
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {string} address
 * @property {string} phones
 * @property {string} email
 * @property {string} vatNo
 * @property {string} branchName
 * @property {string} shipmentType
 * @property {string} sl // Shipment number / SL
 * @property {string} [logoUrl]
 */

/**
 * @typedef {Object} Party
 * @property {string} name
 * @property {string} [idNo]
 * @property {string} [tel]
 * @property {string[]} [addressLines]
 * @property {string} [village]
 * @property {string} [post]
 * @property {string} [dist]
 * @property {string} [state]
 */

/**
 * @typedef {Object} BoxRow
 * @property {string|number} sNo
 * @property {string} boxNo
 * @property {string|number} weight
 */

/**
 * @typedef {Object} ItemRow
 * @property {string|number} sNo
 * @property {string} name
 * @property {string|number} qty
 */

const currency = (n, ccy = "SAR") =>
  new Intl.NumberFormat("en", { style: "currency", currency: ccy, minimumFractionDigits: 2 }).format(Number(n || 0));

/** Simple bullet list (wraps gracefully for print) */
const BulletList = ({ lines = [] }) => (
  <ul className="bullets">
    {lines.filter(Boolean).map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
);

export default function Invoice({
  company,
  shipper,
  consignee,
  summary,   // { pieces, weight, dateTime }
  boxes = [],
  items = [],
  totals,    // { subtotal, billCharges, vatPercent, netTotal, currency?: "SAR" }
  terms = [],
  footerNote = "Thanks for your visit! Come again!!" // keeps it friendly
}) {
  const ccy = totals?.currency || "SAR";
  const vatPct = Number(totals?.vatPercent || 0);
  const computedNet = Number(totals?.subtotal || 0) + Number(totals?.billCharges || 0) + (vatPct ? (Number(totals?.subtotal || 0) * vatPct) / 100 : 0);
  const netTotal = totals?.netTotal != null ? totals.netTotal : computedNet;

  return (
    <div className="invoice">
      {/* Toolbar (hidden in print) */}
      <div className="toolbar no-print">
        <button onClick={() => window.print()} className="btn">
          🖨️ Print
        </button>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          {company?.logoUrl ? <img src={company.logoUrl} alt={`${company.nameEn} logo`} className="logo" /> : null}
          <h1 className="title-en">{company?.nameEn || "Company Name"}</h1>
          {company?.nameAr ? <h2 className="title-ar">{company.nameAr}</h2> : null}
          <div className="muted">{company?.address}</div>
          <div className="muted">
            {company?.phones}{company?.phones && company?.email ? " · " : ""}{company?.email}
          </div>
          {company?.vatNo && <div className="muted">VAT No: {company.vatNo}</div>}
        </div>

        <div className="header-invoice-right">
          <div className="badge">{company?.shipmentType || "SHIPMENT"}</div>
          <div className="subhead">{company?.branchName}</div>
          <div className="sl">SL: <strong>{company?.sl || "-"}</strong></div>
          <div className="invoice-label">
            <div>SIMPLIFIED TAX INVOICE</div>
            <div className="rtl">فاتورة ضريبية مبسطة</div>
          </div>
        </div>
      </header>

      {/* Parties */}
      <section className="parties">
        <div className="card">
          <div className="card-title">SHIPPER</div>
          <BulletList
            lines={[
              `Name: ${shipper?.name || "-"}`,
              shipper?.idNo ? `ID No: ${shipper.idNo}` : "",
              shipper?.tel ? `Tel: ${shipper.tel}` : ""
            ]}
          />
          <div className="grid-3 mt-4 small">
            <div>No. of Pcs: <strong>{summary?.pieces ?? "-"}</strong></div>
            <div>Weight: <strong>{summary?.weight ?? "-"}</strong></div>
            <div>Date: <strong>{summary?.dateTime || "-"}</strong></div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">CONSIGNEE</div>
          <BulletList
            lines={[
              `Name: ${consignee?.name || "-"}`,
              ...(consignee?.addressLines || []),
              [
                consignee?.village ? `Village: ${consignee.village}` : "",
                consignee?.post ? `Post: ${consignee.post}` : "",
                consignee?.dist ? `Dist: ${consignee.dist}` : "",
                consignee?.state ? `State: ${consignee.state}` : ""
              ].filter(Boolean).join(" · "),
              consignee?.tel ? `Tel: ${consignee.tel}` : ""
            ]}
          />
        </div>
      </section>

      {/* Boxes (optional) */}
      {boxes?.length ? (
        <section className="tables two-cols">
          <div className="table">
            <div className="table-title">Boxes</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>S.No</th>
                  <th>Box No.</th>
                  <th style={{ width: "100px" }}>Weight</th>
                </tr>
              </thead>
              <tbody>
                {boxes.map((b, i) => (
                  <tr key={i}>
                    <td>{b.sNo ?? i + 1}</td>
                    <td>{b.boxNo}</td>
                    <td>{b.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Items */}
          <div className="table">
            <div className="table-title">Items</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>S.No</th>
                  <th>Item</th>
                  <th style={{ width: "100px" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.sNo ?? i + 1}</td>
                    <td>{it.name}</td>
                    <td>{it.qty}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="muted center">No items listed</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="table">
          <div className="table-title">Items</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "70px" }}>S.No</th>
                <th>Item</th>
                <th style={{ width: "100px" }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((it, i) => (
                <tr key={i}>
                  <td>{it.sNo ?? i + 1}</td>
                  <td>{it.name}</td>
                  <td>{it.qty}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="muted center">No items listed</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Totals */}
      <section className="totals">
        <div className="totals-grid">
          <div>Total</div>
          <div className="right">{currency(totals?.subtotal, ccy)}</div>
          <div>Bill Charges</div>
          <div className="right">{currency(totals?.billCharges, ccy)}</div>
          <div>VAT %</div>
          <div className="right">{vatPct}%</div>
          <div className="net">Net Total</div>
          <div className="net right">{currency(netTotal, ccy)}</div>
        </div>
      </section>

      {/* Terms & Signatures */}
      <section className="terms">
        <div className="terms-title">Terms & Conditions</div>
        {terms.length ? <ol className="terms-list">{terms.map((t, i) => <li key={i}>{t}</li>)}</ol> : (
          <div className="muted">Accept the goods only after checking them on delivery. No guarantee for glass/breakable items. Company not responsible for local charges. Claims need documentation. Settlement as per company rules. Delays due to customs/natural calamities excluded.</div>
        )}
      </section>

      <footer className="footer">
        <div className="muted">{footerNote}</div>
        <div className="signatures">
          <div>Shipper Signature</div>
          <div>Consignee Signature</div>
          <div>Manager Signature</div>
        </div>
      </footer>
    </div>
  );
}