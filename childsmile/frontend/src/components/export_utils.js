/* export_utils.js */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify'; // Import toast for notifications
import '../styles/common.css'; // Import custom styles for toast notifications
/* import toast utils */
import { showErrorToast } from './toastUtils'; // Import the error toast utility function
import logo from '../assets/logo.png'; // Import the logo image
// import C:\Dev\FinalProjectOpenU\childsmile\frontend\src\fonts\Alef-Bold.js
import { AlefBold } from '../fonts/Alef-Bold'; // Import the custom font for PDF generation
import { Cell } from 'jspdf-autotable';
import html2canvas from "html2canvas";


/**
 * Exports a chart (by ref) to PDF, with a custom legend below.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {object} stats - { with_tutorship, waiting }
 * @param {function} t - translation function
 */
export const exportFamiliesTutorshipChartToPDF = async (chartRef, stats, t) => {
  if (!chartRef.current) return;

  const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width + 250, canvas.height + 180] // extra width for legend, height for tooltips
  });

  // Register font
  pdf.addFileToVFS('Alef-Bold.ttf', AlefBold);
  pdf.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  pdf.setFont('Alef', 'bold');

  // Add logo
  pdf.addImage(logo, 'PNG', 20, 5, 80, 60);

  // Title
  const title = reverseText(t("Distribution of Families (Tutorship vs Waiting) Report"));
  const isHebrew = /[\u0590-\u05FF]/.test(title);
  pdf.setFontSize(24);
  pdf.setTextColor(0, 0, 0);
  if (isHebrew) {
    pdf.text(title, canvas.width - 40, 30, { align: "right" });
  } else {
    pdf.text(title, 100, 30);
  }

  // Chart image
  const scale = 0.7;
  const chartWidth = canvas.width * scale;
  const chartHeight = canvas.height * scale;
  const chartX = 0;
  const chartY = 60;

  pdf.addImage(imgData, "PNG", chartX, chartY, chartWidth, chartHeight);

  // Legend on the right
  const total = parseInt(stats.with_tutorship) + parseInt(stats.waiting);
  const legendItems = [
    {
      color: "#2196f3",
      label: "",
      value: reverseText(total.toString()) + reverseText(t("Total Number of Families: ")),
      percent: ""
    },
    {
      color: "#4caf50",
      label: reverseText(t("With Tutorship")),
      value: reverseText(stats.with_tutorship.toString()) + reverseText(t("total: ")),
      percent: "%" + reverseText(((stats.with_tutorship / total) * 100).toFixed(1)) + reverseText(t("Percentage out of total families: "))
    },
    {
      color: "#f44336",
      label: reverseText(t("Waiting")),
      value: reverseText(stats.waiting.toString()) + reverseText(t("total: ")),
      percent: "%" + reverseText(((stats.waiting / total) * 100).toFixed(1)) + reverseText(t("Percentage out of total families: "))
    }
  ];


  const legendX = canvas.width - 5;
  // have a legendX lefter for percent
  let legendY = 80;
  pdf.setFontSize(24);

  legendItems.forEach((item, idx) => {
    const [r, g, b] = hexToRgb(item.color);
    pdf.setTextColor(r, g, b);

    // Print label
    pdf.text(item.label, legendX, legendY);
    legendY += 20;

    // Print value
    if (item.value) {
      pdf.text(item.value, legendX, legendY);
      legendY += 40;
    }

    // Print percent (if exists)
    if (item.percent) {
      legendY -= 20; // remove 20 from Y before
      pdf.text(item.percent, legendX, legendY);
      legendY += 40; // extra space after each item
      // move a bit left
    }
  });

  // Tooltips (if provided)
  if (stats.tooltips && stats.tooltips.length > 0) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(24);
    const tooltipTitle = isHebrew ? reverseText(t("Tooltip Details")) : t("Tooltip Details");
    pdf.text(tooltipTitle, 40, canvas.height + 80);

    pdf.setFontSize(12);
    stats.tooltips.forEach((tip, i) => {
      const text = isHebrew ? reverseText(tip) : tip;
      pdf.text(text, 40, canvas.height + 100 + i * 20);
    });
  }

  pdf.save(t("families_tutorship_stats_chart.pdf"));
};

/**
 * Exports the pending tutors chart to PDF, with a custom legend.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {object} stats - { pending_tutors, total_tutors }
 * @param {function} t - translation function
 */
export const exportPendingTutorsChartToPDF = async (chartRef, stats, t) => {
  if (!chartRef.current) return;

  const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width + 250, canvas.height + 180]
  });

  // Register font
  pdf.addFileToVFS('Alef-Bold.ttf', AlefBold);
  pdf.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  pdf.setFont('Alef', 'bold');

  // Add logo
  pdf.addImage(logo, 'PNG', 20, 5, 80, 60);

  // Title
  const title = reverseText(t("Pending Tutors vs All Tutors Report"));
  const isHebrew = /[\u0590-\u05FF]/.test(title);
  pdf.setFontSize(24);
  pdf.setTextColor(0, 0, 0);
  if (isHebrew) {
    pdf.text(title, canvas.width - 40, 30, { align: "right" });
  } else {
    pdf.text(title, 100, 30);
  }

  // Chart image
  const scale = 0.7;
  const chartWidth = canvas.width * scale;
  const chartHeight = canvas.height * scale;
  const chartX = 0;
  const chartY = 60;

  pdf.addImage(imgData, "PNG", chartX, chartY, chartWidth, chartHeight);

  const total = parseInt(stats.pending_tutors) + parseInt(stats.total_tutors);
  console.log("Total: ", total);
  console.log("Pending Tutors: ", stats.pending_tutors);
  console.log("Active Tutors: ", stats.total_tutors);

  // Legend on the right
  const legendItems = [
    {
      color: "#2196f3",
      label: "",
      value: reverseText(total.toString()) + reverseText(t("Total Number of Tutors: ")),
      percent: ""
    },
    {
      color: "#f44336",
      label: reverseText(t("Pending Tutors")),
      value: reverseText(stats.pending_tutors.toString()) + reverseText(t("total: ")),
      percent: "%" + reverseText(((stats.pending_tutors / total) * 100).toFixed(1)) + reverseText(t(" Percentage of all tutors: "))
    },
    {
      color: "#4caf50",
      label: reverseText(t("Active Tutors")),
      value: reverseText((stats.total_tutors).toString()) + reverseText(t("total: ")),
      percent: "%" + reverseText(((stats.total_tutors / total) * 100).toFixed(1)) + reverseText(t(" Percentage of all tutors: "))
    }
  ];

  const legendX = canvas.width - 5;
  let legendY = 80;
  pdf.setFontSize(24);

  legendItems.forEach((item) => {
    const [r, g, b] = hexToRgb(item.color);
    pdf.setTextColor(r, g, b);
    pdf.text(item.label, legendX, legendY);
    legendY += 20;
    pdf.text(item.value, legendX, legendY);
    legendY += 20;
    pdf.text(item.percent, legendX, legendY);
    legendY += 40;
  });

  pdf.save(t("pending_tutors_stats_chart.pdf"));
};

/**
 * Exports the roles spread chart to PDF, with a custom legend.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {array} roles - [{name, count}]
 * @param {function} t - translation function
 */
export const exportRolesSpreadChartToPDF = async (chartRef, roles, t) => {
  if (!chartRef.current) return;

  const chartColors = [
    "#1f77b4", // Blue
    "#ff7f0e", // Orange
    "#2ca02c", // Green
    "#d62728", // Red
    "#9467bd", // Purple
    "#8c564b", // Brown
    "#e377c2", // Pink
    "#7f7f7f", // Gray
    "#bcbd22", // Olive
    "#17becf"  // Teal
  ];

  const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width + 250, canvas.height + 180]
  });

  pdf.addFileToVFS('Alef-Bold.ttf', AlefBold);
  pdf.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  pdf.setFont('Alef', 'bold');
  pdf.addImage(logo, 'PNG', 20, 5, 80, 60);

  const title = reverseText(t("Roles Spread Report"));
  const isHebrew = /[\u0590-\u05FF]/.test(title);
  pdf.setFontSize(32);
  pdf.setTextColor(0, 0, 0);
  if (isHebrew) {
    pdf.text(title, canvas.width - 40, 30, { align: "right" });
  } else {
    pdf.text(title, 100, 30);
  }

  const scale = 0.7;
  const chartWidth = canvas.width * scale;
  const chartHeight = canvas.height * scale;
  const chartX = 0;
  const chartY = 60;

  pdf.addImage(imgData, "PNG", chartX, chartY, chartWidth, chartHeight);

  let legendX = canvas.width + 40;
  let legendY = 80;
  pdf.setFontSize(24);

  roles.forEach((role, idx) => {
    const [r, g, b] = hexToRgb(chartColors[idx % chartColors.length]);
    pdf.setTextColor(r, g, b);
    const label = isHebrew ? reverseText(t(role.name)) : t(role.name);
    const value = reverseText(role.count.toString())
    pdf.text(`${value}: ${label}`, legendX, legendY);
    legendY += 30;
  });

  pdf.save(t("roles_spread_stats_chart.pdf"));
};
// Helper: convert hex color to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// Helper function to reverse text for proper RTL rendering
const reverseText = (text) => {
  return text.split('').reverse().join('');
};

const formatHebrewTextForPDF = (text, wordsPerLine = 5) => {
  if (!text) return "";

  const words = text.split(' ').map(word =>
    word.split('').reverse().join('')
  );

  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    // הפוך את סדר המילים בתוך כל שורה
    const lineWords = words.slice(i, i + wordsPerLine).reverse();
    lines.push(lineWords.join(' '));
  }

  return lines.join('\n');
};

const formatHebrewTextForPDFtutor = (text, wordsPerLine = 5) => {
  if (!text) return "";

  const words = text.split(' ');

  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    // Split the words into lines but no need to reverse them
    const lineWords = words.slice(i, i + wordsPerLine);
    lines.push(lineWords.join(' '));
  }

  return lines.join('\n');
};


export const exportToExcel = (tutors, t) => {
  const selectedTutors = tutors.filter(tutor => tutor.selected);
  if (selectedTutors.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = ['שם חונך', 'שם חניך', 'תאריך התאמת חונכות'];
  const rows = selectedTutors.map(tutor => [
    `${tutor.tutor_firstname} ${tutor.tutor_lastname}`,
    `${tutor.child_firstname} ${tutor.child_lastname}`,
    tutor.created_date,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Adjust column widths to fit content
  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet['!cols'] = columnWidths;

  // Set worksheet direction to RTL
  worksheet['!dir'] = 'rtl';

  const workbook = XLSX.utils.book_new();
  const sheetName = 'דוח חונכויות פעילות'; // Hebrew sheet name
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = t('active_tutors_report'); // Use translation for file name
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  toast.success(t('Report generated successfully')); // Show success toast
};

export const exportToPDF = (tutors, t) => {
  const selectedTutors = tutors.filter(tutor => tutor.selected);
  if (selectedTutors.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Register the Alef-Bold font
  doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
  doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  doc.setFont('Alef', 'bold'); // Set the custom font

  // Add logo
  doc.addImage(logo, 'PNG', 10, 10, 30, 30);

  // Add report title (no reverseText here)
  doc.setFontSize(18);
  doc.text(reverseText(t('Active Tutors Report')), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Prepare table data
  const headers = [[
    reverseText(t('Tutor Name')),
    reverseText(t('Child Name')),
    reverseText(t('Tutorship Matching Date')) // No reverseText for the date header
  ].reverse()]; // Reverse the order of headers for RTL
  const rows = selectedTutors.map(tutor => [
    reverseText(`${tutor.tutor_firstname} ${tutor.tutor_lastname}`), // Reverse names
    reverseText(`${tutor.child_firstname} ${tutor.child_lastname}`), // Reverse names
    tutor.created_date // Keep the date as is
  ]).map(row => row.reverse()); // <-- הפיכת כל שורה


  // Add table with RTL support
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 50, // Position below the title
    styles: { font: 'Alef', fontSize: 10, cellPadding: 3, halign: 'right' }, // Align text to the right
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: 'right' }, // Align headers to the right
    columnStyles: {
      0: { halign: 'right' }, // Align first column to the right
      1: { halign: 'right' }, // Align second column to the right
      2: { halign: 'right' }, // Align third column to the right
    },
  });

  // Save the PDF
  doc.save(`${t('active_tutors_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
};



export const exportFamiliesToExcel = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = ['שם ילד', 'עיר', 'תאריך רישום'];
  const rows = selectedFamilies.map(family => [
    `${family.first_name} ${family.last_name}`,
    family.city,
    family.registration_date,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Adjust column widths to fit content
  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet['!cols'] = columnWidths;

  // Set worksheet direction to RTL
  worksheet['!dir'] = 'rtl';

  const workbook = XLSX.utils.book_new();
  const sheetName = 'דוח משפחות לפי מיקום'; // Hebrew sheet name
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = t('families_per_location_report'); // Use translation for file name
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  toast.success(t('Report generated successfully')); // Show success toast
};

export const exportFamiliesToPDF = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Register the Alef-Bold font
  doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
  doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  doc.setFont('Alef', 'bold'); // Set the custom font

  // Add logo
  doc.addImage(logo, 'PNG', 10, 10, 30, 30);

  // Add report title
  doc.setFontSize(18);
  doc.text(reverseText(t('Families Per Location Report')), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Prepare table data
  const headers = [[
    reverseText(t('Child Name')),
    reverseText(t('City')),
    reverseText(t('Registration Date')),
  ].reverse()]; // Reverse the order of headers for RTL
  const rows = selectedFamilies.map(family => [
    reverseText(`${family.first_name} ${family.last_name}`), // Reverse names
    reverseText(family.city), // Reverse city name
    family.registration_date, // Keep the date as is
  ]).map(row => row.reverse()); // <-- הפיכת כל שורה


  // Add table with RTL support
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 50, // Position below the title
    styles: { font: 'Alef', fontSize: 10, cellPadding: 3, halign: 'right' }, // Align text to the right
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: 'right' }, // Align headers to the right
    columnStyles: {
      0: { halign: 'right' }, // Align first column to the right
      1: { halign: 'right' }, // Align second column to the right
      2: { halign: 'right' }, // Align third column to the right
    },
  });

  // Save the PDF
  doc.save(`${t('families_per_location_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
};

export const exportTutorshipPendingToExcel = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = [
    t('Child Name'),
    t('Father Name'),
    t('Father Phone'),
    t('Mother Name'),
    t('Mother Phone'),
    t('Tutoring Status'),
    t('Registration Date'),
  ];
  const rows = selectedFamilies.map(family => [
    `${family.first_name} ${family.last_name}`,
    family.father_name,
    family.father_phone,
    family.mother_name,
    family.mother_phone,
    family.tutoring_status,
    family.registration_date,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Adjust column widths to fit content
  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet['!cols'] = columnWidths;

  // Set worksheet direction to RTL
  worksheet['!dir'] = 'rtl';

  const workbook = XLSX.utils.book_new();
  const sheetName = t('Families Waiting for Tutorship Report'); // Sheet name
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = t('families_waiting_for_tutorship_report'); // File name
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  toast.success(t('Report generated successfully')); // Show success toast
};

export const exportTutorshipPendingToPDF = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF('portrait', 'mm', 'a3');

  // Register the Alef-Bold font
  doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
  doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  doc.setFont('Alef', 'bold'); // Set the custom font

  // Add logo
  doc.addImage(logo, 'PNG', 10, 10, 30, 30);

  // Add report title
  doc.setFontSize(18);
  doc.text(reverseText(t('Families Waiting for Tutorship Report')), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Prepare table data
  const headers = [[
    reverseText(t('Child Name')),
    reverseText(t('Father Name')),
    reverseText(t('Father Phone')),
    reverseText(t('Mother Name')),
    reverseText(t('Mother Phone')),
    reverseText(t('Tutoring Status')),
    reverseText(t('Registration Date')),
  ].reverse()]; // Reverse the order of headers for RTL
  const rows = selectedFamilies.map(family => [
    reverseText(`${family.first_name}`) + ' ' + reverseText(`${family.last_name}`), // Reverse names
    reverseText(family.father_name), // Reverse father's name
    family.father_phone, // Reverse father's phone
    reverseText(family.mother_name), // Reverse mother's name
    family.mother_phone, // Reverse mother's phone
    reverseText(family.tutoring_status), // Reverse tutoring status
    family.registration_date, // Keep the date as is
  ]).map(row => row.reverse()); // <-- הפיכת כל שורה


  // Add table with RTL support
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 50, // Position below the title
    styles: { font: 'Alef', fontSize: 10, cellPadding: 3, halign: 'right' }, // Align text to the right
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: 'right' }, // Align headers to the right
    columnStyles: {
      0: { halign: 'right', cellWidth: 30 }, // Align first column to the right
      1: { halign: 'right', cellWidth: 60 }, // Align second column to the right
      2: { halign: 'right', cellWidth: 40 }, // Align third column to the right
      3: { halign: 'right', cellWidth: 30 }, // Align fourth column to the right
      4: { halign: 'right', cellWidth: 40 }, // Align fifth column to the right
      5: { halign: 'right', cellWidth: 30 }, // Align sixth column to the right
      6: { halign: 'right', cellWidth: 30 }, // Align seventh column to the right
    },
  });

  // Save the PDF
  doc.save(`${t('families_waiting_for_tutorship_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
};

export const exportNewFamiliesToExcel = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = ['שם ילד', 'שם אב', 'טלפון אב', 'שם אם', 'טלפון אם', 'תאריך רישום'];
  const rows = selectedFamilies.map(family => [
    `${family.child_firstname} ${family.child_lastname}`,
    family.father_name,
    family.father_phone,
    family.mother_name,
    family.mother_phone,
    family.registration_date,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Adjust column widths to fit content
  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet['!cols'] = columnWidths;

  // Set worksheet direction to RTL
  worksheet['!dir'] = 'rtl';

  const workbook = XLSX.utils.book_new();
  const sheetName = t('New Families Report'); // Sheet name
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = t('new_families_report'); // File name
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  toast.success(t('Report generated successfully')); // Show success toast
}

export const exportNewFamiliesToPDF = (families, t) => {
  const selectedFamilies = families.filter(family => family.selected);
  if (selectedFamilies.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Register the Alef-Bold font
  doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
  doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  doc.setFont('Alef', 'bold'); // Set the custom font

  // Add logo
  doc.addImage(logo, 'PNG', 10, 10, 30, 30);

  // Add report title
  doc.setFontSize(18);
  doc.text(reverseText(t('New Families Report')), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Prepare table data
  const headers = [[
    reverseText(t('Child Name')),
    reverseText(t('Father Name')),
    reverseText(t('Father Phone')),
    reverseText(t('Mother Name')),
    reverseText(t('Mother Phone')),
    reverseText(t('Registration Date')),
  ]];
  const rows = selectedFamilies.map(family => [
    reverseText(`${family.child_firstname} ${family.child_lastname}`), // Reverse names
    reverseText(family.father_name), // Reverse father's name
    family.father_phone, // Reverse father's phone
    reverseText(family.mother_name), // Reverse mother's name
    family.mother_phone, // Reverse mother's phone
    family.registration_date, // Keep the date as is
  ]);
  // Add table with RTL support
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 50, // Position below the title
    styles: { font: 'Alef', fontSize: 10, cellPadding: 3, halign: 'right' }, // Align text to the right
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: 'right' }, // Align headers to the right
    columnStyles: {
      0: { halign: 'right' }, // Align first column to the right
      1: { halign: 'right' }, // Align second column to the right
      2: { halign: 'right' }, // Align third column to the right
      3: { halign: 'right' }, // Align fourth column to the right
      4: { halign: 'right' }, // Align fifth column to the right
      5: { halign: 'right' }, // Align sixth column to the right
    },
  });
  // Save the PDF
  doc.save(`${t('new_families_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
}

// Export possible matches to Excel and PDF
export const exportPossibleMatchesToExcel = (matches, t) => {
  const selectedMatches = matches.filter(match => match.selected);
  if (selectedMatches.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = [
    t("Child Full Name"),
    t("Tutor Full Name"),
    t("Child City"),
    t("Tutor City"),
    t("Child Age"),
    t("Tutor Age"),
    t("Child Gender"),
    t("Tutor Gender"),
    t("Distance Between Cities (km)"),
    t("Grade"),
  ];
  const rows = selectedMatches.map(match => [
    match.child_full_name,
    match.tutor_full_name,
    match.child_city,
    match.tutor_city,
    match.child_age,
    match.tutor_age,
    match.child_gender ? t('Female') : t('Male'),
    match.tutor_gender ? t('Female') : t('Male'),
    match.distance_between_cities,
    match.grade,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Adjust column widths
  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet['!cols'] = columnWidths;

  // Set worksheet direction to RTL
  worksheet['!dir'] = 'rtl';

  const workbook = XLSX.utils.book_new();
  const sheetName = t('Possible Tutorship Matches'); // Sheet name
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const fileName = t('possible_tutorship_matches_report'); // File name
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
  toast.success(t('Report generated successfully')); // Show success toast
};

// Export possible matches to PDF
// Note: The PDF generation code is similar to the one used for tutors and families, but with different headers and data.
export const exportPossibleMatchesToPDF = (matches, t) => {
  const selectedMatches = matches.filter(match => match.selected);
  if (selectedMatches.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Register the Alef-Bold font
  doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
  doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
  doc.setFont('Alef', 'bold'); // Set the custom font

  // Add logo
  doc.addImage(logo, 'PNG', 10, 10, 30, 30);

  // Add title
  doc.setFontSize(18);
  doc.text(reverseText(t("Possible Tutorship Matches Report")), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Prepare table data
  const headers = [
    t("Child Full Name"),
    t("Tutor Full Name"),
    t("Child City"),
    t("Tutor City"),
    t("Child Age"),
    t("Tutor Age"),
    t("Child Gender"),
    t("Tutor Gender"),
    t("Distance Between Cities (km)"),
    t("Grade"),
  ].reverse(); // Reverse the order of headers for RTL
  const rows = selectedMatches.map(match => [
    reverseText(match.child_full_name), // Reverse for RTL
    reverseText(match.tutor_full_name), // Reverse for RTL
    reverseText(match.child_city), // Reverse for RTL
    reverseText(match.tutor_city), // Reverse for RTL
    match.child_age, // Keep numbers as is
    match.tutor_age, // Keep numbers as is
    reverseText(match.child_gender ? t('Female') : t('Male')), // Reverse for RTL
    reverseText(match.tutor_gender ? t('Female') : t('Male')), // Reverse for RTL
    match.distance_between_cities, // Keep numbers as is
    match.grade, // Keep numbers as is
  ]).map(row => row.reverse()); // <-- הפיכת כל שורה

  // Add table with RTL support
  doc.autoTable({
    head: [headers.map(header => reverseText(header))], // Reverse headers for RTL
    body: rows,
    startY: 50, // Position below the title
    styles: { font: "Alef", fontSize: 10, cellPadding: 3, halign: "right" }, // Align text to the right
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "right" }, // Align headers to the right
    columnStyles: {
      0: { halign: 'right' }, // Align first column to the right
      1: { halign: 'right' }, // Align second column to the right
      2: { halign: 'right' }, // Align third column to the right
      3: { halign: 'right' }, // Align fourth column to the right
      4: { halign: 'right' }, // Align fifth column to the right
      5: { halign: 'right' }, // Align sixth column to the right
      6: { halign: 'right' }, // Align seventh column to the right
      7: { halign: 'right' }, // Align eighth column to the right
      8: { halign: 'right' },
      9: { halign: 'right' },

    },
    margin: { left: 10, right: 10 }, // Add margins to prevent clipping
    tableWidth: 'auto', // Automatically adjust table width to fit the page
  });

  // Save the PDF
  doc.save(`${t("possible_tutorship_matches_report")}.pdf`);
  toast.success(t("Report generated successfully"));
};

export const exportVolunteerFeedbackToExcel = (feedbacks, t) => {
  const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
  if (selectedFeedbacks.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = [
    t("Volunteer Name"),
    t("Event Date"),
    t("Feedback Filled At"),
    t("Description"),
    t("Exceptional Events"),
    t("Anything Else"),
    t("Comments"),
  ];
  const rows = selectedFeedbacks.map(feedback => [
    feedback.volunteer_name,
    feedback.event_date,
    feedback.feedback_filled_at,
    feedback.description,
    feedback.exceptional_events,
    feedback.anything_else,
    feedback.comments,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("Volunteer Feedback Report"));
  XLSX.writeFile(workbook, `${t("volunteer_feedback_report")}.xlsx`);
  toast.success(t("Report generated successfully"));
};

export const exportVolunteerFeedbackToPDF = (feedbacks, t) => {
  const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
  if (selectedFeedbacks.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF("landscape", "mm", "a4");

  doc.addFileToVFS("Alef-Bold.ttf", AlefBold);
  doc.addFont("Alef-Bold.ttf", "Alef", "bold");
  doc.setFont("Alef", "bold");

  doc.addImage(logo, "PNG", 10, 10, 30, 30);

  doc.setFontSize(18);
  doc.text(reverseText(t("Volunteer Feedback Report")), doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });

  const headers = [
    reverseText(t("Volunteer Name")),
    reverseText(t("Event Date")),
    reverseText(t("Feedback Filled At")),
    reverseText(t("Description")),
    reverseText(t("Exceptional Events")),
    reverseText(t("Anything Else")),
    reverseText(t("Comments")),
  ].reverse(); // <-- הנה השימוש ב-reverse


  // Prepare table rows
  const rows = selectedFeedbacks.map(feedback => [
    feedback.volunteer_name,
    feedback.event_date,
    feedback.feedback_filled_at,
    feedback.description || "", // Handle null or undefined values
    feedback.exceptional_events || "",
    feedback.anything_else || "",
    feedback.comments || "",
  ]).map(row => row.reverse()); // <-- הפיכת כל שורה

  doc.autoTable({
    head: [headers],
    body: rows.map(row => row.map((cell, colIndex) => {
      const header = headers[colIndex]; // נשתמש בזה כדי לדעת מה השדה

      // שמות השדות ש*לא* נעבד (כלומר, נשאיר רגיל)
      const nonHebrewFields = [
        reverseText(t("Event Date")),
        reverseText(t("Feedback Filled At"))
      ];

      if (typeof cell === 'string' && !nonHebrewFields.includes(header)) {
        return formatHebrewTextForPDF(cell, 5);
      }

      return cell;
    })),

    startY: 50,
    styles: { font: "Alef", fontSize: 10, cellPadding: 3, halign: "right" },
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "right" },
    columnStyles: {
      0: { halign: 'right', cellwidth: 40 }, // Align first column to the right
      1: { halign: 'right' }, // Align second column to the right
      2: { halign: 'right', cellwidth: 30 }, // Align third column to the right
      3: { halign: 'right', cellwidth: 20 }, // Align fourth column to the right
      4: { halign: 'right', cellwidth: 20 }, // Align fifth column to the right
      5: { halign: 'right' }, // Align sixth column to the right
      6: { halign: 'right', cellwidth: 30 },
    },
  });

  doc.save(`${t("volunteer_feedback_report")}.pdf`);
  toast.success(t("Report generated successfully"));
};

export const exportTutorFeedbackToExcel = (feedbacks, t) => {
  const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
  if (selectedFeedbacks.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const headers = [
    t("Tutor Name"),
    t("Tutee Name"),
    t("Is It Your Tutee?"),
    t("Is First Visit?"),
    t("Event Date"),
    t("Feedback Filled At"),
    t("Description"),
    t("Exceptional Events"),
    t("Anything Else"),
    t("Comments"),
  ];
  const rows = selectedFeedbacks.map(feedback => [
    feedback.tutor_name,
    feedback.tutee_name,
    feedback.is_it_your_tutee ? t("Yes") : t("No"),
    feedback.is_first_visit ? t("Yes") : t("No"),
    feedback.event_date,
    feedback.feedback_filled_at,
    feedback.description,
    feedback.exceptional_events,
    feedback.anything_else,
    feedback.comments,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const columnWidths = worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
    ),
  }));
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("Tutor Feedback Report"));
  XLSX.writeFile(workbook, `${t("tutor_feedback_report")}.xlsx`);
  toast.success(t("Report generated successfully"));
};

const formatHebrewTextForPDFnew = (text, wordsPerLine = 5) => {
  if (!text) return "";
  const words = text.split(' ');
  const lines = [];

  for (let i = 0; i < words.length; i += wordsPerLine) {
    const lineWords = words.slice(i, i + wordsPerLine);
    lines.push(lineWords.join(' '));
  }

  return lines.join('\n');
};


export const exportTutorFeedbackToPDF = (feedbacks, t) => {
  const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
  if (selectedFeedbacks.length === 0) {
    showErrorToast(t, '', { message: 'אנא בחר לפחות רשומה אחת ליצירת דוח' });
    return;
  }

  const doc = new jsPDF("landscape", "mm", "a4");

  // Set RTL direction for the whole document
  doc.setR2L(true);

  doc.addFileToVFS("Alef-Bold.ttf", AlefBold);
  doc.addFont("Alef-Bold.ttf", "Alef", "bold");
  doc.setFont("Alef", "bold");

  doc.addImage(logo, "PNG", 10, 10, 30, 30);

  doc.setFontSize(18);
  doc.text(t("Tutor Feedback Report"), doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });

  const headers = [
    t("Comments"),
    t("Anything Else"),
    t("Exceptional Events"),
    t("Description"),
    t("Feedback Filled At"),
    t("Event Date"),
    t("Is First Visit?"),
    t("Is It Your Tutee?"),
    t("Tutee Name"),
    t("Tutor Name"),
  ];

  const rows = selectedFeedbacks.map(feedback => [
    feedback.comments || "",
    feedback.anything_else || "",
    feedback.exceptional_events || "",
    feedback.description || "",
    reverseText(feedback.feedback_filled_at),
    reverseText(feedback.event_date),
    feedback.is_first_visit ? t("Yes") : t("No"),
    feedback.is_it_your_tutee ? t("Yes") : t("No"),
    feedback.tutee_name,
    feedback.tutor_name,
  ]);

  doc.autoTable({
    head: [headers],
    body: rows.map(row => row.map((cell, colIndex) => {
      const header = headers[colIndex];
      const nonHebrewFields = [
        t("Event Date"),
        t("Feedback Filled At")
      ];

      if (typeof cell === 'string' && !nonHebrewFields.includes(header)) {
        return formatHebrewTextForPDFtutor(cell, 3);  // Split long Hebrew text
      }

      return cell;
    })),
    startY: 50,
    styles: { font: "Alef", fontSize: 10, cellPadding: 3, halign: "right", rtl: true },
    headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: "right", rtl: true },
    columnStyles: {
      0: { halign: 'right', cellWidth: 25 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 40 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 },
      6: { halign: 'right', cellWidth: 25 },
      7: { halign: 'right', cellWidth: 25 },
      8: { halign: 'right', cellWidth: 25 },
      9: { halign: 'right', cellWidth: 25 },
    },
  });

  doc.save(`${t("tutor_feedback_report")}.pdf`);
  toast.success(t("Report generated successfully"));
};
