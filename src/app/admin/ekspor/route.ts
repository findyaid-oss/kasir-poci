import ExcelJS from "exceljs";
import { db } from "@/db";
import { getUser, isAdminUnlocked } from "@/lib/auth/session";
import { formatDateTime, isIsoDate, shiftDate, todayInBali } from "@/lib/time";
import { dailyTotals, exportCashRows, exportRows } from "@/services/reports";

/** Unduh rekap penjualan sebagai file Excel: sheet "Per hari" dan sheet "Detail". */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user || user.role !== "owner") return new Response("Hanya pemilik yang bisa mengekspor.", { status: 403 });
  if (!(await isAdminUnlocked(user.userId))) return Response.redirect(new URL("/kunci-admin", request.url), 303);

  const url = new URL(request.url);
  const to = isIsoDate(url.searchParams.get("sampai")) ? url.searchParams.get("sampai")! : todayInBali();
  const fromRaw = url.searchParams.get("dari");
  const from = isIsoDate(fromRaw) && fromRaw <= to ? fromRaw : shiftDate(to, -29);

  const [days, rows, cashRows] = await Promise.all([dailyTotals(db, from, to), exportRows(db, from, to), exportCashRows(db, from, to)]);

  const wb = new ExcelJS.Workbook();
  const rp = '"Rp"#,##0';

  const perDay = wb.addWorksheet("Per hari");
  perDay.columns = [
    { header: "Tanggal", key: "date", width: 12 },
    { header: "Transaksi", key: "transactions", width: 10 },
    { header: "Cup", key: "cups", width: 8 },
    { header: "Porsi", key: "porsi", width: 8 },
    { header: "Omzet", key: "omzet", width: 14, style: { numFmt: rp } },
    { header: "Tunai", key: "tunai", width: 14, style: { numFmt: rp } },
    { header: "QRIS", key: "qris", width: 14, style: { numFmt: rp } },
    { header: "HPP", key: "hpp", width: 14, style: { numFmt: rp } },
    { header: "Laba kotor", key: "labaKotor", width: 14, style: { numFmt: rp } },
  ];
  perDay.addRows([...days].reverse());
  perDay.getRow(1).font = { bold: true };

  const detail = wb.addWorksheet("Detail");
  detail.columns = [
    { header: "No. transaksi", key: "saleId", width: 12 },
    { header: "Waktu", key: "time", width: 16 },
    { header: "Kasir", key: "cashier", width: 14 },
    { header: "Bayar", key: "payment", width: 8 },
    { header: "Status", key: "status", width: 8 },
    { header: "Menu", key: "name", width: 28 },
    { header: "Kategori", key: "category", width: 12 },
    { header: "Jumlah", key: "qty", width: 8 },
    { header: "Harga", key: "unitPrice", width: 12, style: { numFmt: rp } },
    { header: "Subtotal", key: "subtotal", width: 12, style: { numFmt: rp } },
    { header: "HPP", key: "hpp", width: 12, style: { numFmt: rp } },
    { header: "Laba kotor", key: "laba", width: 12, style: { numFmt: rp } },
  ];
  detail.addRows(
    rows.map((r) => ({
      saleId: r.saleId,
      time: formatDateTime(r.createdAt),
      cashier: r.cashier,
      payment: r.payment === "tunai" ? "Tunai" : "QRIS",
      status: r.status === "lunas" ? "Lunas" : "Batal",
      name: r.parentId ? `  + ${r.name}` : r.name,
      category: r.category,
      qty: r.qty,
      unitPrice: r.unitPrice,
      subtotal: r.qty * r.unitPrice,
      hpp: r.qty * r.unitHpp,
      laba: r.qty * (r.unitPrice - r.unitHpp),
    })),
  );
  detail.getRow(1).font = { bold: true };

  const kas = wb.addWorksheet("Kas masuk-keluar");
  kas.columns = [
    { header: "Tanggal", key: "date", width: 12 },
    { header: "Waktu", key: "time", width: 16 },
    { header: "Oleh", key: "by", width: 14 },
    { header: "Jenis", key: "type", width: 10 },
    { header: "Jumlah", key: "amount", width: 14, style: { numFmt: rp } },
    { header: "Keterangan", key: "note", width: 36 },
  ];
  kas.addRows(
    cashRows.map((c) => ({
      date: c.businessDate,
      time: formatDateTime(c.createdAt),
      by: c.by,
      type: c.type === "masuk" ? "Masuk" : "Keluar",
      amount: c.type === "masuk" ? c.amount : -c.amount,
      note: c.note,
    })),
  );
  kas.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="penjualan-${from}-sd-${to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
