import type { FeedbackForm, FormAnswer, FormResponse } from "./data";

/** A response's submit time in ms (0 if the server timestamp hasn't resolved). */
function submittedMs(r: FormResponse): number {
    const ts: any = r.submittedAt;
    return ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day a response belongs to, in the viewer's local time zone: "YYYY-MM-DD". "" if unknown. */
export function dayKey(r: FormResponse): string {
    const ms = submittedMs(r);
    if (!ms) return "";
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function groupByDay(responses: FormResponse[]): Map<string, FormResponse[]> {
    const map = new Map<string, FormResponse[]>();
    for (const r of responses) {
        const key = dayKey(r);
        if (!key) continue;
        map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
}

/** A cell value a person can read in Excel: ratings stay numbers, yes/no become words. */
function cellValue(a?: FormAnswer): string | number {
    const v = a?.value;
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return v;
}

export type ExportDay = { day: string; responses: FormResponse[] };

/**
 * Builds an .xlsx with one sheet per day (oldest first inside each sheet) and downloads it.
 * Columns: Date, Time, Restaurant, then one column per question in the form's current order.
 * Answers to questions that were later edited or removed get their own column, using the
 * question text saved with the response, so nothing is dropped.
 */
export async function downloadFeedbackWorkbook(form: FeedbackForm, days: ExportDay[], fileName: string) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    const allResponses = days.flatMap((d) => d.responses);
    const columns: { id: string; header: string }[] = form.questions.map((q) => ({ id: q.id, header: q.text }));
    for (const r of allResponses) {
        for (const a of r.answers) {
            if (!columns.some((c) => c.id === a.questionId)) columns.push({ id: a.questionId, header: a.questionText });
        }
    }

    for (const { day, responses } of [...days].sort((a, b) => a.day.localeCompare(b.day))) {
        const sheet = workbook.addWorksheet(day);
        sheet.columns = [
            { header: "Date", width: 12 },
            { header: "Time", width: 8 },
            { header: "Restaurant", width: 24 },
            ...columns.map((c) => ({ header: c.header, width: Math.min(Math.max(c.header.length + 2, 14), 42) })),
        ];

        const sorted = [...responses].sort((a, b) => submittedMs(a) - submittedMs(b));
        for (const r of sorted) {
            const d = new Date(submittedMs(r));
            sheet.addRow([
                day,
                `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                r.restaurantName ?? "",
                ...columns.map((c) => cellValue(r.answers.find((a) => a.questionId === c.id))),
            ]);
        }

        const header = sheet.getRow(1);
        header.font = { bold: true };
        header.alignment = { vertical: "middle", wrapText: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        sheet.eachRow((row, i) => {
            if (i > 1) row.alignment = { vertical: "top", wrapText: true };
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** "Customer Feedback" + "2026-11-11" -> "Customer-Feedback_2026-11-11.xlsx" */
export function exportFileName(title: string, suffix: string): string {
    const base = title.trim().replace(/[^\w؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "") || "feedback";
    return `${base}_${suffix}.xlsx`;
}
