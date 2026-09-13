const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

// In-memory data storage for entries.
let savingsEntries = [
  {
    id: 1,
    title: 'Monthly Salary',
    amount: 2500,
    date: '2026-09-01',
    category: 'Salary',
    type: 'income'
  },
  {
    id: 2,
    title: 'Groceries',
    amount: 180,
    date: '2026-09-02',
    category: 'Food',
    type: 'expense'
  },
  {
    id: 3,
    title: 'Online Shopping',
    amount: 95,
    date: '2026-09-05',
    category: 'Shopping',
    type: 'expense'
  }
];

// Express configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

function determineEntryType(category) {
  const incomeCategories = ['salary', 'bonus', 'freelance', 'gift'];
  return incomeCategories.includes(category.toLowerCase()) ? 'income' : 'expense';
}

// GET / - show dashboard with all entries and total balance.
app.get('/', (req, res) => {
  const summary = getSummary(savingsEntries);

  res.render('dashboard', {
    entries: savingsEntries,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    currentBalance: summary.currentBalance
  });
});

// POST /add - add new saving entry.
app.post('/add', (req, res) => {
  const { title, amount, date, category } = req.body;

  if (!title || !amount || !date || !category) {
    return res.status(400).send('Please complete all form fields.');
  }

  const parsedAmount = Number(amount);

  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).send('Please enter a valid amount greater than 0.');
  }

  const newEntry = {
    id: Date.now(),
    title: title.trim(),
    amount: parsedAmount,
    date,
    category: category.trim(),
    type: determineEntryType(category)
  };

  savingsEntries.unshift(newEntry);

  res.redirect('/');
});

// POST /delete/:id - delete an entry.
app.post('/delete/:id', (req, res) => {
  const entryId = Number(req.params.id);

  savingsEntries = savingsEntries.filter((entry) => entry.id !== entryId);

  res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Savings Manager is running on http://0.0.0.0:${PORT}`);
});
