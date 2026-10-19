import type { Meal, Profile } from '../lib/nutrition';
import { mealLabels, totals } from '../lib/nutrition';

type ExportProfile = { id: string; profile: Profile };
type ExportMeal = Meal & { profileId: string };

function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function safeName(value: string) { return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80); }
function dateText(value: string) { return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function activeMeals(profile: ExportProfile, meals: ExportMeal[]) { return meals.filter((meal) => meal.profileId === profile.id).sort((a, b) => a.eatenAt.localeCompare(b.eatenAt)); }

export async function exportPdf(profiles: ExportProfile[], meals: ExportMeal[]) {
  const [pdfmakeModule, fontsModule] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  const pdfmake = pdfmakeModule.default;
  const fonts = fontsModule.vfs;
  const content: unknown[] = [
    { text: 'VELLIUM.', style: 'brand' },
    { text: 'Дневник питания', style: 'title' },
    { text: `Выгрузка от ${new Date().toLocaleDateString('ru-RU')} · Профилей: ${profiles.length} · Записей: ${meals.length}`, style: 'lead' },
    { text: 'Показатели являются ориентировочными. Уточняйте состав и порции по этикетке и фактическому весу.', style: 'note' },
  ];
  for (const profile of profiles) {
    const entries = activeMeals(profile, meals);
    const sum = totals(entries);
    content.push({ text: profile.profile.name, style: 'section' });
    content.push({ text: `Записей: ${entries.length}    Всего: ${sum.kcal} ккал · Б ${sum.protein} г · Ж ${sum.fat} г · У ${sum.carbs} г`, style: 'summary' });
    if (!entries.length) { content.push({ text: 'Записей пока нет.', style: 'note' }); continue; }
    content.push({ table: { headerRows: 1, widths: [70, 55, '*', 42, 44, 42, 42, 42], body: [
      ['Дата', 'Приём', 'Продукт / блюдо', 'Г', 'Ккал', 'Б', 'Ж', 'У'],
      ...entries.map((meal) => [dateText(meal.eatenAt), mealLabels[meal.type], meal.name, meal.grams, meal.kcal, meal.protein, meal.fat, meal.carbs]),
    ] }, layout: {
      fillColor: (row: number) => row === 0 ? '#352820' : row % 2 ? '#ffffff' : '#f7f1eb',
      hLineColor: () => '#e6d8c9', vLineColor: () => '#e6d8c9',
    }, fontSize: 8, margin: [0, 8, 0, 20] });
  }
  const documentDefinition = {
    pageSize: 'A4' as const, pageOrientation: 'landscape' as const,
    pageMargins: [36, 42, 36, 42] as [number, number, number, number],
    defaultStyle: { font: 'Roboto', color: '#2b221d', fontSize: 10 },
    styles: {
      brand: { fontSize: 16, bold: true, color: '#9e6843', characterSpacing: 3 },
      title: { fontSize: 26, bold: true, margin: [0, 10, 0, 6] as [number, number, number, number] },
      lead: { fontSize: 10, color: '#6d5949', margin: [0, 0, 0, 8] as [number, number, number, number] },
      note: { fontSize: 9, color: '#765f50', margin: [0, 4, 0, 12] as [number, number, number, number] },
      section: { fontSize: 15, bold: true, color: '#9e6843', margin: [0, 18, 0, 5] as [number, number, number, number] },
      summary: { fontSize: 10, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
    },
    content,
    footer: (page: number, count: number) => ({ text: `VELLIUM · ${page} / ${count}`, alignment: 'right' as const, color: '#8f7968', fontSize: 8, margin: [0, 0, 36, 0] as [number, number, number, number] }),
  };
  const pdf = pdfmake.createPdf(documentDefinition as Parameters<typeof pdfmake.createPdf>[0], undefined, undefined, fonts);
  pdf.download(`vellium-diary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportExcel(profiles: ExportProfile[], meals: ExportMeal[]) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VELLIUM';
  const overview = workbook.addWorksheet('Сводка');
  overview.columns = [{ header: 'Профиль', key: 'name', width: 28 }, { header: 'Записей', key: 'count', width: 13 }, { header: 'Ккал', key: 'kcal', width: 13 }, { header: 'Белки, г', key: 'protein', width: 15 }, { header: 'Жиры, г', key: 'fat', width: 15 }, { header: 'Углеводы, г', key: 'carbs', width: 18 }];
  profiles.forEach((item) => { const entries = activeMeals(item, meals); overview.addRow({ name: item.profile.name, count: entries.length, ...totals(entries) }); });
  const detail = workbook.addWorksheet('Записи');
  detail.columns = [
    { header: 'Профиль', key: 'profile', width: 24 }, { header: 'Дата и время', key: 'date', width: 22 },
    { header: 'Приём пищи', key: 'type', width: 17 }, { header: 'Блюдо / продукт', key: 'name', width: 44 },
    { header: 'Порция, г', key: 'grams', width: 15 }, { header: 'Ккал', key: 'kcal', width: 13 },
    { header: 'Белки, г', key: 'protein', width: 15 }, { header: 'Жиры, г', key: 'fat', width: 15 },
    { header: 'Углеводы, г', key: 'carbs', width: 18 },
  ];
  profiles.forEach((profile) => activeMeals(profile, meals).forEach((meal) => detail.addRow({ profile: profile.profile.name, date: dateText(meal.eatenAt), type: mealLabels[meal.type], name: meal.name, grams: meal.grams, kcal: meal.kcal, protein: meal.protein, fat: meal.fat, carbs: meal.carbs })));
  for (const sheet of [overview, detail]) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + sheet.columnCount)}${Math.max(1, sheet.rowCount)}` };
    sheet.getRow(1).height = 30;
    sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFF6E9DA' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B211B' } }; cell.alignment = { vertical: 'middle' }; });
    sheet.eachRow((row, index) => { if (index === 1) return; row.height = 24; row.eachCell((cell) => { cell.alignment = { vertical: 'middle', wrapText: true }; if (index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F1EB' } }; }); });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `vellium-diary-${safeName(new Date().toISOString().slice(0, 10))}.xlsx`);
}
