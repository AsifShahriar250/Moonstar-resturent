import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
};

type ApiResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type Props = {
  onNotice: (message: string) => void;
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d9e2dc",
  borderRadius: "8px",
  boxSizing: "border-box" as const,
  font: "inherit",
};

const buttonStyle = {
  padding: "9px 14px",
  border: "1px solid #d9e2dc",
  borderRadius: "8px",
  cursor: "pointer",
  background: "#fff",
  font: "inherit",
};

export default function MenuManagement({ onNotice }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryResult, itemResult] = await Promise.all([
        apiRequest<ApiResult<Category[]>>("/menu/categories"),
        apiRequest<ApiResult<MenuItem[]>>("/menu/items"),
      ]);

      setCategories(categoryResult.data);
      setItems(itemResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional initial menu data fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  function resetItemForm() {
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    setCategoryId("");
    setEditingId(null);
    setShowItemForm(false);
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await apiRequest("/menu/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName }),
      });

      setCategoryName("");
      setShowCategoryForm(false);
      await loadData();
      onNotice("Category created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setBusy(true);
    setError("");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      imageUrl: imageUrl.trim() || null,
      categoryId,
    };

    try {
      if (editingId) {
        await apiRequest(`/menu/items/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/menu/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetItemForm();
      await loadData();
      onNotice(editingId ? "Menu item updated." : "Menu item created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save menu item.");
    } finally {
      setBusy(false);
    }
  }

  function editItem(item: MenuItem) {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.price));
    setImageUrl(item.imageUrl ?? "");
    setCategoryId(item.categoryId);
    setShowItemForm(true);
    setError("");
  }

  async function toggleAvailability(item: MenuItem) {
    setBusy(true);
    setError("");

    try {
      await apiRequest(`/menu/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update availability.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await apiRequest(`/menu/items/${item.id}`, { method: "DELETE" });
      await loadData();
      onNotice("Menu item deleted.");
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} If this item belongs to an order, deletion may be restricted.`
          : "Could not delete menu item.",
      );
    } finally {
      setBusy(false);
    }
  }

  const filteredItems = items.filter((item) =>
    `${item.name} ${item.category?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Menu management</h2>
          <p style={{ color: "#718078", margin: "6px 0 0" }}>
            Manage categories, prices and availability.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={() => setShowCategoryForm(!showCategoryForm)}>
            + Category
          </button>
          <button
            style={{ ...buttonStyle, background: "#147d50", color: "#fff", borderColor: "#147d50" }}
            onClick={() => {
              resetItemForm();
              setShowItemForm(true);
            }}
          >
            + Add menu item
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, background: "#fff0f0", color: "#a12626" }}>
          {error}
        </div>
      )}

      {showCategoryForm && (
        <form onSubmit={createCategory} style={{ ...inputStyle, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            style={{ ...inputStyle, flex: "1 1 220px" }}
            placeholder="Category name, e.g. Burgers"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <button style={buttonStyle} disabled={busy}>Save category</button>
          <button type="button" style={buttonStyle} onClick={() => setShowCategoryForm(false)}>Cancel</button>
        </form>
      )}

      {showItemForm && (
        <form onSubmit={saveItem} style={{ display: "grid", gap: 12, padding: 20, border: "1px solid #e1e8e3", borderRadius: 12, background: "#fff" }}>
          <h3 style={{ margin: 0 }}>{editingId ? "Edit menu item" : "New menu item"}</h3>
          <input style={inputStyle} placeholder="Item name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={160} required />
          <textarea style={inputStyle} placeholder="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={3} />
          <input style={inputStyle} type="number" placeholder="Price in BDT (৳)" value={price} onChange={(event) => setPrice(event.target.value)} min="0.01" max="99999999.99" step="0.01" required />
          <input style={inputStyle} type="url" placeholder="Image URL (optional; https://...)" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          <select style={inputStyle} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">Select category</option>
            {categories.filter((category) => category.isActive).map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...buttonStyle, background: "#147d50", color: "#fff" }} disabled={busy}>
              {busy ? "Saving..." : editingId ? "Update item" : "Create item"}
            </button>
            <button type="button" style={buttonStyle} onClick={resetItemForm}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, maxWidth: 360 }}
          placeholder="Search menu items or categories..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button style={buttonStyle} onClick={() => void loadData()} disabled={loading || busy}>
          Refresh
        </button>
        <span style={{ alignSelf: "center", color: "#718078" }}>
          {items.length} menu items · {categories.length} categories
        </span>
      </div>

      {loading ? (
        <p>Loading menu from database...</p>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", border: "1px dashed #cbd8cf", borderRadius: 12 }}>
          <h3>No menu items found</h3>
          <p style={{ color: "#718078" }}>
            {items.length === 0 ? "Create a category first, then add your first menu item." : "Try another search."}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e1e8e3", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#f7faf8" }}>
                {["Item", "Category", "Price", "Availability", "Actions"].map((heading) => (
                  <th key={heading} style={{ padding: 14, borderBottom: "1px solid #e1e8e3" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 14, borderBottom: "1px solid #edf1ee" }}>
                    <strong>{item.name}</strong>
                    {item.description && <div style={{ fontSize: 12, color: "#718078", marginTop: 4 }}>{item.description}</div>}
                  </td>
                  <td style={{ padding: 14, borderBottom: "1px solid #edf1ee" }}>{item.category?.name ?? "—"}</td>
                  <td style={{ padding: 14, borderBottom: "1px solid #edf1ee", whiteSpace: "nowrap" }}>৳{Number(item.price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: 14, borderBottom: "1px solid #edf1ee" }}>
                    <button style={buttonStyle} disabled={busy} onClick={() => void toggleAvailability(item)}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td style={{ padding: 14, borderBottom: "1px solid #edf1ee", whiteSpace: "nowrap" }}>
                    <button style={buttonStyle} disabled={busy} onClick={() => editItem(item)}>Edit</button>{" "}
                    <button style={{ ...buttonStyle, color: "#b42318" }} disabled={busy} onClick={() => void deleteItem(item)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
