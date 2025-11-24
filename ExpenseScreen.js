import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

// EXPORT
export default function ExpenseScreen() {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('all'); // Added for Filter
  const [total, setTotal] = useState(0); //Added for Total Spending
  const [categoryTotals, setCategoryTotals] = useState([]); // Added for Category Totals
  const [editingId, setEditingId] = useState(null); //Added for Editing Mode
  const [editing, setEditing] = useState(null); // Added for Editing State
  const [editAmount, setEditAmount] = useState(" "); // Added for Edit Amount
  const [editCategory, setEditCategory] = useState(" "); // Added for Edit Category
  const [editNote, setEditNote] = useState(" "); // Added for Edit Note

// LOAD EXPENSES
const loadAnalytics = async (mode = filter) => {
  let where = "";
  
  if (mode === "week") {
    where = `
      WHERE strftime('%W', date) = strftime('%W', 'now')
      AND strftime('%Y', date) = strftime('%Y', 'now')
    `;
  }

  if (mode === "month") {
    where = `
      WHERE strftime('%m', date) = strftime('%m', 'now')
      AND strftime('%Y', date) = strftime('%Y', 'now')
    `;
  }

  //Total Spending 
   const totalRow = await db.getFirstAsync(`
    SELECT SUM(amount) as total FROM expenses
    ${where};
  `);

  setTotal(totalRow?.total || 0);

  //Category Totals
  const categoryRows = await db.getAllAsync(`
    SELECT category, SUM(amount) as total
    FROM expenses
    ${where}
    GROUP BY category
    ORDER BY total DESC;
  `);

  setCategoryTotals(categoryRows);
  };

  //Load Expenses Function
  const loadExpenses = async (mode = filter) => {
    let query = "SELECT * FROM expenses ORDER BY id DESC;";

  if (mode === "week") {
    query = `
      SELECT * FROM expenses
      WHERE strftime('%W', date) = strftime('%W', 'now')
      AND strftime('%Y', date) = strftime('%Y', 'now')
      ORDER BY id DESC;
    `;
  }

  if (mode === "month") {
    query = `
      SELECT * FROM expenses
      WHERE strftime('%m', date) = strftime('%m', 'now')
      AND strftime('%Y', date) = strftime('%Y', 'now')
      ORDER BY id DESC;
    `;
  }

 // Load the filtered expense rows
  const rows = await db.getAllAsync(query);
  setExpenses(rows);

  await loadAnalytics(mode); // Load analytics data
  };

  //Add Expense
  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) return;

    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;

    const trimmedNote = note.trim();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
    if (editingId !== null) {
      await db.runAsync(
      'UPDATE expenses SET amount = ?, category = ?, note = ?, date = ? WHERE id = ?;',
      [amountNumber, trimmedCategory, trimmedNote || null, today, editingId]
    );

    // Reset Form
    setEditingId(null);
    setAmount('');
    setCategory('');
    setNote('');

    loadExpenses(filter);
    return;
  }

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null, today]
    );
    
    setAmount("");
    setCategory("");
    setNote("");

    loadExpenses(filter);
  };

  // Update Expense
  const updateExpense = async () => {
  const amountNumber = parseFloat(amount);

  if (isNaN(amountNumber) || amountNumber <= 0) return;

  const trimmedCategory = category.trim();
  if (!trimmedCategory) return;

  const trimmedNote = note.trim();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  await db.runAsync(
    `UPDATE expenses
     SET amount = ?, category = ?, note = ?, date = ?
     WHERE id = ?;`,
    [amountNumber, trimmedCategory, trimmedNote || null, today, editingId]
  );

  setEditingId(null); // close modal
  setAmount('');
  setCategory('');
  setNote('');

  loadExpenses(filter); // refresh list + totals
};

  // Delete Expense
  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses(filter);
  };

  // Render Expense Row
  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
      </View>

      {/* EDIT BUTTON */}
      <TouchableOpacity style={{ marginRight: 12 }} onPress={() => {
        setEditingId(item.id)
        setAmount(String(item.amount));
        setCategory(item.category);
        setNote(item.note || "");
      }}
      >
        <Text style={{ color: "#60a5fa", fontSize: 18 }}>✎</Text>
      </TouchableOpacity>

      {/* DELETE BUTTON */}
      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );


// Alterd CREATE TABLE for Date Addition
  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL
        );
      `);

      await loadExpenses();
    };

    setup();
  }, []);

// Return JSX
return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      {/* ADDING a filter buttons to the UI */}
      <View style={styles.filterRow}>
        <Button title="All" onPress={() => { setFilter("all"); loadExpenses("all"); }} />
        <Button title="This Week" onPress={() => { setFilter("week"); loadExpenses("week"); }} />
        <Button title="This Month" onPress={() => { setFilter("month"); loadExpenses("month"); }} />
      </View>
      {/* END */}

      {/* Show Total Spending in the UI */}
      <Text style={styles.totalText}>
        Total Spending ({filter === "all" ? "All" : filter === "week" ? "This Week" : "This Month"}): ${total.toFixed(2)}
      </Text>
      {/* END */}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor="#9ca3af"
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
        />
        <Button title={editingId ? "Save Changes" : "Add Expense"} 
        onPress={editingId ? updateExpense : addExpense}/>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <View style={styles.analyticsBox}>
       <Text style={styles.analyticsHeading}>
         Total Spending ({filter === "all" ? "All" : filter === "week" ? "This Week" : "This Month"}):
       </Text>
      <Text style={styles.analyticsTotal}>${total.toFixed(2)}</Text>

       <Text style={styles.analyticsHeading}>By Category:</Text>
        {categoryTotals.length === 0 ? (
      <Text style={styles.analyticsEmpty}>No spending in this period.</Text>) : (categoryTotals.map((row) => (
      <Text key={row.category} style={styles.analyticsCategory}>
        {row.category}: ${Number(row.total).toFixed(2)}
      </Text>
         ))
          )}
      </View>


      <Text style={styles.footer}>
        Enter your expenses and theyll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}


  // STYLE ------------------------------------------
  const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#111827' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expenseCategory: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  expenseNote: {
    fontSize: 12,
    color: '#9ca3af',
  },
  delete: {
    color: '#f87171',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: '#9ca3af',
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 12,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  totalText: {
    color: "#fbbf24",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  analyticsBox: {
  marginTop: 20,
  padding: 16,
  backgroundColor: "#1f2937",
  borderRadius: 8,
},
analyticsHeading: {
  color: "#fbbf24",
  fontSize: 16,
  fontWeight: "700",
  marginBottom: 8,
},
analyticsTotal: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 16,
},
analyticsCategory: {
  color: "#e5e7eb",
  fontSize: 14,
  marginBottom: 4,
},
analyticsEmpty: {
  color: "#9ca3af",
  fontSize: 12,
},
});

