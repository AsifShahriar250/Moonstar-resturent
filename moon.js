const API_BASE = "http://localhost:4000/api";

function showMenu(id, btn) {
  document.querySelectorAll(".menu-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

  const panel = document.getElementById(id);
  if (panel) panel.classList.add("active");
  if (btn) btn.classList.add("active");
}

const cart = new Map();
let availableMenu = [];

const normalize = value => value
  .toLowerCase()
  .replace(/\s*\((half|full|option\s+\d+|\d+\s*")\)\s*$/i, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const money = value => `৳${Number(value).toLocaleString("en-US")}`;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function setupCartUI() {
  if (document.getElementById("moon-cart-toggle")) return;

  const toggle = document.createElement("button");
  toggle.id = "moon-cart-toggle";
  toggle.type = "button";
  toggle.innerHTML = '🛒 Your Order <span id="moon-cart-count">0</span>';
  toggle.addEventListener("click", openCart);
  document.body.appendChild(toggle);

  const modal = document.createElement("div");
  modal.id = "moon-cart-modal";
  modal.innerHTML = `
    <section class="moon-cart-dialog" role="dialog" aria-modal="true"
      aria-labelledby="moon-cart-heading">
      <button type="button" id="moon-cart-close" class="moon-cart-close"
        aria-label="Close order cart">×</button>
      <h2 id="moon-cart-heading">Your Order</h2>
      <div id="moon-cart-lines"></div>
      <div id="moon-cart-total">Total: ৳0</div>
      <form id="moon-checkout-form">
        <h3>Checkout</h3>
        <label>
          Your name *
          <input name="customerName" required minlength="2" maxlength="120"
            autocomplete="name" placeholder="Enter your name">
        </label>
        <label>
          Phone number *
          <input name="phone" required minlength="5" maxlength="30"
            autocomplete="tel" placeholder="Enter your phone number">
        </label>
        <label>
          Order notes (optional)
          <textarea name="notes" maxlength="2000"
            placeholder="Address or special instructions"></textarea>
        </label>
        <p id="moon-checkout-message" role="status"></p>
        <button type="submit" id="moon-place-order">Place Order</button>
      </form>
    </section>`;
  document.body.appendChild(modal);

  toggle.addEventListener("click", openCart);
  modal.querySelector("#moon-cart-close").addEventListener("click", closeCart);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeCart();
  });
  modal.querySelector("#moon-checkout-form").addEventListener("submit", submitOrder);

  renderCart();
}

function openCart() {
  document.getElementById("moon-cart-modal").classList.add("is-open");
  renderCart();
}

function closeCart() {
  document.getElementById("moon-cart-modal").classList.remove("is-open");
}

function addToCart(item) {
  const existing = cart.get(item.id);
  cart.set(item.id, {
    item,
    quantity: existing ? existing.quantity + 1 : 1
  });
  renderCart();

  const button = document.getElementById("moon-cart-toggle");
  button.classList.add("moon-cart-added");
  setTimeout(() => button.classList.remove("moon-cart-added"), 350);
}

function changeQuantity(id, delta) {
  const line = cart.get(id);
  if (!line) return;

  line.quantity += delta;
  if (line.quantity <= 0) cart.delete(id);
  renderCart();
}

function renderCart() {
  const count = [...cart.values()].reduce((sum, line) => sum + line.quantity, 0);
  const total = [...cart.values()].reduce(
    (sum, line) => sum + Number(line.item.price) * line.quantity, 0
  );

  const countNode = document.getElementById("moon-cart-count");
  if (countNode) countNode.textContent = count;

  const linesNode = document.getElementById("moon-cart-lines");
  if (!linesNode) return;

  if (cart.size === 0) {
    linesNode.innerHTML = '<p class="moon-cart-empty">Your cart is empty. Add something delicious from the menu.</p>';
  } else {
    linesNode.innerHTML = [...cart.values()].map(({ item, quantity }) => `
      <div class="moon-cart-line">
        <div class="moon-cart-line-info">
          <strong>${escapeHTML(item.name)}</strong>
          <span>${money(item.price)} each</span>
        </div>
        <div class="moon-quantity">
          <button type="button" data-id="${item.id}" data-delta="-1" aria-label="Decrease quantity">−</button>
          <span>${quantity}</span>
          <button type="button" data-id="${item.id}" data-delta="1" aria-label="Increase quantity">+</button>
        </div>
        <strong>${money(Number(item.price) * quantity)}</strong>
      </div>`).join("");

    linesNode.querySelectorAll("button[data-id]").forEach(button => {
      button.addEventListener("click", () =>
        changeQuantity(button.dataset.id, Number(button.dataset.delta))
      );
    });
  }

  document.getElementById("moon-cart-total").textContent = `Total: ${money(total)}`;
}

async function submitOrder(event) {
  event.preventDefault();

  const message = document.getElementById("moon-checkout-message");
  const submitButton = document.getElementById("moon-place-order");

  if (cart.size === 0) {
    message.textContent = "Please add at least one item to your order.";
    return;
  }

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    customerName: String(formData.get("customerName")).trim(),
    phone: String(formData.get("phone")).trim(),
    notes: String(formData.get("notes") || "").trim() || null,
    items: [...cart.values()].map(({ item, quantity }) => ({
      menuItemId: item.id,
      quantity
    }))
  };

  submitButton.disabled = true;
  message.textContent = "Submitting your order…";

  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Could not place the order. Please try again.");
    }

    cart.clear();
    renderCart();
    form.reset();
    message.textContent = "Order placed successfully! Thank you.";
  } catch (error) {
    message.textContent = error.message ||
      "Could not connect to the server. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
}

async function loadOrderableMenu() {
  setupCartUI();

  try {
    const response = await fetch(`${API_BASE}/menu/items?available=true`);
    if (!response.ok) throw new Error("Menu request failed");

    const result = await response.json();
    availableMenu = (result.data || []).filter(item =>
      item.isAvailable &&
      item.category?.isActive !== false &&
      item.name.trim().toLowerCase() !== "test"
    );

    const groups = new Map();
    availableMenu.forEach(item => {
      const key = normalize(item.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    document.querySelectorAll(".menu-item").forEach(card => {
      if (card.querySelector(".moon-order-controls")) return;

      const nameNode = card.querySelector(".menu-item-name");
      if (!nameNode) return;

      const matches = groups.get(normalize(nameNode.textContent || "")) || [];
      if (!matches.length) return;

      const controls = document.createElement("div");
      controls.className = "moon-order-controls";

      if (matches.length > 1) {
        const select = document.createElement("select");
        select.setAttribute("aria-label", `Choose size for ${nameNode.textContent.trim()}`);

        matches.forEach(item => {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = `${item.name.replace(/^.*?\s\(/, "").replace(/\)$/, "")} — ${money(item.price)}`;
          select.appendChild(option);
        });
        controls.appendChild(select);
      }

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "moon-add-button";
      addButton.textContent = "Add to order";
      addButton.addEventListener("click", () => {
        const select = controls.querySelector("select");
        const selectedId = select ? select.value : matches[0].id;
        const selectedItem = matches.find(item => item.id === selectedId);
        if (selectedItem) {
          addToCart(selectedItem);
          document.getElementById("moon-cart-toggle").focus();
        }
      });
      controls.appendChild(addButton);
      card.appendChild(controls);
    });
  } catch (error) {
    console.error("Could not load orderable menu:", error);
    const status = document.createElement("p");
    status.className = "moon-order-status";
    status.textContent = "Online ordering is temporarily unavailable. Please call 01301110777.";
    const menu = document.querySelector(".menu-panel.active .menu-grid");
    if (menu && !document.querySelector(".moon-order-status")) menu.prepend(status);
  }
}

document.addEventListener("DOMContentLoaded", loadOrderableMenu);
