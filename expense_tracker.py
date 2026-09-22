"""Student expense tracker: add, categorize, total, and delete expenses."""

import sqlite3
from datetime import date

DB_FILE = "expenses.db"

CATEGORIES = ["Food", "Transport", "Books", "Housing", "Entertainment", "Other"]


def connect(db_file=DB_FILE):
    conn = sqlite3.connect(db_file)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS expenses (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               description TEXT NOT NULL,
               category TEXT NOT NULL,
               amount REAL NOT NULL,
               spent_on TEXT NOT NULL
           )"""
    )
    conn.commit()
    return conn


def add_expense(conn, description, category, amount, spent_on=None):
    spent_on = spent_on or date.today().isoformat()
    cur = conn.execute(
        "INSERT INTO expenses (description, category, amount, spent_on) VALUES (?, ?, ?, ?)",
        (description, category, amount, spent_on),
    )
    conn.commit()
    return cur.lastrowid


def list_expenses(conn, category=None):
    if category:
        return conn.execute(
            "SELECT id, description, category, amount, spent_on FROM expenses "
            "WHERE category = ? ORDER BY spent_on, id",
            (category,),
        ).fetchall()
    return conn.execute(
        "SELECT id, description, category, amount, spent_on FROM expenses ORDER BY spent_on, id"
    ).fetchall()


def total_spending(conn):
    total = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses").fetchone()[0]
    by_category = conn.execute(
        "SELECT category, SUM(amount) FROM expenses GROUP BY category ORDER BY SUM(amount) DESC"
    ).fetchall()
    return total, by_category


def delete_expense(conn, expense_id):
    cur = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    return cur.rowcount > 0


def prompt_category():
    print("Categories:")
    for i, name in enumerate(CATEGORIES, 1):
        print("  %d. %s" % (i, name))
    choice = input("Choose a category (number or name): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(CATEGORIES):
        return CATEGORIES[int(choice) - 1]
    return choice.title() or "Other"


def prompt_amount():
    while True:
        raw = input("Amount: ").strip()
        try:
            amount = float(raw)
        except ValueError:
            print("Please enter a number, e.g. 12.50")
            continue
        if amount <= 0:
            print("Amount must be greater than zero.")
            continue
        return amount


def print_expenses(rows):
    if not rows:
        print("No expenses recorded yet.")
        return
    print("%-4s %-24s %-14s %10s  %s" % ("ID", "Description", "Category", "Amount", "Date"))
    for row in rows:
        print("%-4d %-24s %-14s %10.2f  %s" % row)


def do_add(conn):
    description = input("Description: ").strip()
    if not description:
        print("Description cannot be empty.")
        return
    category = prompt_category()
    amount = prompt_amount()
    expense_id = add_expense(conn, description, category, amount)
    print("Added expense #%d." % expense_id)


def do_view(conn):
    print_expenses(list_expenses(conn))
    total, by_category = total_spending(conn)
    print("\nTotal spending: %.2f" % total)
    for category, subtotal in by_category:
        print("  %-14s %10.2f" % (category, subtotal))


def do_delete(conn):
    print_expenses(list_expenses(conn))
    raw = input("ID to delete: ").strip()
    if not raw.isdigit():
        print("Please enter a valid ID.")
        return
    if delete_expense(conn, int(raw)):
        print("Deleted expense #%s." % raw)
    else:
        print("No expense with ID %s." % raw)


MENU = """
Student Expense Tracker
1. Add an expense
2. View expenses and total spending
3. View expenses by category
4. Delete an expense
5. Quit"""


def main():
    conn = connect()
    try:
        while True:
            print(MENU)
            choice = input("Choose an option: ").strip()
            if choice == "1":
                do_add(conn)
            elif choice == "2":
                do_view(conn)
            elif choice == "3":
                print_expenses(list_expenses(conn, prompt_category()))
            elif choice == "4":
                do_delete(conn)
            elif choice in ("5", "q", "quit", "exit"):
                print("Goodbye.")
                break
            else:
                print("Unknown option, please pick 1-5.")
    except (EOFError, KeyboardInterrupt):
        print("\nGoodbye.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
