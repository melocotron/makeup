"""Add admin.reports namespace to es.json and en.json.

Strategy: load the JSON, mutate the dict, write back with explicit
UTF-8 encoding. Avoids the encoding issues that come from PowerShell
pipelines with non-ASCII characters.
"""

import json
import sys
from pathlib import Path

ROOT = Path("messages")

# Namespace to inject. The "reports" key at admin root must be turned
# from a string into an object. The sidebar label lives in admin.nav.reports
# (already present), so this is safe.
REPORTS_ES = {
    "title": "Reportes",
    "subtitle": "Métricas de negocio, gráficos y tablas de detalle.",
    "dateRange": {
        "label": "Rango de fechas",
        "presets": {
            "today": "Hoy",
            "last7": "Últimos 7 días",
            "last30": "Últimos 30 días",
            "last90": "Últimos 90 días",
            "ytd": "Año en curso",
            "custom": "Personalizado",
        },
        "from": "Desde",
        "to": "Hasta",
        "apply": "Aplicar",
        "invalid": "Rango inválido: la fecha de inicio no puede ser posterior a la de fin",
    },
    "kpis": {
        "totalRevenue": "Ingresos totales",
        "totalRevenueHint": "Suma de facturas pagadas en el rango",
        "couponDiscount": "Descuento cupones",
        "loyaltyDiscount": "Descuento fidelidad",
        "averageTicket": "Ticket promedio",
        "netRevenue": "Ingresos netos",
        "appointmentsTotal": "Citas totales",
        "appointmentsCompleted": "Completadas",
        "appointmentsCancelled": "Canceladas",
        "appointmentsNoShow": "No-show",
        "completionRate": "Tasa de finalización",
        "cancellationRate": "Tasa de cancelación",
        "newCustomers": "Clientes nuevos",
        "returningCustomers": "Recurrentes",
        "totalActive": "Clientes activos",
        "pointsEarned": "Puntos generados",
        "pointsRedeemed": "Puntos canjeados",
        "redemptionValue": "Valor canjeado",
        "redemptionCount": "Canjes",
    },
    "charts": {
        "revenueTitle": "Ingresos diarios",
        "revenueEmpty": "Sin ingresos en el rango seleccionado",
        "servicesTitle": "Top 5 servicios por ingresos",
        "servicesEmpty": "Sin servicios facturados en el rango",
        "statusTitle": "Distribución de citas por estado",
        "statusEmpty": "Sin citas en el rango",
    },
    "tables": {
        "topClients": "Top clientes",
        "topClientsSort": {
            "revenue": "Por ingresos",
            "appointments": "Por citas",
            "name": "Por nombre",
        },
        "topServices": "Top servicios",
        "recentAppointments": "Citas recientes",
        "recentAppointmentsStatus": "Estado",
        "recentAppointmentsAll": "Todos",
        "recentInvoices": "Facturas recientes",
        "recentInvoicesStatus": "Estado",
        "recentInvoicesAll": "Todas",
        "couponRedemptions": "Cupones canjeados",
        "couponRedemptionsSort": {
            "amount": "Por monto",
            "usedAt": "Por fecha",
            "code": "Por código",
        },
        "empty": "No hay datos para el rango seleccionado.",
        "pageOf": "Página {page} de {total}",
        "prev": "Anterior",
        "next": "Siguiente",
        "showing": "Mostrando {from}-{to} de {total}",
    },
    "columns": {
        "client": "Cliente",
        "email": "Email",
        "revenue": "Ingresos",
        "appointments": "Citas",
        "invoices": "Facturas",
        "loyaltyPoints": "Puntos",
        "service": "Servicio",
        "scheduledAt": "Fecha",
        "status": "Estado",
        "duration": "Duración",
        "number": "Número",
        "total": "Total",
        "subtotal": "Subtotal",
        "discount": "Descuento",
        "paidAt": "Pagada",
        "createdAt": "Creada",
        "coupon": "Cupón",
        "code": "Código",
        "amount": "Monto",
        "usedAt": "Canjeado",
    },
    "export": {
        "title": "Exportar",
        "csv": "Exportar CSV",
        "pdf": "Exportar PDF",
        "downloading": "Generando archivo…",
        "error": "No se pudo generar el archivo. Inténtalo de nuevo.",
    },
}

REPORTS_EN = {
    "title": "Reports",
    "subtitle": "Business metrics, charts and detail tables.",
    "dateRange": {
        "label": "Date range",
        "presets": {
            "today": "Today",
            "last7": "Last 7 days",
            "last30": "Last 30 days",
            "last90": "Last 90 days",
            "ytd": "Year to date",
            "custom": "Custom",
        },
        "from": "From",
        "to": "To",
        "apply": "Apply",
        "invalid": "Invalid range: start date cannot be after end date",
    },
    "kpis": {
        "totalRevenue": "Total revenue",
        "totalRevenueHint": "Sum of paid invoices in the range",
        "couponDiscount": "Coupon discount",
        "loyaltyDiscount": "Loyalty discount",
        "averageTicket": "Average ticket",
        "netRevenue": "Net revenue",
        "appointmentsTotal": "Total appointments",
        "appointmentsCompleted": "Completed",
        "appointmentsCancelled": "Cancelled",
        "appointmentsNoShow": "No-show",
        "completionRate": "Completion rate",
        "cancellationRate": "Cancellation rate",
        "newCustomers": "New customers",
        "returningCustomers": "Returning",
        "totalActive": "Active customers",
        "pointsEarned": "Points earned",
        "pointsRedeemed": "Points redeemed",
        "redemptionValue": "Redemption value",
        "redemptionCount": "Redemptions",
    },
    "charts": {
        "revenueTitle": "Daily revenue",
        "revenueEmpty": "No revenue in the selected range",
        "servicesTitle": "Top 5 services by revenue",
        "servicesEmpty": "No billed services in the range",
        "statusTitle": "Appointments by status",
        "statusEmpty": "No appointments in the range",
    },
    "tables": {
        "topClients": "Top clients",
        "topClientsSort": {
            "revenue": "By revenue",
            "appointments": "By appointments",
            "name": "By name",
        },
        "topServices": "Top services",
        "recentAppointments": "Recent appointments",
        "recentAppointmentsStatus": "Status",
        "recentAppointmentsAll": "All",
        "recentInvoices": "Recent invoices",
        "recentInvoicesStatus": "Status",
        "recentInvoicesAll": "All",
        "couponRedemptions": "Coupon redemptions",
        "couponRedemptionsSort": {
            "amount": "By amount",
            "usedAt": "By date",
            "code": "By code",
        },
        "empty": "No data for the selected range.",
        "pageOf": "Page {page} of {total}",
        "prev": "Previous",
        "next": "Next",
        "showing": "Showing {from}-{to} of {total}",
    },
    "columns": {
        "client": "Client",
        "email": "Email",
        "revenue": "Revenue",
        "appointments": "Appointments",
        "invoices": "Invoices",
        "loyaltyPoints": "Points",
        "service": "Service",
        "scheduledAt": "Date",
        "status": "Status",
        "duration": "Duration",
        "number": "Number",
        "total": "Total",
        "subtotal": "Subtotal",
        "discount": "Discount",
        "paidAt": "Paid at",
        "createdAt": "Created at",
        "coupon": "Coupon",
        "code": "Code",
        "amount": "Amount",
        "usedAt": "Used at",
    },
    "export": {
        "title": "Export",
        "csv": "Export CSV",
        "pdf": "Export PDF",
        "downloading": "Generating file…",
        "error": "Could not generate the file. Please try again.",
    },
}

DASHBOARD_SUBTITLE_ES = (
    "Resumen de los últimos 30 días. Revisa el estado del negocio de un vistazo."
)
DASHBOARD_SUBTITLE_EN = (
    "Last 30 days summary. Check the state of the business at a glance."
)


def update(path: Path, reports: dict, dashboard_subtitle: str) -> bool:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    admin = data.get("admin")
    if not admin:
        print(f"!! {path}: no admin key")
        return False

    # Replace the bare "reports" string (sidebar label) with the
    # full namespace object. The sidebar label is also at admin.nav.reports,
    # so removing the bare one does not break the sidebar.
    if admin.get("reports") == "Reportes" or admin.get("reports") == "Reports":
        del admin["reports"]

    admin["reports"] = reports

    # Update dashboard subtitle from placeholder to real one.
    if "dashboardSubtitle" in admin:
        admin["dashboardSubtitle"] = dashboard_subtitle

    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"OK {path}: admin.reports keys={list(reports)}")
    return True


def main() -> int:
    ok_es = update(ROOT / "es.json", REPORTS_ES, DASHBOARD_SUBTITLE_ES)
    ok_en = update(ROOT / "en.json", REPORTS_EN, DASHBOARD_SUBTITLE_EN)
    return 0 if ok_es and ok_en else 1


if __name__ == "__main__":
    sys.exit(main())
