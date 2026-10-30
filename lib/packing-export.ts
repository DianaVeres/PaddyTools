import { packingListType } from './packing-references.ts';

export type PackingExportOrder = {
  orderNumber: string;
  customerName: string;
  orderDate: string;
  phone: string;
  box: string;
};

export type PackingExportList = {
  school: string;
  shippingDate: string;
  orders: PackingExportOrder[];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const displayIsoDate = (value: string) =>
  value ? value.split('-').reverse().join('/') : '';

export const packingWorkbookFileName = (list: PackingExportList) =>
  `PackingList-${list.school.replace(/[^a-z0-9]+/gi, '-')}-${list.shippingDate}.xls`;

export function buildPackingWorkbook(list: PackingExportList) {
  if (!list.school.trim() || !list.shippingDate || !list.orders.length)
    throw new Error(
      'El PackingList necesita colegio, fecha y al menos un pedido para generar el documento.',
    );

  const shipping = displayIsoDate(list.shippingDate);
  const rows = list.orders
    .map(
      (order) =>
        `<tr><td>${escapeHtml(order.orderNumber)}</td><td>${escapeHtml(order.customerName)}</td><td>${escapeHtml(packingListType(order.orderNumber))}</td><td>${escapeHtml(displayIsoDate(order.orderDate))}</td><td>${shipping}</td><td></td><td>${escapeHtml(order.phone)}</td><td>${escapeHtml(order.box)}</td></tr>`,
    )
    .join('');
  const visibleRows = Math.max(14, list.orders.length);
  const blanks = Array.from(
    { length: visibleRows - list.orders.length },
    () =>
      '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>',
  ).join('');
  const lastPrintRow = visibleRows + 4;

  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>@page{size:portrait;margin:0.3in}body{font-family:Arial,sans-serif}.title{color:red;font-weight:bold;font-size:16px;height:55px}.label{color:red;font-weight:bold}.meta{height:30px}table{border-collapse:collapse;width:100%;font-size:9px}th{background:#aaa;color:#fff;font-weight:bold;text-align:center;height:32px;border:1px solid #fff}td{height:28px;border:1px solid #fff;padding:3px}tbody tr:nth-child(odd) td{background:#d3d3d3}tbody tr:nth-child(even) td{background:#ececec}</style><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>PackingList</x:Name><x:WorksheetOptions><x:Selected/><x:FitToPage/><x:PrintArea>$A$1:$H$${lastPrintRow}</x:PrintArea></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><tr><td class="title" colspan="8">ALBARAN PEDIDO ON-LINE</td></tr><tr class="meta"><td colspan="2"></td><td class="label">COLEGIO:</td><td colspan="3">${escapeHtml(list.school)}</td><td colspan="2"></td></tr><tr class="meta"><td colspan="2"></td><td class="label">FECHA:</td><td colspan="3">${shipping}</td><td colspan="2"></td></tr><tr><th>Nº PEDIDO</th><th>NOMBRE</th><th>TIPO PEDIDO</th><th>FECHA PEDIDO</th><th>FECHA ENVÍO</th><th>FIRMA</th><th>TELEFONO</th><th>CAJA</th></tr><tbody>${rows}${blanks}</tbody></table></body></html>`;
}
