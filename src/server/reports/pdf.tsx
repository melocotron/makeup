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
//
// Decisiones de implementación:
// - Todos los valores numéricos en StyleSheet van SIN unidad; @react-pdf
//   los interpreta en puntos (pt). No usamos "1pt solid" shorthand:
//   las propiedades de borde se configuran por separado
//   (borderTopWidth, borderTopColor, borderTopStyle).
// - @react-pdf/renderer no soporta `gap` en flex container, por lo que
//   evitamos flexWrap/gap. En su lugar usamos porcentajes y marginBottom.
// - El import dinámico de renderToBuffer se hace en el route handler,
//   no acá, para mantener este módulo "tree-shake friendly".

const CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: "#0f172a",
  },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#475569",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 6,
    color: "#1e293b",
  },
  // Layout de 6 KPI cards: 2 filas de 3 columnas usando width y marginRight.
  kpiCard: {
    width: "30%",
    padding: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 4,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#64748b",
  },
  kpiValue: {
    fontSize: 14,
    marginTop: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderRightStyle: "solid",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#94a3b8",
  },
  metric: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
});

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

  // Import dinámico: el route handler ya hace esto, pero acá lo
  // hacemos también para que buildReportPdf sea portable.
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

        {/* Resumen financiero: 6 cards en filas de 3 (sin flexWrap/gap) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen financiero</Text>

          <View style={{ flexDirection: "row" }}>
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
          </View>

          <View style={{ flexDirection: "row" }}>
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

        {/* Top 5 servicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 5 servicios por ingresos</Text>
          {topServices.length === 0 ? (
            <Text style={styles.metric}>
              Sin servicios facturados en el rango.
            </Text>
          ) : (
            <View>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { width: "60%" }]}>
                  Servicio
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "25%", textAlign: "right" },
                  ]}
                >
                  Ingresos
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  Citas
                </Text>
              </View>
              {topServices.map((s, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "60%" }]}>
                    {s.serviceName}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "25%", textAlign: "right" },
                    ]}
                  >
                    {CURRENCY.format(s.revenue)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "15%", textAlign: "right" },
                    ]}
                  >
                    {s.appointmentCount}
                  </Text>
                </View>
              ))}
            </View>
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
