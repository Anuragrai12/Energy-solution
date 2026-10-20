# Energy Solution - Admin Panel (HTML / CSS / JS)

Pure web-based Admin Panel built with vanilla **HTML5, CSS3, and JavaScript** (no build tools, no TSX required).

---

## 🚀 Features

1. **Dashboard Overview & Stats**:
   - Total Reports Generated
   - Total Users / Customers
   - Assigned Reports Count
   - Unassigned / Pending Reports Count
   - Recent Reports quick-table

2. **Oil Reports Management**:
   - Live list of all generated oil reports
   - Search by Sample ID, Customer name, Equipment, or Assignee
   - Filter by status (All, Assigned to Customer, Unassigned)
   - **View Details**: Full analysis breakdown (Sample data, Lubricant & Wear condition badges, Recommendations, Test results table)
   - **Download / Preview PDF**: Direct in-browser PDF preview and file download
   - **Assign / Reassign**: Select any customer account to assign reports
   - **Unassign**: Unlink a report from a customer
   - **Delete Report**: Permanent deletion with confirmation

3. **Users & Customers Management**:
   - Live list of all registered users & administrators
   - Search by Name, Email, or Role
   - Filter by Role (Customer, Admin)
   - Report count indicator per customer
   - **+ Create New User**: Modal form to add a new customer or admin account
   - **Delete User**: Deletes user and automatically unassigns their linked reports

4. **Admin Account Security**:
   - **Change Admin Password**: Securely update admin password directly from the panel
   - Automatic session update with new credentials

5. **API Connection Settings**:
   - Configurable API Base URL (defaults to `https://brocode.fun/api`)
   - Connection test button
   - Remembers settings in browser `localStorage`

---

## 💻 How to Run

### Method 1: Direct File Open
Simply double-click `index.html` in your file explorer to open it in Chrome, Edge, Firefox, or Safari.

### Method 2: Local HTTP Server (Recommended)
From PowerShell / Terminal:
```bash
# Using Python
python -m http.server 8080

# Or using npx
npx serve .
```
Then open `http://localhost:8080` in your browser.

---

## 🔑 Backend Deployment

Make sure the following PHP files are uploaded to your hosting server (e.g. `https://brocode.fun/api/`):
- `oil_reports.php` (Enhanced with actions: `stats`, `list_all`, `list_users`, `create_user`, `change_password`, `delete_report`, `unassign`, `delete_user`, `get`, `download`, `assign`, `save`)
- `login.php`
- `reports_auth.php`
- `db.php`
- `schema.sql` (Executed on MySQL database)
