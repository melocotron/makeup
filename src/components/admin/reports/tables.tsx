import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CouponRedemptionRow,
  PaginatedResult,
  RecentAppointmentRow,
  RecentInvoiceRow,
  TopClientRow,
  TopServiceRow,
} from "@/server/reports/queries";

import { Pagination } from "./pagination";

// ============================================================================
// Helpers
// ============================================================================

const CURRENCY_FMT = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const COMPACT_CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function money(value: number): string {
  return CURRENCY_FMT.format(value);
}

function shortDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

function dateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

// ============================================================================
// Top clients
// ============================================================================

export function TopClientsTable({
  data,
  sortKey,
  labels,
}: {
  data: PaginatedResult<TopClientRow>;
  sortKey: "revenue" | "appointments" | "name";
  labels: {
    title: string;
    empty: string;
    showing: (from: number, to: number, total: number) => string;
    pageOf: (page: number, total: number) => string;
    prev: string;
    next: string;
    client: string;
    email: string;
    revenue: string;
    appointments: string;
    invoices: string;
    points: string;
  };
}) {
  const { items, total, page, totalPages } = data;
  const from = total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const to = Math.min(page * data.pageSize, total);

  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h3 className="text-sm font-semibold text-on-surface">
          {labels.title}
        </h3>
        <span className="text-xs text-on-surface-variant">
          {labels.showing(from, to, total)}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.client}</TableHead>
              <TableHead>{labels.email}</TableHead>
              <TableHead className="text-right">{labels.revenue}</TableHead>
              <TableHead className="text-right">{labels.appointments}</TableHead>
              <TableHead className="text-right">{labels.invoices}</TableHead>
              <TableHead className="text-right">{labels.points}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.clientId}>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell className="text-on-surface-variant">
                  {row.clientEmail}
                </TableCell>
                <TableCell className="text-right">{money(row.revenue)}</TableCell>
                <TableCell className="text-right">{row.appointmentCount}</TableCell>
                <TableCell className="text-right">{row.invoiceCount}</TableCell>
                <TableCell className="text-right">{row.loyaltyPoints}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageOfLabel={labels.pageOf(page, totalPages)}
          prevLabel={labels.prev}
          nextLabel={labels.next}
          sortKey={sortKey}
        />
      )}
    </section>
  );
}

// ============================================================================
// Top services
// ============================================================================

export function TopServicesTable({
  data,
  labels,
}: {
  data: TopServiceRow[];
  labels: {
    title: string;
    empty: string;
    service: string;
    revenue: string;
    appointments: string;
    invoices: string;
  };
}) {
  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h3 className="text-sm font-semibold text-on-surface">{labels.title}</h3>
      </header>
      {data.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.service}</TableHead>
              <TableHead className="text-right">{labels.revenue}</TableHead>
              <TableHead className="text-right">{labels.invoices}</TableHead>
              <TableHead className="text-right">{labels.appointments}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.serviceId}>
                <TableCell className="font-medium">{row.serviceName}</TableCell>
                <TableCell className="text-right">{money(row.revenue)}</TableCell>
                <TableCell className="text-right">{row.invoiceCount}</TableCell>
                <TableCell className="text-right">{row.appointmentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

// ============================================================================
// Recent appointments
// ============================================================================

export function RecentAppointmentsTable({
  data,
  statusFilter,
  labels,
}: {
  data: PaginatedResult<RecentAppointmentRow>;
  statusFilter?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  labels: {
    title: string;
    empty: string;
    showing: (from: number, to: number, total: number) => string;
    pageOf: (page: number, total: number) => string;
    prev: string;
    next: string;
    scheduledAt: string;
    client: string;
    service: string;
    status: string;
    duration: string;
  };
}) {
  const { items, total, page, totalPages } = data;
  const from = total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const to = Math.min(page * data.pageSize, total);

  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h3 className="text-sm font-semibold text-on-surface">{labels.title}</h3>
        <span className="text-xs text-on-surface-variant">
          {labels.showing(from, to, total)}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.scheduledAt}</TableHead>
              <TableHead>{labels.client}</TableHead>
              <TableHead>{labels.service}</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead className="text-right">{labels.duration}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{dateTime(row.scheduledAt)}</TableCell>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell className="text-on-surface-variant">
                  {row.serviceName}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">{row.durationMin} min</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageOfLabel={labels.pageOf(page, totalPages)}
          prevLabel={labels.prev}
          nextLabel={labels.next}
          sortKey={statusFilter ?? "all"}
        />
      )}
    </section>
  );
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  NO_SHOW: "bg-slate-100 text-slate-800",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

function StatusBadge({
  status,
}: {
  status: keyof typeof STATUS_BADGE;
}) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${
        STATUS_BADGE[status] ?? "bg-slate-100 text-slate-800"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ============================================================================
// Recent invoices
// ============================================================================

export function RecentInvoicesTable({
  data,
  statusFilter,
  labels,
}: {
  data: PaginatedResult<RecentInvoiceRow>;
  statusFilter?: "PENDING" | "PAID" | "CANCELLED";
  labels: {
    title: string;
    empty: string;
    showing: (from: number, to: number, total: number) => string;
    pageOf: (page: number, total: number) => string;
    prev: string;
    next: string;
    number: string;
    client: string;
    service: string;
    total: string;
    status: string;
    createdAt: string;
  };
}) {
  const { items, total, page, totalPages } = data;
  const from = total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const to = Math.min(page * data.pageSize, total);

  const INVOICE_STATUS: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    PAID: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-rose-100 text-rose-800",
  };
  const INVOICE_STATUS_LABEL: Record<string, string> = {
    PENDING: "Pendiente",
    PAID: "Pagada",
    CANCELLED: "Cancelada",
  };

  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h3 className="text-sm font-semibold text-on-surface">{labels.title}</h3>
        <span className="text-xs text-on-surface-variant">
          {labels.showing(from, to, total)}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.number}</TableHead>
              <TableHead>{labels.client}</TableHead>
              <TableHead>{labels.service}</TableHead>
              <TableHead className="text-right">{labels.total}</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead>{labels.createdAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.number}</TableCell>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell className="text-on-surface-variant">
                  {row.serviceSummary}
                </TableCell>
                <TableCell className="text-right">{money(row.total)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                      INVOICE_STATUS[row.status] ?? "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {INVOICE_STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </TableCell>
                <TableCell>{shortDate(row.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageOfLabel={labels.pageOf(page, totalPages)}
          prevLabel={labels.prev}
          nextLabel={labels.next}
          sortKey={statusFilter ?? "all"}
        />
      )}
    </section>
  );
}

// ============================================================================
// Coupon redemptions
// ============================================================================

export function CouponRedemptionsTable({
  data,
  sortKey,
  labels,
}: {
  data: PaginatedResult<CouponRedemptionRow>;
  sortKey: "amount" | "usedAt" | "code";
  labels: {
    title: string;
    empty: string;
    showing: (from: number, to: number, total: number) => string;
    pageOf: (page: number, total: number) => string;
    prev: string;
    next: string;
    code: string;
    client: string;
    invoice: string;
    amount: string;
    usedAt: string;
  };
}) {
  const { items, total, page, totalPages } = data;
  const from = total === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const to = Math.min(page * data.pageSize, total);

  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h3 className="text-sm font-semibold text-on-surface">{labels.title}</h3>
        <span className="text-xs text-on-surface-variant">
          {labels.showing(from, to, total)}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-on-surface-variant">{labels.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.code}</TableHead>
              <TableHead>{labels.client}</TableHead>
              <TableHead className="font-mono text-xs">{labels.invoice}</TableHead>
              <TableHead className="text-right">{labels.amount}</TableHead>
              <TableHead>{labels.usedAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.couponCode}</TableCell>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell className="font-mono text-xs text-on-surface-variant">
                  {row.invoiceNumber}
                </TableCell>
                <TableCell className="text-right">{money(row.amount)}</TableCell>
                <TableCell>{dateTime(row.usedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageOfLabel={labels.pageOf(page, totalPages)}
          prevLabel={labels.prev}
          nextLabel={labels.next}
          sortKey={sortKey}
        />
      )}
    </section>
  );
}

// ============================================================================
// Export util
// ============================================================================

export { CURRENCY_FMT, COMPACT_CURRENCY, shortDate, dateTime };
