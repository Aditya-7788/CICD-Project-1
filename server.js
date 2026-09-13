const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data', 'savingsEntries.json');

const defaultEntries = [
  {
    id: 1,
    title: 'Monthly Salary',
    amount: 2500,
    date: '2026-09-01',
    category: 'Salary',
    type: 'income',
    notes: 'Primary salary deposit'
  },
  {
    id: 2,
    title: 'Groceries',
    amount: 180,
    date: '2026-09-02',
    category: 'Food',
    type: 'expense',
    notes: 'Weekly grocery shopping'
  },
  {
    id: 3,
    title: 'Online Shopping',
    amount: 95,
    date: '2026-09-05',
    category: 'Shopping',
    type: 'expense',
    notes: 'Books and accessories'
  }
];

function ensureDataFile() {
  const dataDirectory = path.dirname(DATA_FILE);

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultEntries, null, 2));
  }
}

function loadEntries() {
  ensureDataFile();

  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const parsedData = JSON.parse(rawData);

    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error('Unable to read saved data. Loading default data instead.', error.message);
    return [...defaultEntries];
  }
}

function saveEntries(entries) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

let savingsEntries = loadEntries();

// Express configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString) {
  const parsedDate = new Date(`${dateString}T00:00:00`);

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function getSummary(entries) {
  const totalIncome = entries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const currentBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    currentBalance
  };
}

function determineEntryType(category, type) {
  if (type === 'income' || type === 'expense') {
    return type;
  }

  const incomeCategories = ['salary', 'bonus', 'freelance', 'gift'];
  return incomeCategories.includes((category || '').toLowerCase()) ? 'income' : 'expense';
}

function getTopCategory(entries) {
  if (entries.length === 0) {
    return 'N/A';
  }

  const categoryTotals = entries.reduce((accumulator, entry) => {
    accumulator[entry.category] = (accumulator[entry.category] || 0) + entry.amount;
    return accumulator;
  }, {});

  const [topCategory] = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return topCategory || 'N/A';
}

function getSavingsRate(totalIncome, currentBalance) {
  if (totalIncome === 0) {
    return 0;
  }

  return Math.round((currentBalance / totalIncome) * 100);
}

// GET / - show dashboard with all entries and total balance.
app.get('/', (req, res) => {
  const searchQuery = (req.query.search || '').trim().toLowerCase();
  const selectedType = req.query.type || 'all';

  const filteredEntries = savingsEntries.filter((entry) => {
    const matchesType = selectedType === 'all' || entry.type === selectedType;
    const searchableText = `${entry.title} ${entry.category} ${entry.notes || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || searchableText.includes(searchQuery);

    return matchesType && matchesSearch;
  });

  const summary = getSummary(savingsEntries);

  res.render('dashboard', {
    entries: filteredEntries,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    currentBalance: summary.currentBalance,
    totalTransactions: savingsEntries.length,
    topCategory: getTopCategory(savingsEntries),
    savingsRate: getSavingsRate(summary.totalIncome, summary.currentBalance),
    formatINR,
    formatDate,
    searchQuery,
    selectedType
  });
});

// POST /add - add new saving entry.
app.post('/add', (req, res) => {
  const { title, amount, date, category, type, notes } = req.body;

  if (!title || !amount || !date || !category) {
    return res.status(400).send('Please complete all form fields.');
  }

  const parsedAmount = Number(amount);

  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).send('Please enter a valid amount greater than 0.');
  }

  const normalizedType = determineEntryType(category, type);

  const newEntry = {
    id: Date.now(),
    title: title.trim(),
    amount: parsedAmount,
    date,
    category: category.trim(),
    type: normalizedType,
    notes: notes ? notes.trim() : ''
  };

  savingsEntries.unshift(newEntry);
  saveEntries(savingsEntries);

  res.redirect('/');
});

// POST /delete/:id - delete an entry.
app.post('/delete/:id', (req, res) => {
  const entryId = Number(req.params.id);

  savingsEntries = savingsEntries.filter((entry) => entry.id !== entryId);
  saveEntries(savingsEntries);

  res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Savings Manager is running on http://0.0.0.0:${PORT}`);
});
