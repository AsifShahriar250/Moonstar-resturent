import { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Users,
  ChartNoAxesCombined, Settings, Search, Bell, ChevronDown,
  ArrowUpRight, ArrowDownRight,
  CircleDollarSign, TrendingUp, MoreHorizontal, Menu, X,
  Plus, Download, ChefHat, LogOut, CalendarDays, Eye,
} from "lucide-react";
import "./App.css";
import MenuManagement from "./components/MenuManagement";
import OrdersManagement from "./components/OrdersManagement";
import DashboardLive from "./components/DashboardLive";

type Order = {
  id: string;
  customer: string;
  initials: string;
  item: string;
  date: string;
  amount: number;
  status: "Completed" | "Preparing" | "Pending" | "Cancelled";
};

const orders: Order[] = [
  { id: "#MS-1048", customer: "Sarah Johnson", initials: "SJ", item: "Chicken Burger × 2", date: "Today, 10:42 AM", amount: 580, status: "Completed" },
  { id: "#MS-1047", customer: "Michael Chen", initials: "MC", item: "Margherita Pizza × 1", date: "Today, 10:35 AM", amount: 750, status: "Preparing" },
  { id: "#MS-1046", customer: "Emma Wilson", initials: "EW", item: "Pasta Alfredo × 2", date: "Today, 10:21 AM", amount: 960, status: "Pending" },
  { id: "#MS-1045", customer: "James Taylor", initials: "JT", item: "Classic Beef Burger × 1", date: "Today, 09:58 AM", amount: 420, status: "Completed" },
  { id: "#MS-1044", customer: "Olivia Martin", initials: "OM", item: "Grilled Chicken × 1", date: "Today, 09:41 AM", amount: 680, status: "Cancelled" },
];

const menuItems = [
  { name: "Classic Beef Burger", category: "Burgers", price: "৳420", sold: 128, color: "peach", icon: "🍔" },
  { name: "Margherita Pizza", category: "Pizza", price: "৳750", sold: 96, color: "yellow", icon: "🍕" },
  { name: "Pasta Alfredo", category: "Pasta", price: "৳480", sold: 84, color: "purple", icon: "🍝" },
];

const navGroups = [
  {
    label: "MAIN MENU",
    items: [
      { label: "Overview", icon: LayoutDashboard },
      { label: "Orders", icon: ShoppingBag, count: "8" },
      { label: "Menu Items", icon: UtensilsCrossed },
      { label: "Customers", icon: Users },
    ],
  },
  {
    label: "ANALYTICS",
    items: [{ label: "Reports", icon: ChartNoAxesCombined }],
  },
];

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
};

function App({ user, onLogout }: { user: AuthenticatedUser; onLogout: () => void }) {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Last 7 days");
  const [notice, setNotice] = useState("");

  const filteredOrders = orders.filter((order) =>
    `${order.id} ${order.customer} ${order.item} ${order.status}`
      .toLowerCase().includes(query.toLowerCase())
  );

  function selectPage(label: string) {
    setActive(label);
    setMobileOpen(false);
    if (label !== "Overview") {
      setNotice(`${label} page is ready for API integration.`);
    } else {
      setNotice("");
    }
  }

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ChefHat size={25} strokeWidth={2.1} /></div>
          <div className="brand-copy">
            <span className="brand-name">moonstar<span>.</span></span>
            <span className="brand-subtitle">RESTAURANT ADMIN</span>
          </div>
          <button className="icon-button mobile-close" aria-label="Close sidebar" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>

        <div className="restaurant-switch">
          <div className="restaurant-avatar"><UtensilsCrossed size={18} /></div>
          <div className="restaurant-info"><strong>Moonstar Kitchen</strong><span>Restaurant account</span></div>
          <ChevronDown size={15} className="switch-chevron" />
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-heading">{group.label}</p>
              {group.items.map(({ label, icon: Icon, count }) => (
                <button
                  key={label}
                  className={`nav-item ${active === label ? "nav-item-active" : ""}`}
                  onClick={() => selectPage(label)}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{label}</span>
                  {count && <span className="nav-count">{count}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <div className="support-icon"><ChefHat size={19} /></div>
            <strong>Need a hand?</strong>
            <p>Manage your restaurant with confidence.</p>
            <button onClick={() => setNotice("Support options will be connected soon.")}>Get support <ArrowUpRight size={14} /></button>
          </div>
          <button className={`nav-item settings-item ${active === "Settings" ? "nav-item-active" : ""}`} onClick={() => selectPage("Settings")}>
            <Settings size={19} /><span>Settings</span>
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
            <div className="user-details"><strong>{user.name}</strong><span>{user.role === "ADMIN" ? "Administrator" : "Staff"}</span></div>
            <button className="icon-button logout-button" aria-label="Account menu" onClick={onLogout}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div className="breadcrumbs"><span>Pages</span><span className="crumb-divider">/</span><strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input aria-label="Search orders" placeholder="Search orders..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You are all caught up.")}>
              <Bell size={19} /><span className="notification-dot" />
            </button>
            <div className="topbar-divider" />
            <button className="profile-button" onClick={() => setNotice("Profile settings will be connected soon.")}>
              <div className="user-avatar profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
              <div className="profile-text"><strong>{user.name}</strong><span>{user.role === "ADMIN" ? "Administrator" : "Staff"}</span></div>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {active !== "Overview" && active !== "Orders" && active !== "Menu Items" && (
            <div className="demo-banner">
              <span className="demo-dot" />
              Preview mode · Sample data
              <span className="demo-banner-right">This section is not connected yet</span>
            </div>
          )}

          {notice && (
            <div className="notice-banner">
              <span>{notice}</span>
              <button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16} /></button>
            </div>
          )}

          {active === "Overview" ? <DashboardLive /> : active === "Orders" ? <OrdersManagement onNotice={setNotice} /> : active === "Menu Items" ? <MenuManagement onNotice={setNotice} /> : (
          <>
          <section className="welcome-row">
            <div>
              <p className="eyebrow">TUESDAY, OCTOBER 13, 2026</p>
              <h1>{active === "Overview" ? "Good morning, Admin 👋" : active}</h1>
              <p className="page-description">
                {active === "Overview" ? "Here's what's happening at your restaurant today." : `Manage your restaurant's ${active.toLowerCase()} from here.`}
              </p>
            </div>
            <div className="welcome-actions">
              <button className="button button-secondary" onClick={() => setNotice("Report export will be available after reports integration.")}><Download size={16} /> Export</button>
              <button className="button button-primary" onClick={() => selectPage("Menu Items")}><Plus size={17} /> Add menu item</button>
            </div>
          </section>

          <section className="stats-grid" aria-label="Business overview">
            <StatCard title="Total Revenue" value="৳48,290" change="+12.8%" positive icon={<CircleDollarSign size={21} />} tone="green" detail="vs. previous 7 days" />
            <StatCard title="Total Orders" value="248" change="+8.2%" positive icon={<ShoppingBag size={21} />} tone="blue" detail="vs. previous 7 days" />
            <StatCard title="Active Customers" value="186" change="+5.4%" positive icon={<Users size={21} />} tone="purple" detail="vs. previous 7 days" />
            <StatCard title="Avg. Order Value" value="৳194.72" change="-2.1%" positive={false} icon={<TrendingUp size={21} />} tone="orange" detail="vs. previous 7 days" />
          </section>

          <section className="middle-grid">
            <div className="panel revenue-panel">
              <div className="panel-header">
                <div><h2>Revenue overview</h2><p>Track your restaurant's earnings</p></div>
                <button className="select-button" onClick={() => setPeriod(period === "Last 7 days" ? "Last 30 days" : "Last 7 days")}><CalendarDays size={15} /> {period} <ChevronDown size={14} /></button>
              </div>
              <div className="revenue-total"><strong>৳48,290</strong><span className="trend-pill"><ArrowUpRight size={14} /> 12.8%</span></div>
              <p className="chart-caption">Revenue for {period.toLowerCase()}</p>
              <div className="chart-wrap">
                <div className="chart-y-labels"><span>৳12k</span><span>৳9k</span><span>৳6k</span><span>৳3k</span><span>৳0</span></div>
                <div className="chart-area">
                  <div className="chart-gridlines"><i /><i /><i /><i /><i /></div>
                  <svg className="revenue-chart" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label="Sample revenue trend chart">
                    <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a36a" stopOpacity=".22" /><stop offset="100%" stopColor="#16a36a" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 155 C30 145 40 160 70 132 S120 115 145 127 S190 150 220 104 S270 117 300 91 S345 105 370 80 S420 95 445 59 S490 80 520 65 S560 91 590 43 S640 56 665 25 L700 37 L700 210 L0 210 Z" fill="url(#revenueFill)" />
                    <path d="M0 155 C30 145 40 160 70 132 S120 115 145 127 S190 150 220 104 S270 117 300 91 S345 105 370 80 S420 95 445 59 S490 80 520 65 S560 91 590 43 S640 56 665 25 L700 37" fill="none" stroke="#16a36a" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                    <circle cx="590" cy="43" r="5" fill="#fff" stroke="#16a36a" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="chart-x-labels"><span>Oct 7</span><span>Oct 8</span><span>Oct 9</span><span>Oct 10</span><span>Oct 11</span><span>Oct 12</span><span>Oct 13</span></div>
                </div>
              </div>
            </div>

            <div className="panel order-summary-panel">
              <div className="panel-header"><div><h2>Order summary</h2><p>Today's order status</p></div><button className="icon-button" aria-label="More order summary options" onClick={() => setNotice("Order summary uses sample data.")}><MoreHorizontal size={21} /></button></div>
              <div className="order-summary-total"><strong>32</strong><span>Orders today</span></div>
              <div className="summary-progress"><span style={{ width: "63%" }} /><span style={{ width: "22%" }} /><span style={{ width: "15%" }} /></div>
              <div className="summary-legend">
                <div><span className="legend-dot completed-dot" /><span>Completed</span><strong>20</strong></div>
                <div><span className="legend-dot preparing-dot" /><span>Preparing</span><strong>7</strong></div>
                <div><span className="legend-dot pending-dot" /><span>Pending</span><strong>5</strong></div>
              </div>
              <button className="text-link" onClick={() => selectPage("Orders")}>View all orders <ArrowUpRight size={15} /></button>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel orders-panel">
              <div className="panel-header orders-heading">
                <div><h2>Recent orders</h2><p>Keep track of your latest orders</p></div>
                <button className="text-link" onClick={() => selectPage("Orders")}>View all <ArrowUpRight size={15} /></button>
              </div>
              <div className="table-scroll">
                <table className="orders-table">
                  <thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>ITEM</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td><span className="order-id">{order.id}</span><span className="order-date">{order.date}</span></td>
                        <td><div className="customer-cell"><span className="customer-avatar">{order.initials}</span><strong>{order.customer}</strong></div></td>
                        <td className="item-cell">{order.item}</td>
                        <td className="amount-cell">৳{order.amount.toLocaleString("en-BD")}</td>
                        <td><span className={`status-badge status-${order.status.toLowerCase()}`}><span />{order.status}</span></td>
                        <td><button className="icon-button row-action" aria-label={`View ${order.id}`} onClick={() => setNotice(`Order ${order.id} detail view will be connected to the backend.`)}><Eye size={16} /></button></td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && <tr><td colSpan={6} className="empty-cell">No matching orders found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel popular-panel">
              <div className="panel-header"><div><h2>Popular items</h2><p>Your best sellers</p></div><button className="icon-button" aria-label="Menu options" onClick={() => selectPage("Menu Items")}><ArrowUpRight size={18} /></button></div>
              <div className="popular-list">
                {menuItems.map((item, index) => (
                  <div className="popular-item" key={item.name}>
                    <div className={`food-thumb food-${item.color}`}>{item.icon}</div>
                    <div className="popular-details"><strong>{item.name}</strong><span>{item.category} · {item.sold} sold</span><div className="popular-bar"><i style={{ width: `${100 - index * 18}%` }} /></div></div>
                    <strong className="popular-price">{item.price}</strong>
                  </div>
                ))}
              </div>
              <button className="button button-secondary manage-menu-button" onClick={() => selectPage("Menu Items")}>Manage menu <ArrowUpRight size={15} /></button>
            </div>
          </section>

          <footer className="page-footer"><span>© 2026 Moonstar Restaurant</span><span><span className="footer-status" /> Admin dashboard <span className="footer-separator">·</span> Preview mode</span></footer>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, change, positive, icon, tone, detail }: {
  title: string; value: string; change: string; positive: boolean;
  icon: React.ReactNode; tone: string; detail: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top"><span className={`stat-icon stat-${tone}`}>{icon}</span><button className="icon-button stat-more" aria-label={`${title} information`}><MoreHorizontal size={19} /></button></div>
      <p className="stat-title">{title}</p>
      <div className="stat-value-row"><strong>{value}</strong><span className={`change-pill ${positive ? "change-positive" : "change-negative"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span></div>
      <p className="stat-detail">{detail}</p>
    </article>
  );
}

export default App;
