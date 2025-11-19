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

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

//   Code Given to Me from Class

const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };
// LoadExpenses: Reading Rows from SQLite

const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      // Basic validation: ignore invalid or non-positive amounts
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();

    if (!trimmedCategory) {
      // Category is required
      return;
    }

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note) VALUES (?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null]
    );

    setAmount('');
    setCategory('');
    setNote('');

    loadExpenses();
  };
//AddExpense: Inserting Rows into SQLite