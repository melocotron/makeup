import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  getAppointmentsSummary,
  getCustomersSummary,
  getLoyaltySummary,
  getRevenueSummary,
  getTopServices,
} from "./queries";
import type { ResolvedRange } from "./validators";

// ============================================================================
// PDF export (server-side, via @react-pdf/renderer)
// ============================================================================

const CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 16,
    borderBottom: "1pt solid #cbd5e1",
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 10,
    color: "#475569",
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    color: "#1e293b",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCard: {
    width: "32%",
    border: "1pt solid #cbd5e1",
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 2,
  },
  table: {
    borderTop: "1pt solid #cbd5e1",
    borderLeft: "1pt solid #cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #cbd5e1",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    fontWeight: 700,
  },
  tableCell: {
    padding: 4,
    borderRight: "1pt solid #cbd5e1",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
  metric: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
});

interface ColumnSpec {
  key: string;
  header: string;
  width: string;
  align?: "left" | "right";
}

function Table({
  columns,
  rows,
}: {
  columns: ColumnSpec[];
  rows: Array<Record<string, string | number>>;
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        {columns.map((c) => (
          <Text
            key={c.key}
            style={[
              styles.tableCell,
              { width: c.width, textAlign: c.align ?? "left" },
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.tableRow}>
          {columns.map((c) => (
            <Text
              key={c.key}
              style={[
                styles.tableCell,
                { width: c.width, textAlign: c.align ?? "left" },
              ]}
            >
              {row[c.key] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export async function buildReportPdf(
  range: ResolvedRange,
  presetLabel: string,
): Promise<Buffer> {
  const [revenue, appointments, customers, loyalty, topServices] =
    await Promise.all([
      getRevenueSummary(range),
      getAppointmentsSummary(range),
      getCustomersSummary(range),
      getLoyaltySummary(range),
      getTopServices(range, 5),
    ]);

  const { renderToBuffer } = await import("@react-pdf/renderer");

  const doc = (
    <Document
      title={`Radiant Beauty — Reportes ${presetLabel}`}
      author="Radiant Beauty"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Radiant Beauty — Reportes</Text>
          <Text style={styles.subtitle}>
            Rango: {range.from.toISOString().slice(0, 10)} →{" "}
            {range.to.toISOString().slice(0, 10)} · Preset: {presetLabel}
          </Text>
        </View>

        {/* KPIs principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen financiero</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ingresos totales</Text>
              <Text style={styles.kpiValue}>
                {CURRENCY.format(revenue.totalRevenue)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ticket promedio</Text>
              <Text style={styles.kpiValue}>
                {CURRENCY.format(revenue.averageTicket)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Descuento cupones</Text>
              <Text style={styles.kpiValue}>
                {CURRENCY.format(revenue.couponDiscount)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Descuento fidelidad</Text>
              <Text style={styles.kpiValue}>
                {CURRENCY.format(revenue.loyaltyDiscount)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Facturas pagadas</Text>
              <Text style={styles.kpiValue}>{revenue.invoiceCount}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Citas totales</Text>
              <Text style={styles.kpiValue}>{appointments.total}</Text>
            </View>
          </View>
        </View>

        {/* Citas y clientes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citas y clientes</Text>
          <Text style={styles.metric}>
            • {appointments.completed} completadas ·{" "}
            {appointments.cancelled} canceladas · {appointments.noShow} no-show
          </Text>
          <Text style={styles.metric}>
            • Tasa de finalización:{" "}
            {Math.round(appointments.completionRate * 100)}%
          </Text>
          <Text style={styles.metric}>
            • Tasa de cancelación:{" "}
            {Math.round(appointments.cancellationRate * 100)}%
          </Text>
          <Text style={styles.metric}>
            • {customers.newCustomers} clientes nuevos ·{" "}
            {customers.returningCustomers} recurrentes
          </Text>
          <Text style={styles.metric}>
            • {loyalty.pointsEarned} puntos generados ·{" "}
            {loyalty.pointsRedeemed} canjeados (
            {CURRENCY.format(loyalty.redemptionValue)})
          </Text>
        </View>

        {/* Top servicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 5 servicios por ingresos</Text>
          {topServices.length === 0 ? (
            <Text style={styles.metric}>
              Sin servicios facturados en el rango.
            </Text>
          ) : (
            <Table
              columns={[
                { key: "name", header: "Servicio", width: "60%" },
                {
                  key: "revenue",
                  header: "Ingresos",
                  width: "25%",
                  align: "right",
                },
                {
                  key: "appointments",
                  header: "Citas",
                  width: "15%",
                  align: "right",
                },
              ]}
              rows={topServices.map((s) => ({
                name: s.serviceName,
                revenue: CURRENCY.format(s.revenue),
                appointments: String(s.appointmentCount),
              }))}
            />
          )}
        </View>

        <Text style={styles.footer} fixed>
          Generado por Radiant Beauty · {new Date().toISOString().slice(0, 10)}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
