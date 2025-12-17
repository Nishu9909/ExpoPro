import { Transaction } from '../types';

export const generateCSV = (transactions: Transaction[], totalBalance: number) => {
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Section 1: Summary
  csvContent += "FINANCIAL SUMMARY\n";
  csvContent += `Total Balance,${totalBalance.toFixed(2)}\n`;
  csvContent += `Generated Date,${new Date().toLocaleDateString()}\n\n`;

  // Section 2: Income
  csvContent += "INCOME REPORT\n";
  csvContent += "Date,Description,Category,Account,Amount\n";
  incomes.forEach(t => {
    csvContent += `${t.date},"${t.description}",${t.category},${t.accountName},${t.amount}\n`;
  });
  csvContent += "\n";

  // Section 3: Expense
  csvContent += "EXPENSE REPORT\n";
  csvContent += "Date,Description,Category,Account,Amount\n";
  expenses.forEach(t => {
    csvContent += `${t.date},"${t.description}",${t.category},${t.accountName},${t.amount}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `nova_report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};