/* utils.js */
import axios from '../axiosConfig';  // Import the configured Axios instance
import i18n from '../i18n';
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
  const sheetName = 'דוח חונכים פעילים'; // Hebrew sheet name
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
  ]];
  const rows = selectedTutors.map(tutor => [
    reverseText(`${tutor.tutor_firstname} ${tutor.tutor_lastname}`), // Reverse names
    reverseText(`${tutor.child_firstname} ${tutor.child_lastname}`), // Reverse names
    tutor.created_date // Keep the date as is
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
    },
  });

  // Save the PDF
  doc.save(`${t('active_tutors_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
};

// Helper function to reverse text for proper RTL rendering
const reverseText = (text) => {
  return text.split('').reverse().join('');
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
  ]];
  const rows = selectedFamilies.map(family => [
    reverseText(`${family.first_name} ${family.last_name}`), // Reverse names
    reverseText(family.city), // Reverse city name
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
    },
  });

  // Save the PDF
  doc.save(`${t('families_per_location_report')}.pdf`);
  toast.success(t('Report generated successfully')); // Show success toast
};