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
import axios from '../axiosConfig'; // ADD THIS IMPORT
import JSZip from 'jszip'; // For creating ZIP files

// **ADD THESE AUDIT FUNCTIONS**
const auditExportSuccess = async (format, recordCount, reportName, dataTypes = []) => {
  try {
    await axios.post('/api/audit-action/', {
      action: `EXPORT_REPORT_${format.toUpperCase()}_SUCCESS`,
      success: true,
      additional_data: {
        report_name: reportName,
        export_format: format,
        record_count: recordCount,
        exported_data_types: dataTypes,
        contains_pii: dataTypes.length > 0,
        gdpr_compliance: true
      }
    });
  } catch (error) {
    console.error('Failed to audit export success:', error);
  }
};

const auditExportFailure = async (format, reportName, errorMessage, failureType = 'TECHNICAL') => {
  try {
    await axios.post('/api/audit-action/', {
      action: `EXPORT_REPORT_${format.toUpperCase()}_FAILED`,
      success: false,
      error_message: errorMessage,
      additional_data: {
        report_name: reportName,
        export_format: format,
        failure_type: failureType
      }
    });
  } catch (error) {
    console.error('Failed to audit export failure:', error);
  }
};

/**
 * Exports a chart (by ref) to PDF, with a custom legend below.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {object} stats - { with_tutorship, waiting }
 * @param {function} t - translation function
 */
export const exportFamiliesTutorshipChartToPDF = async (chartRef, stats, t) => {
  const reportName = 'families_tutorship_stats';
  const format = 'IMAGE'; // This should trigger EXPORT_REPORT_IMAGE_SUCCESS/FAILED
  
  try {
    if (!chartRef.current) {
      await auditExportFailure(format, reportName, 'Chart reference not found', 'TECHNICAL');
      return;
    }

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
    toast.success(t('Report generated successfully'), { autoClose: 10000 });

    // **ADD AUDIT SUCCESS - This was missing!**
    await auditExportSuccess(format, 1, reportName, ['aggregate_statistics', 'family_counts']);
    
  } catch (error) {
    console.error('Chart export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
  }
};

/**
 * Exports the pending tutors chart to PDF, with a custom legend.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {object} stats - { pending_tutors, total_tutors }
 * @param {function} t - translation function
 */
export const exportPendingTutorsChartToPDF = async (chartRef, stats, t) => {
  const reportName = 'pending_tutors_stats';
  const format = 'IMAGE'; // This should trigger EXPORT_REPORT_IMAGE_SUCCESS/FAILED
  
  try {
    if (!chartRef.current) {
      await auditExportFailure(format, reportName, 'Chart reference not found', 'TECHNICAL');
      return;
    }

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
    toast.success(t('Report generated successfully'), { autoClose: 10000 });

    // **ADD AUDIT SUCCESS - This was missing!**
    await auditExportSuccess(format, 1, reportName, ['tutor_statistics', 'aggregate_data']);
    
  } catch (error) {
    console.error('Chart export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
  }
};

/**
 * Exports the roles spread chart to PDF, with a custom legend.
 * @param {object} chartRef - React ref to the chart container DOM node
 * @param {array} roles - [{name, count}]
 * @param {function} t - translation function
 */
export const exportRolesSpreadChartToPDF = async (chartRef, roles, t) => {
  const reportName = 'roles_spread_stats';
  const format = 'IMAGE'; // This should trigger EXPORT_REPORT_IMAGE_SUCCESS/FAILED
  
  try {
    if (!chartRef.current) {
      await auditExportFailure(format, reportName, 'Chart reference not found', 'TECHNICAL');
      return;
    }

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
    toast.success(t('Report generated successfully'), { autoClose: 10000 });

    // **ADD AUDIT SUCCESS - This was missing!**
    await auditExportSuccess(format, 1, reportName, ['role_statistics', 'staff_counts']);
    
  } catch (error) {
    console.error('Chart export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
  }
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


export const exportToExcel = async (tutors, t) => {
  const reportName = 'active_tutors_report';
  const format = 'EXCEL';
  
  try {
    const selectedTutors = tutors.filter(tutor => tutor.selected);
    if (selectedTutors.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedTutors.length, reportName, ['tutor_names', 'child_names', 'tutorship_dates']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportToPDF = async (tutors, t) => {
  const reportName = 'active_tutors_report';
  const format = 'PDF';
  
  try {
    const selectedTutors = tutors.filter(tutor => tutor.selected);
    if (selectedTutors.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedTutors.length, reportName, ['tutor_names', 'child_names', 'tutorship_dates']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportFamiliesToExcel = async (families, t) => {
  const reportName = 'families_per_location_report';
  const format = 'EXCEL';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'addresses', 'registration_dates', 'location_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportFamiliesToPDF = async (families, t) => {
  const reportName = 'families_per_location_report';
  const format = 'PDF';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'addresses', 'registration_dates', 'location_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportTutorshipPendingToExcel = async (families, t) => {
  const reportName = 'families_waiting_for_tutorship_report';
  const format = 'EXCEL';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'parent_names', 'phone_numbers', 'family_status', 'contact_info']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportTutorshipPendingToPDF = async (families, t) => {
  const reportName = 'families_waiting_for_tutorship_report';
  const format = 'PDF';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'parent_names', 'phone_numbers', 'family_status', 'contact_info']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportNewFamiliesToExcel = async (families, t) => {
  const reportName = 'new_families_report';
  const format = 'EXCEL';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'parent_names', 'phone_numbers', 'registration_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportNewFamiliesToPDF = async (families, t) => {
  const reportName = 'new_families_report';
  const format = 'PDF';
  
  try {
    const selectedFamilies = families.filter(family => family.selected);
    if (selectedFamilies.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFamilies.length, reportName, ['child_names', 'parent_names', 'phone_numbers', 'registration_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

// Export possible matches to Excel and PDF
export const exportPossibleMatchesToExcel = async (matches, t) => {
  const reportName = 'possible_tutorship_matches_report';
  const format = 'EXCEL';
  
  try {
    const selectedMatches = matches.filter(match => match.selected);
    if (selectedMatches.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = [
      t("Child Full Name"),
      t("Tutor Full Name"),
      t("Child City"),
      t("Tutor City"),
      t("Child Birth Date"),
      t("Child Age"),
      t("Tutor Birth Date"),
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
      match.child_birth_date || "-",
      match.child_age,
      match.tutor_birth_date || "-",
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
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedMatches.length, reportName, ['child_names', 'tutor_names', 'location_data', 'matching_algorithms', 'demographic_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

// Export possible matches to PDF
// Note: The PDF generation code is similar to the one used for tutors and families, but with different headers and data.
export const exportPossibleMatchesToPDF = async (matches, t) => {
  const reportName = 'possible_tutorship_matches_report';
  const format = 'PDF';
  
  try {
    const selectedMatches = matches.filter(match => match.selected);
    if (selectedMatches.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
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
      t("Child Birth Date"),
      t("Child Age"),
      t("Tutor Birth Date"),
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
      match.child_birth_date || "-", // Birth date
      match.child_age, // Keep numbers as is
      match.tutor_birth_date || "-", // Birth date
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
        10: { halign: 'right' },
        11: { halign: 'right' },

      },
      margin: { left: 10, right: 10 }, // Add margins to prevent clipping
      tableWidth: 'auto', // Automatically adjust table width to fit the page
    });

    // Save the PDF
    doc.save(`${t("possible_tutorship_matches_report")}.pdf`);
    toast.success(t("Report generated successfully"));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedMatches.length, reportName, ['child_names', 'tutor_names', 'location_data', 'matching_algorithms', 'demographic_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportFeedbackToExcel = async (feedbacks, t) => {
  const reportName = 'feedback_report';
  const format = 'EXCEL';
  
  try {
    const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
    if (selectedFeedbacks.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = [
      t("Volunteer/Tutor Name"),
      t("Tutee Name / Hospital Name"),
      t("Is It Your Tutee?"),
      t("Event Date"),
      t("Feedback Filled At"),
      t("Description"),
      t("Feedback Type"),
      t("Exceptional Events"),
      t("Anything Else"),
      t("Comments"),
      t("Initial Family Data"),
    ];
    const rows = selectedFeedbacks.map(feedback => [
      feedback.filler_name,
      feedback.subject_name || feedback.hospital_name,
      feedback.is_it_your_tutee ? t("Yes") : t("No"),
      feedback.event_date,
      feedback.feedback_filled_at,
      feedback.description,
      t(feedback.feedback_type),
      feedback.exceptional_events,
      feedback.anything_else,
      feedback.comments,
      [
        (feedback.names ? t("Names") + ": " + feedback.names + "\n" : "") +
        (feedback.phones ? t("Phones") + ": " + feedback.phones + "\n" : "") +
        (feedback.other_information ? t("Other Information") + ": " + feedback.other_information : "")
      ].join("")
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
    XLSX.utils.book_append_sheet(workbook, worksheet, t("Feedback Report"));
    XLSX.writeFile(workbook, `${t("feedback_report")}.xlsx`);
    toast.success(t("Report generated successfully"));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFeedbacks.length, reportName, ['tutor_names', 'child_names', 'medical_events', 'personal_feedback', 'family_circumstances', 'health_information', 'tutorship_relationships']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};


export const exportFeedbackToPDF = async (feedbacks, t) => {
  const reportName = 'feedback_report';
  const format = 'PDF';
  
  try {
    const selectedFeedbacks = feedbacks.filter(feedback => feedback.selected);
    if (selectedFeedbacks.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a3");

    // Set RTL direction for the whole document
    doc.setR2L(true);

    doc.addFileToVFS("Alef-Bold.ttf", AlefBold);
    doc.addFont("Alef-Bold.ttf", "Alef", "bold");
    doc.setFont("Alef", "bold");

    doc.addImage(logo, "PNG", 10, 10, 30, 30);

    doc.setFontSize(22);
    doc.text(t("Feedback Report"), doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });

    const headers = [
      t("Initial Family Data"),
      t("Comments"),
      t("Anything Else"),
      t("Exceptional Events"),
      t("Description"),
      t("Feedback Type"),
      t("Feedback Filled At"),
      t("Event Date"),
      t("Is It Your Tutee?"),
      t("Tutee Name / Hospital Name"),
      t("Volunteer/Tutor Name"),
    ];

    const rows = selectedFeedbacks.map(feedback => [
      [
        (feedback.names ? t("Names") + ": " + feedback.names + "\n" : "") +
        (feedback.phones ? t("Phones") + ": " + feedback.phones + "\n" : "") +
        (feedback.other_information ? t("Other Information") + ": " + feedback.other_information : "")
      ].join(""),
      feedback.comments || "",
      feedback.anything_else || "",
      feedback.exceptional_events || "",
      feedback.description || "",
      t(feedback.feedback_type) || "",
      reverseText(feedback.feedback_filled_at),
      reverseText(feedback.event_date),
      feedback.is_it_your_tutee ? t("Yes") : t("No"),
      feedback.subject_name || feedback.hospital_name,
      feedback.filler_name,
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
        0: { halign: 'right', cellWidth: 25 }, // initial_family_data
        1: { halign: 'right', cellWidth: 25 }, // comments
        2: { halign: 'right', cellWidth: 25 }, // anything_else
        3: { halign: 'right', cellWidth: 25 }, // exceptional_events
        4: { halign: 'right', cellWidth: 30 }, // description
        5: { halign: 'right', cellWidth: 30 }, // feedback_type
        6: { halign: 'right', cellWidth: 40 }, // feedback_filled_at
        7: { halign: 'right', cellWidth: 60 }, // event_date
        8: { halign: 'right', cellWidth: 25 }, // is_it_your_tutee
        9: { halign: 'right', cellWidth: 25 }, // tutee_name
        10: { halign: 'right', cellWidth: 50 }, // tutor_name
      },
    });

    doc.save(`${t("feedback_report")}.pdf`);
    toast.success(t("Report generated successfully"));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, selectedFeedbacks.length, reportName, ['tutor_names', 'child_names', 'medical_events', 'personal_feedback', 'family_circumstances', 'health_information', 'tutorship_relationships']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};
export const exportAuditToCSV = async (auditLogs, t, customFilename = null, skipSuccessToast = false) => {
  const reportName = 'audit_log_report';
  const format = 'CSV';
  
  try {
    // Validate that data is provided
    if (!auditLogs || auditLogs.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      toast.dismiss('audit-export-error');
      toast.dismiss('audit-export-success');
      showErrorToast(t, '', { message: errorMsg });
      return false; // Return false on validation error
    }

    // CSV headers (English keys used to read each row; the printed header row is
    // translated to Hebrew below).
    const headers = ['Timestamp', 'Description', 'User Email', 'User Roles', 'Action', 'Source IP', 'Status'];
    
    // Helper to escape CSV fields (handles commas, quotes, newlines)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // If the field contains commas, quotes, or newlines, wrap in double quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    // Build CSV content with BOM for proper Hebrew encoding in Excel
    const BOM = '\uFEFF';
    let csvContent = BOM;
    
    // Add header row (translated to Hebrew)
    csvContent += headers.map(h => escapeCSV(t(h))).join(',') + '\r\n';
    
    // Add data rows
    auditLogs.forEach(log => {
      const row = [
        log.Timestamp || '',
        log.Description || '',
        log['User Email'] || '',
        log['User Roles'] || '',
        log.Action || '',
        log['Source IP'] || '',
        log.Status || '',
      ];
      csvContent += row.map(escapeCSV).join(',') + '\r\n';
    });

    // Generate filename with date range if not custom
    let filename = customFilename;
    if (!filename) {
      // Extract dates from logs (assume they have date info)
      const now = new Date();
      const timestamp = now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
      filename = `${t('audit_log_report')}_${timestamp}`;
    }

    // Create ZIP with CSV inside (with compression enabled)
    const zip = new JSZip();
    zip.file(`${filename}.csv`, csvContent, { compression: 'DEFLATE' });
    
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success toast unless explicitly skipped (for purge case)
    if (!skipSuccessToast) {
      toast.success(t('Audit log exported successfully'), { toastId: 'audit-export-success', autoClose: 10000 });
    }

    // Audit the export success
    await auditExportSuccess(format, auditLogs.length, reportName, ['timestamp', 'description', 'user_roles', 'ip_address']);
    
    return true; // Return true on success
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    toast.dismiss('audit-export-error');
    toast.dismiss('audit-export-success');
    showErrorToast(t, '', { message: 'Export failed' });
    return false; // Return false on error
  }
};

export const exportAuditToPDF = async (auditLogs, t, changes = []) => {
  const reportName = 'audit_log_report';
  const format = 'PDF';

  try {
    // Validate that data is provided
    if (!auditLogs || auditLogs.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      toast.dismiss('audit-export-error');
      toast.dismiss('audit-export-success');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Register the Alef-Bold font
    doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
    doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
    doc.setFont('Alef', 'bold');

    // Add logo
    doc.addImage(logo, 'PNG', 10, 10, 30, 30);

    // Add report title
    doc.setFontSize(18);
    doc.text(reverseText(t('Audit Log Report')), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

    // Prepare table data
    const headers = [[
      '#',
      reverseText(t('Timestamp')),
      reverseText(t('Description')),
      reverseText(t('User Roles')),
      reverseText(t('Source IP')),
    ].reverse()];

    // Reorder timestamp: split and swap date/time order
    const rows = auditLogs.map((log, idx) => {
      const timestamp = log[t('Timestamp')] || '';
      const [time, date] = timestamp.split(',').map(s => s.trim());
      const reorderedTimestamp = date && time ? `${date} ${time}` : timestamp;

      return [
        String(idx + 1),
        reorderedTimestamp,
        log[t('Description')] || '',
        reverseText(log[t('User Roles')] || ''),
        log[t('IP Address')] || '—',
      ].reverse();
    });

    // Add table with RTL support
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 50,
      styles: { font: 'Alef', fontSize: 10, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [76, 175, 80], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },                 // Source IP
        1: { halign: 'center' },                 // User Roles
        2: { halign: 'center', cellWidth: 80 },  // Description
        3: { halign: 'center' },                 // Timestamp
        4: { halign: 'center', cellWidth: 12 },  // # (row number)
      },
    });

    // Field-changes table. jsPDF can't nest a table inside a cell, so the "→"
    // changes are shown as their own clean Field / Old / New table right below the
    // main table, keyed by the same row number (#) as the main table so each
    // change maps to its row. Hebrew values are reversed for the no-bidi renderer;
    // English field names stay as-is.
    if (changes && changes.length) {
      const maybeRev = (v) => {
        const s = String(v == null ? '' : v);
        return /[\u0590-\u05FF]/.test(s) ? reverseText(s) : s;
      };
      const titleY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 50) + 14;
      doc.setFontSize(13);
      doc.text(reverseText(t('Field Changes')), doc.internal.pageSize.getWidth() / 2, titleY, { align: 'center' });

      doc.autoTable({
        head: [[
          '#',
          reverseText(t('Field')),
          reverseText(t('Old Value')),
          reverseText(t('New Value')),
        ].reverse()],
        body: changes.map(c => [
          String(c.rowNum),
          maybeRev(c.field),
          maybeRev(c.oldValue),
          maybeRev(c.newValue),
        ].reverse()),
        startY: titleY + 4,
        styles: { font: 'Alef', fontSize: 9, cellPadding: 3, halign: 'center', valign: 'top' },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, halign: 'center' },
        columnStyles: { 3: { cellWidth: 12 } }, // # column (narrow)
      });
    }

    doc.save(`${t('audit_log_report')}.pdf`);
    toast.success(t('Audit log exported successfully'), { toastId: 'audit-export-success', autoClose: 10000 });

    await auditExportSuccess(format, auditLogs.length, reportName, ['timestamp', 'description', 'user_roles', 'ip_address']);

  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    toast.dismiss('audit-export-error');
    toast.dismiss('audit-export-success');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

// ===== ALL FAMILIES EXPORT REPORT =====
export const exportAllFamiliesToExcel = async (families, t) => {
  const reportName = 'all_families_export_report';
  const format = 'EXCEL';
  
  try {
    if (!families || families.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    // Get headers from the first family object (already has Hebrew headers as keys)
    const headers = Object.keys(families[0]);
    console.log('Export headers:', headers); // DEBUG: Check if all headers are present
    console.log('First family data:', families[0]); // DEBUG: Check first family
    console.log('Total families to export:', families.length); // DEBUG: Check count
    
    const rows = families.map(family => 
      headers.map(header => family[header] || '')
    );

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Adjust column widths to fit content
    const columnWidths = worksheetData[0].map((_, colIndex) => ({
      wch: Math.max(
        ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
      ) + 2,
    }));
    worksheet['!cols'] = columnWidths;

    // Set worksheet direction to RTL
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    const sheetName = 'דוח ייצוא משפחות'; // Hebrew sheet name
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fileName = 'דוח ייצוא משפחות';
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, families.length, reportName, ['family_data', 'child_info', 'contact_info', 'tutorship_status', 'medical_info']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

// ===== ALL VOLUNTEERS IRS REPORT EXPORT =====
export const exportAllVolunteersIRSToExcel = async (volunteers, t) => {
  const reportName = 'all_volunteers_irs_report';
  const format = 'EXCEL';
  
  try {
    if (!volunteers || volunteers.length === 0) {
      const errorMsg = 'אנא בחר לפחות רשומה אחת ליצירת דוח';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    // Get headers from the first volunteer object (already has Hebrew headers as keys)
    const headers = Object.keys(volunteers[0]);
    console.log('Export headers:', headers); // DEBUG: Check if all 16 headers are present
    console.log('First volunteer data:', volunteers[0]); // DEBUG: Check first volunteer
    console.log('Total volunteers to export:', volunteers.length); // DEBUG: Check count
    
    const rows = volunteers.map(volunteer => 
      headers.map(header => volunteer[header] || '')
    );

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Adjust column widths to fit content
    const columnWidths = worksheetData[0].map((_, colIndex) => ({
      wch: Math.max(
        ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
      ) + 2,
    }));
    worksheet['!cols'] = columnWidths;

    // Set worksheet direction to RTL
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    const sheetName = 'דוח מתנדבים כללי'; // Hebrew sheet name
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fileName = 'דוח מתנדבים כללי';
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    toast.success(t('Report generated successfully'));

    // **ADD AUDIT SUCCESS**
    await auditExportSuccess(format, volunteers.length, reportName, ['volunteer_data', 'contact_info', 'tutorship_data']);
    
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export { auditExportFailure, auditExportSuccess};

// ── Refunds Report Export ─────────────────────────────────────────────────────
// These functions export the aggregated report (period summary + volunteer breakdown + status breakdown)
// They accept the raw refunds array and compute everything internally — no row selection needed.

const MONTHS_HE_EXPORT = [
  '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const QUARTER_LABELS_EXPORT = ['', 'Q1 (ינואר–מרץ)', 'Q2 (אפריל–יוני)', 'Q3 (יולי–ספטמבר)', 'Q4 (אוקטובר–דצמבר)'];

const parseRefundDate = (s) => {
  if (!s) return null;
  const [y, m] = s.split('-').map(Number);
  return { year: y, month: m };
};

const computeRefundReportRows = (refunds, period, selectedYear) => {
  const filtered = refunds.filter(r => {
    const d = parseRefundDate(r.expense_date);
    return d && d.year === selectedYear;
  });
  if (period === 'monthly') {
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = { label: MONTHS_HE_EXPORT[m], requested: 0, approved: 0, count: 0 };
    filtered.forEach(r => {
      const d = parseRefundDate(r.expense_date);
      if (!d) return;
      map[d.month].requested += parseFloat(r.requested_amount || 0);
      map[d.month].approved += parseFloat(r.approved_amount || 0);
      map[d.month].count += 1;
    });
    return Object.values(map);
  }
  if (period === 'quarterly') {
    const map = {
      1: { label: QUARTER_LABELS_EXPORT[1], requested: 0, approved: 0, count: 0 },
      2: { label: QUARTER_LABELS_EXPORT[2], requested: 0, approved: 0, count: 0 },
      3: { label: QUARTER_LABELS_EXPORT[3], requested: 0, approved: 0, count: 0 },
      4: { label: QUARTER_LABELS_EXPORT[4], requested: 0, approved: 0, count: 0 },
    };
    filtered.forEach(r => {
      const d = parseRefundDate(r.expense_date);
      if (!d) return;
      const q = Math.ceil(d.month / 3);
      map[q].requested += parseFloat(r.requested_amount || 0);
      map[q].approved += parseFloat(r.approved_amount || 0);
      map[q].count += 1;
    });
    return Object.values(map);
  }
  // annual
  const allYears = {};
  refunds.forEach(r => {
    const d = parseRefundDate(r.expense_date);
    if (!d) return;
    const y = d.year;
    if (!allYears[y]) allYears[y] = { label: String(y), requested: 0, approved: 0, count: 0 };
    allYears[y].requested += parseFloat(r.requested_amount || 0);
    allYears[y].approved += parseFloat(r.approved_amount || 0);
    allYears[y].count += 1;
  });
  return Object.entries(allYears).sort(([a], [b]) => b - a).map(([, v]) => v);
};

const computeVolunteerBreakdown = (refunds, period, selectedYear) => {
  const src = period === 'annual' ? refunds : refunds.filter(r => {
    const d = parseRefundDate(r.expense_date);
    return d && d.year === selectedYear;
  });
  const map = {};
  src.forEach(r => {
    const name = r.staff_full_name || '—';
    if (!map[name]) map[name] = { requested: 0, approved: 0, count: 0 };
    map[name].requested += parseFloat(r.requested_amount || 0);
    map[name].approved += parseFloat(r.approved_amount || 0);
    map[name].count += 1;
  });
  return Object.entries(map).sort(([, a], [, b]) => b.requested - a.requested).map(([name, vals]) => ({ name, ...vals }));
};

const computeStatusBreakdown = (refunds, period, selectedYear) => {
  const src = period === 'annual' ? refunds : refunds.filter(r => {
    const d = parseRefundDate(r.expense_date);
    return d && d.year === selectedYear;
  });
  const map = {};
  src.forEach(r => {
    const s = r.status || 'לא ידוע';
    if (!map[s]) map[s] = { count: 0, requested: 0 };
    map[s].count += 1;
    map[s].requested += parseFloat(r.requested_amount || 0);
  });
  return Object.entries(map).sort(([, a], [, b]) => b.count - a.count);
};

// Draw a pie chart showing requested amount distribution by period
const drawPeriodPieChart = (periodRows) => {
  const SIZE = 300;
  const LEGEND_W = 200;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE + LEGEND_W;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeRows = periodRows.filter(r => r.requested > 0);
  const total = activeRows.reduce((s, r) => s + r.requested, 0);
  if (total === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('אין נתונים', (SIZE + LEGEND_W) / 2, SIZE / 2);
    return canvas.toDataURL('image/png');
  }

  const COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899','#06b6d4','#84cc16','#a78bfa'];
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 16;

  let startAngle = -Math.PI / 2;
  activeRows.forEach((row, i) => {
    const slice = (row.requested / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });

  // Legend
  let legendY = 20;
  activeRows.forEach((row, i) => {
    const pct = ((row.requested / total) * 100).toFixed(0);
    const label = row.label.split(' ')[0]; // short label
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fillRect(SIZE + 8, legendY, 14, 14);
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${label} (${pct}%)`, SIZE + 28, legendY + 12);
    legendY += 22;
    if (legendY > SIZE - 10) return; // overflow guard
  });

  return canvas.toDataURL('image/png');
};

// Draw a vertical period bar chart (requested vs approved), RTL column order (ינואר on right)
const drawPeriodBarChart = (periodRows, period) => {
  // Reverse so rightmost column = first period (RTL)
  const rows = [...periodRows].reverse();
  const n = rows.length;

  const PAD_LEFT = 55;
  const PAD_RIGHT = 15;
  const PAD_TOP = 45;
  const PAD_BOTTOM = 55;
  const BAR_GROUP = period === 'monthly' ? 46 : period === 'quarterly' ? 100 : 80;
  const WIDTH = PAD_LEFT + n * BAR_GROUP + PAD_RIGHT;
  const HEIGHT = 300;
  const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const maxVal = Math.max(...rows.map(r => r.requested), 1);

  // Y-axis gridlines + labels
  const steps = 4;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * i;
    const y = PAD_TOP + CHART_H - (val / maxVal) * CHART_H;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(WIDTH - PAD_RIGHT, y);
    ctx.stroke();
    ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0), PAD_LEFT - 4, y + 4);
  }

  // Legend top-right
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(WIDTH - PAD_RIGHT - 120, 8, 14, 14);
  ctx.fillStyle = '#374151';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('מבוקש', WIDTH - PAD_RIGHT - 102, 20);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(WIDTH - PAD_RIGHT - 55, 8, 14, 14);
  ctx.fillStyle = '#374151';
  ctx.fillText('אושר', WIDTH - PAD_RIGHT - 37, 20);

  // Bars
  const barW = Math.max(Math.floor(BAR_GROUP * 0.38), 8);
  const gap = Math.max(Math.floor(BAR_GROUP * 0.08), 2);

  rows.forEach((row, i) => {
    // RTL: first row (index 0) goes on the RIGHT side
    const groupX = PAD_LEFT + (n - 1 - i) * BAR_GROUP + Math.floor((BAR_GROUP - 2 * barW - gap) / 2);

    const reqH = Math.max((row.requested / maxVal) * CHART_H, row.requested > 0 ? 2 : 0);
    const appH = Math.max((row.approved / maxVal) * CHART_H, row.approved > 0 ? 2 : 0);

    // Requested bar (right of pair)
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(groupX + barW + gap, PAD_TOP + CHART_H - reqH, barW, reqH);

    // Approved bar (left of pair)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(groupX, PAD_TOP + CHART_H - appH, barW, appH);

    // X-axis label — short label
    const label = row.label.split(' ')[0]; // e.g. "ינואר" from "ינואר" or "Q1" from "Q1 (ינואר–מרץ)"
    ctx.fillStyle = '#374151';
    ctx.font = `${period === 'monthly' ? 11 : 12}px Arial`;
    ctx.textAlign = 'center';
    const labelX = groupX + barW + gap / 2;
    ctx.fillText(label, labelX, PAD_TOP + CHART_H + 16);
  });

  // X axis line
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + CHART_H);
  ctx.lineTo(WIDTH - PAD_RIGHT, PAD_TOP + CHART_H);
  ctx.stroke();

  return canvas.toDataURL('image/png');
};

export const exportRefundsReportToExcel = async (refunds, period, selectedYear) => {
  const reportName = 'refunds_period_report';
  const format = 'EXCEL';
  try {
    const periodRows = computeRefundReportRows(refunds || [], period, selectedYear);
    const periodLabel = period === 'monthly' ? `חודשי — ${selectedYear}` : period === 'quarterly' ? `רבעוני — ${selectedYear}` : 'שנתי';

    const sheetData = [
      ['תקופה', "מס' בקשות", 'סה"כ מבוקש (₪)', 'סה"כ אושר (₪)', '% אושר'],
      ...periodRows.map(r => [
        r.label, r.count,
        Number(r.requested).toFixed(2),
        Number(r.approved).toFixed(2),
        r.requested > 0 ? `${((r.approved / r.requested) * 100).toFixed(0)}%` : '—',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!dir'] = 'rtl';
    ws['!cols'] = sheetData[0].map((_, i) => ({ wch: Math.max(...sheetData.map(r => (r[i] || '').toString().length)) + 2 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, `סיכום ${periodLabel}`);
    XLSX.writeFile(workbook, `דוח_החזרים_${periodLabel}.xlsx`);
    toast.success('הדוח יוצא בהצלחה');
    await auditExportSuccess(format, refunds.length, reportName, ['refund_report_data']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    toast.error('שגיאה בייצוא הדוח');
  }
};

export const exportRefundsReportToPDF = async (refunds, period, selectedYear) => {
  const reportName = 'refunds_period_report';
  const format = 'PDF';
  try {
    const safeRefunds = refunds || [];
    const periodRows = computeRefundReportRows(safeRefunds, period, selectedYear);
    const periodLabel = period === 'monthly' ? `חודשי — ${selectedYear}` : period === 'quarterly' ? `רבעוני — ${selectedYear}` : 'שנתי';

    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.addFileToVFS('Alef-Bold.ttf', AlefBold);
    doc.addFont('Alef-Bold.ttf', 'Alef', 'bold');
    doc.setFont('Alef', 'bold');

    const pageW = doc.internal.pageSize.getWidth();

    // Logo + title — use reverseText for Hebrew (jsPDF requires it for RTL)
    doc.addImage(logo, 'PNG', 10, 6, 18, 18);
    doc.setFontSize(16);
    doc.text(reverseText(`דוח החזרי הוצאות — ${periodLabel}`), pageW / 2, 16, { align: 'center' });
    doc.setFontSize(12);
    const periodTypeLabel = period === 'monthly' ? 'חודש' : period === 'quarterly' ? 'רבעון' : 'שנה';
    doc.text(reverseText(`סיכום לפי ${periodTypeLabel}`), pageW - 14, 28, { align: 'right' });

    // Period summary table — reverse column array so PDF (LTR) matches UI (RTL) visual order
    // Note: don't pass (₪) through reverseText — parens would flip to )₪(
    doc.autoTable({
      head: [[
        reverseText('תקופה'),
        reverseText("מס' בקשות"),
        reverseText('סה"כ מבוקש') + ' (₪)',
        reverseText('סה"כ אושר') + ' (₪)',
        reverseText('% אושר'),
      ].reverse()],
      body: periodRows.map(r => [
        reverseText(r.label),
        r.count,
        Number(r.requested).toFixed(2),
        Number(r.approved).toFixed(2),
        r.requested > 0 ? `${((r.approved / r.requested) * 100).toFixed(0)}%` : '—',
      ].reverse()),
      startY: 32,
      styles: { font: 'Alef', fontSize: 9, halign: 'right' },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, halign: 'right' },
    });

    // Charts — pie (right) + vertical bar (left), side by side
    if (safeRefunds.length > 0 && periodRows.length > 0) {
      const pageH = doc.internal.pageSize.getHeight();
      const afterTable = doc.lastAutoTable.finalY + 10;
      const chartsNeedH = 90;

      let chartY;
      if (afterTable + chartsNeedH > pageH) {
        doc.addPage();
        chartY = 20;
      } else {
        chartY = afterTable;
      }

      const chartH = 72;
      const pieW = 100;
      const barW = pageW - 28 - pieW - 6;

      doc.setFontSize(9);

      // Pie chart — right side
      const pieImg = drawPeriodPieChart(periodRows);
      const pieTitleLabel = period === 'monthly'
        ? reverseText(`התפלגות מבוקש לפי חודש`)
        : period === 'quarterly'
          ? reverseText(`התפלגות מבוקש לפי רבעון`)
          : reverseText('התפלגות מבוקש לפי שנה');
      doc.text(pieTitleLabel, pageW - 14, chartY, { align: 'right' });
      doc.addImage(pieImg, 'PNG', pageW - 14 - pieW, chartY + 5, pieW, chartH);

      // Vertical bar chart — left side
      const barImg = drawPeriodBarChart(periodRows, period);
      const barTitleLabel = period === 'monthly'
        ? reverseText(`סכומים לפי חודש — ${selectedYear}`)
        : period === 'quarterly'
          ? reverseText(`סכומים לפי רבעון — ${selectedYear}`)
          : reverseText('סכומים לפי שנה');
      doc.text(barTitleLabel, 14 + barW, chartY, { align: 'right' });
      doc.addImage(barImg, 'PNG', 14, chartY + 5, barW, chartH);
    }

    doc.save(`דוח_החזרים_${periodLabel}.pdf`);
    toast.success('הדוח יוצא בהצלחה');
    await auditExportSuccess(format, safeRefunds.length, reportName, ['refund_report_data']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    toast.error('שגיאה בייצוא הדוח');
  }
};

// ── Finance mega-feature exports (קופה קטנה / הוצאות שוטפות / סקירה כללית) ──
// Unlike the report_pages exports above (which require row checkboxes / a
// .selected flag), these finance pages are simple admin CRUD tables with no
// row-selection UI — so these export whatever array is passed in directly
// (the caller passes the already search-filtered list), same no-selection
// shape as exportRefundsReportToExcel just above.

const _autoFitColumns = (worksheetData) =>
  worksheetData[0].map((_, colIndex) => ({
    wch: Math.max(
      ...worksheetData.map(row => (row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex].toString().length : 0))
    ) + 2,
  }));

export const exportPettyCashToExcel = async (entries, t) => {
  const reportName = 'petty_cash';
  const format = 'EXCEL';
  try {
    if (!entries || entries.length === 0) {
      const errorMsg = 'אין נתונים לייצוא';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = ['#', 'תאריך', 'הוצאה', 'סכום (₪)', 'שולם ע"י', 'הערות', 'מקור'];
    const rows = entries.map(e => [
      e.id,
      e.expense_date,
      e.expense_name,
      Number(e.amount || 0).toFixed(2),
      e.paid_by || '',
      e.notes || '',
      e.source_refund_id ? `מהחזר #${e.source_refund_id}` : '',
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = _autoFitColumns(worksheetData);
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'קופה קטנה');
    XLSX.writeFile(workbook, 'קופה_קטנה.xlsx');
    toast.success(t('Exported to Excel successfully'));

    await auditExportSuccess(format, entries.length, reportName, ['expense_amounts', 'expense_descriptions']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportOngoingExpensesToExcel = async (entries, t) => {
  const reportName = 'ongoing_expenses';
  const format = 'EXCEL';
  try {
    if (!entries || entries.length === 0) {
      const errorMsg = 'אין נתונים לייצוא';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = ['#', 'תאריך', 'הוצאה', 'קטגוריה', 'סכום (₪)', 'מספר חשבונית', 'הערות'];
    const rows = entries.map(e => [
      e.id,
      e.expense_date,
      e.expense_name,
      e.category || '',
      Number(e.amount || 0).toFixed(2),
      e.invoice_number || '',
      e.notes || '',
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = _autoFitColumns(worksheetData);
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'הוצאות שוטפות');
    XLSX.writeFile(workbook, 'הוצאות_שוטפות.xlsx');
    toast.success(t('Exported to Excel successfully'));

    await auditExportSuccess(format, entries.length, reportName, ['expense_amounts', 'expense_descriptions']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportFinanceOverviewToExcel = async (transactions, t) => {
  const reportName = 'finance_overview';
  const format = 'EXCEL';
  try {
    if (!transactions || transactions.length === 0) {
      const errorMsg = 'אין נתונים לייצוא';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = ['תאריך', 'מקור', 'תיאור', 'סכום (₪)'];
    const rows = transactions.map(tr => [
      tr.date || '',
      tr.source,
      tr.description || '',
      Number(tr.amount || 0).toFixed(2),
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = _autoFitColumns(worksheetData);
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'סקירה כללית');
    XLSX.writeFile(workbook, 'סקירה_כללית_כספים.xlsx');
    toast.success(t('Exported to Excel successfully'));

    await auditExportSuccess(format, transactions.length, reportName, ['expense_amounts', 'expense_descriptions']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};

export const exportFinancialAidToExcel = async (entries, t) => {
  const reportName = 'financial_aid';
  const format = 'EXCEL';
  try {
    if (!entries || entries.length === 0) {
      const errorMsg = 'אין נתונים לייצוא';
      await auditExportFailure(format, reportName, errorMsg, 'VALIDATION');
      showErrorToast(t, '', { message: errorMsg });
      return;
    }

    const headers = ['#', 'שם משפחה', 'תאריך סיוע', 'סכום (₪)', 'אופן ביצוע', 'מקושר לתיק משפחה', 'מסמכים', 'הערות'];
    const rows = entries.map(e => [
      e.id,
      e.family_name,
      e.aid_date,
      Number(e.amount || 0).toFixed(2),
      e.method || '',
      e.linked_child_id ? 'כן' : 'לא',
      (e.attachments || []).length,
      e.notes || '',
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = _autoFitColumns(worksheetData);
    worksheet['!dir'] = 'rtl';

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'סיוע כספי');
    XLSX.writeFile(workbook, 'סיוע_כספי.xlsx');
    toast.success(t('Exported to Excel successfully'));

    await auditExportSuccess(format, entries.length, reportName, ['family_names', 'aid_amounts']);
  } catch (error) {
    console.error('Export failed:', error);
    await auditExportFailure(format, reportName, error.message, 'TECHNICAL');
    showErrorToast(t, '', { message: 'Export failed' });
  }
};