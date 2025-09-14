# Construction Stock Management System

A comprehensive web-based inventory management system designed specifically for construction companies. This system helps manage construction materials, track inventory levels, allocate resources to projects, and generate detailed reports.

## Features

### 🏗️ Core Functionality
- **Inventory Management**: Track construction materials, tools, and equipment
- **Supplier Management**: Maintain supplier information and relationships
- **Project Management**: Create and manage construction projects
- **Inventory Allocation**: Allocate materials to specific projects
- **Transaction Tracking**: Record all inventory movements (in/out/transfers)
- **Low Stock Alerts**: Automatic notifications for items running low
- **Barcode Scanning**: Quick inventory updates using device camera

### 📊 Reporting & Analytics
- **Dashboard Overview**: Real-time insights into inventory status
- **Inventory Value Reports**: Track total inventory value by category
- **Category-wise Analysis**: Detailed breakdown by material categories
- **Supplier Performance**: Analyze supplier relationships and performance
- **Monthly Transaction Summary**: Track inventory movements over time
- **Project Allocation Reports**: Monitor resource allocation to projects

### 🔐 Security & Access Control
- **User Authentication**: Secure login system with JWT tokens
- **Role-based Access**: Admin, Manager, and User roles with different permissions
- **Session Management**: Secure session handling and token refresh

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Intuitive Interface**: Clean, modern design with easy navigation
- **Real-time Updates**: Live data updates and notifications
- **Search & Filtering**: Advanced search and filtering capabilities
- **Barcode Scanning**: Quick inventory updates using device camera

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database for data storage
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation

### Frontend
- **React 18** with modern hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Quagga** for barcode scanning
- **React Webcam** for camera access

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd construction-stock-management
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration
Create a `.env` file in the server directory:
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 4. Start the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```
This will start both the backend server (port 5000) and frontend development server (port 3000) concurrently.

#### Production Mode
```bash
# Build the frontend
npm run build

# Start the server
cd server
npm start
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Default Login Credentials

- **Username**: admin
- **Password**: admin123
- **Role**: Administrator

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### Inventory Management
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/alerts/low-stock` - Get low stock items

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/allocate` - Allocate inventory to project

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Record new transaction
- `GET /api/transactions/summary/overview` - Get transaction summary

### Reports
- `GET /api/reports/dashboard` - Get dashboard data
- `GET /api/reports/inventory-value` - Get inventory value report
- `GET /api/reports/category-wise` - Get category-wise report
- `GET /api/reports/supplier-performance` - Get supplier performance report

## Database Schema

The system uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **suppliers**: Supplier information
- **categories**: Inventory categories
- **inventory**: Inventory items and stock levels
- **projects**: Construction projects
- **project_allocations**: Inventory allocations to projects
- **transactions**: All inventory movements and transactions

## User Roles & Permissions

### Administrator
- Full access to all features
- Can create, edit, and delete all records
- Can manage users and system settings

### Manager
- Can manage inventory, suppliers, and projects
- Can record transactions
- Can view all reports
- Cannot delete critical records

### User
- Can view inventory and projects
- Can record basic transactions
- Limited access to reports

## Features in Detail

### Inventory Management
- Add/edit/delete inventory items
- Set minimum and maximum stock levels
- Track current stock quantities
- Monitor unit costs and total values
- Categorize items for better organization
- Assign items to suppliers

### Project Management
- Create and manage construction projects
- Set project budgets and timelines
- Track project status (active, completed, on-hold, cancelled)
- Allocate inventory items to specific projects
- Monitor resource usage per project

### Transaction Tracking
- Record stock movements (in, out, transfer, adjustment)
- Track transaction costs and reference numbers
- Link transactions to specific projects
- Maintain audit trail of all inventory changes
- Generate transaction reports

### Reporting System
- Real-time dashboard with key metrics
- Inventory value analysis by category
- Supplier performance evaluation
- Monthly transaction summaries
- Low stock alerts and notifications
- Project allocation reports

## Customization

### Adding New Categories
The system comes with default construction categories, but you can add custom categories through the database or by modifying the initialization script.

### Styling
The frontend uses Tailwind CSS, making it easy to customize the appearance by modifying the configuration in `client/tailwind.config.js`.

### Database
For production use, consider migrating from SQLite to PostgreSQL or MySQL for better performance and scalability.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the PORT in the server configuration
   - Kill existing processes using the ports

2. **Database Issues**
   - Delete `server/database.sqlite` to reset the database
   - Restart the server to reinitialize tables

3. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT_SECRET configuration

4. **Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please create an issue in the repository or contact the development team.

## Roadmap

### Planned Features
- [x] Barcode scanning for quick inventory updates
- [ ] Mobile app for field workers
- [ ] Advanced reporting with PDF export
- [ ] Integration with accounting systems
- [ ] Multi-location inventory management
- [ ] Automated reorder suggestions
- [ ] Email notifications for low stock
- [ ] Inventory forecasting and demand planning

---

**Built with ❤️ for Construction Companies**
