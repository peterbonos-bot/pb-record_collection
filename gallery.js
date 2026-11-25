"use strict";

const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const format = document.querySelector("#format");
const records = document.querySelector("#records");
const statusLine = document.querySelector("#status");
const featured = document.querySelector("#featured");
const detail = document.querySelector("dialog");
const collator = new Intl.Collator("en", { sensitivity: "base" });
let inventory = [];
let visible = [];
const media = document.querySelector("#media");
const genre = document.querySelector("#genre");
const selectVisible = document.querySelector("#select-visible");
const openRequests = document.querySelector("#open-requests");
const requests = document.querySelector("#requests");
const fulfillment = document.querySelector("#fulfillment");
const noteField = document.querySelector("#request-note");
const email = document.querySelector("#email-request");
const copy = document.querySelector("#copy-request");
const download = document.querySelector("#download-request");
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const selectionKey = "pb-record-requests-v1";
let selected = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(selectionKey));
  if (Array.isArray(saved)) selected = new Set(saved.filter(Number.isSafeInteger));
} catch {}


function normalize(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function coverImage(record, lazy) {
  const image = document.createElement("img");
  image.src = record.file;
  image.alt = "";
  image.width = record.width;
  image.height = record.height;
  image.decoding = "async";
  if (lazy) image.loading = "lazy";
  return image;
}

function showCover(record) {
  const image = detail.querySelector("img");
  image.src = record.file;
  image.alt = `Front cover of ${record.title}`;
  detail.querySelector("h2").textContent = record.title;
  detail.querySelector(".detail-artist").textContent = [record.artist, record.format, record.catalog].filter(Boolean).join(" · ");
  const note = detail.querySelector(".detail-note");
  note.textContent = record.note || "";
  note.hidden = !record.note;
  const listing = detail.querySelector(".detail-listing");
  listing.hidden = !record.listing;
  if (record.listing) listing.href = record.listing;
  detail.querySelector(".detail-source").href = record.source;
  detail.showModal();
}

function makeCard(record) {
  const card = document.createElement("li");
  card.className = "record";
  const artwork = document.createElement(record.file ? "button" : "div");
  artwork.className = "artwork";
  if (record.file) {
    artwork.type = "button";
    artwork.setAttribute("aria-label", `View cover for ${record.title}`);
    artwork.append(coverImage(record, true));
    artwork.addEventListener("click", () => showCover(record));
  } else {
    if (record.listing) {
      const link = document.createElement("a");
      link.href = record.listing;
      link.textContent = "Discogs listing";
      artwork.append(link);
    } else {
      artwork.textContent = "Cover pending";
    }
  }
  const title = document.createElement("h2");
  title.textContent = record.title;
  const artist = document.createElement("p");
  artist.textContent = [record.artist, record.format, record.catalog].filter(Boolean).join(" · ");
  const price = typeof record.price === "number" ? dollars.format(record.price) : "Price on request";
  const info = document.createElement("p");
  info.textContent = [...record.genres, price].join(" · ");
  const toggle = document.createElement("button");
  toggle.className = "request-toggle";
  toggle.type = "button";
  toggle.dataset.requestId = record.id;
  toggle.setAttribute("aria-label", `Request ${record.title}`);
  toggle.addEventListener("click", () => changeSelection([record], !selected.has(record.id)));
  card.append(artwork, title, artist, info, toggle);
  if (record.listing) {
    const link = document.createElement("a");
    link.className = "sale-link";
    link.href = record.listing;
    link.textContent = "View Discogs listing";
    card.append(link);
  }
  return card;
}

function render() {
  const terms = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
  visible = inventory.filter(record => (!format.value || record.format === format.value) &&
    (!media.value || record.media === media.value) &&
    (!genre.value || record.genres.includes(genre.value)) &&
    terms.every(term => record.searchText.includes(term)));
  if (sort.value !== "inventory") {
    const key = sort.value;
    visible.sort((a, b) => collator.compare(a[key], b[key]) || a.id - b.id);
  }
  records.replaceChildren(...visible.map(makeCard));
  updateSelection();
  statusLine.textContent = visible.length === 0 ? "No matching records." :
    `${visible.length} ${visible.length === 1 ? "record" : "records"}`;
}

async function loadCollection() {
  try {
    const [response, metadata] = await Promise.all([
      fetch("covers.json?v=2", { cache: "no-cache" }),
      fetch("listing-details.json?v=3", { cache: "no-cache" }),
    ]);
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
    if (!metadata.ok) throw new Error(`Metadata returned ${metadata.status}`);
    const data = await response.json();
    const listingDetails = await metadata.json();
    inventory = data.map(record => ({
      ...record,
      genres: [],
      ...listingDetails[record.id],
      searchText: normalize(`${record.artist} ${record.title} ${record.catalog}`),
    }));
    selected = new Set(inventory.filter(record => selected.has(record.id)).map(record => record.id));
    const genres = new Set(inventory.flatMap(record => record.genres));
    for (const value of [...genres].sort(collator.compare)) genre.add(new Option(value, value));
    updateMediaOptions();
    const selections = inventory.filter(record => record.format === "Vinyl" && record.file).slice(0, 3);
    featured.replaceChildren(...selections.map(record => coverImage(record, false)));
    render();
  } catch (error) {
    console.error(error);
    statusLine.textContent = "The collection could not be loaded.";
  }
}

function updateMediaOptions() {
  const current = media.value;
  const options = new Set(inventory.filter(record => !format.value || record.format === format.value)
    .map(record => record.media).filter(Boolean));
  media.replaceChildren(new Option("All media", ""));
  for (const value of [...options].sort(collator.compare)) media.add(new Option(value, value));
  if (options.has(current)) media.value = current;
}

function changeSelection(list, add) {
  for (const record of list) {
    if (add) selected.add(record.id);
    else selected.delete(record.id);
  }
  try { localStorage.setItem(selectionKey, JSON.stringify([...selected])); } catch {}
  updateSelection();
  if (requests.open) renderRequests();
}

function updateSelection() {
  for (const button of records.querySelectorAll("[data-request-id]")) {
    const added = selected.has(Number(button.dataset.requestId));
    button.textContent = added ? "Added ✓ · Remove" : "Add to Request";
    button.setAttribute("aria-pressed", String(added));
  }
  openRequests.textContent = `View My Requests (${selected.size})`;
  selectVisible.disabled = visible.length === 0;
  const complete = visible.length > 0 && visible.every(record => selected.has(record.id));
  selectVisible.textContent = `${complete ? "Deselect" : "Select"} ${visible.length} results`;
}

function requestText(list, total) {
  const lines = list.map(record => `- ${record.artist} — ${record.title} (${record.media || record.format}) — ${typeof record.price === "number" ? dollars.format(record.price) : "Price on request"}\n  ${record.listing}`);
  return ["Hi Peter, I’d like to request these records:", ...lines, `Estimated merchandise subtotal: ${total}`,
    `Delivery preference: ${fulfillment.value}`, noteField.value.trim()].filter(Boolean).join("\n\n");
}

function renderRequests() {
  const list = inventory.filter(record => selected.has(record.id));
  const subtotal = dollars.format(list.reduce((sum, record) => sum + Math.round((record.price ?? 0) * 100), 0) / 100);
  document.querySelector("#request-items").replaceChildren(...list.map(record => {
    const item = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = `${record.artist} — ${record.title} · ${typeof record.price === "number" ? dollars.format(record.price) : "Price on request"}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-request";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${record.title}`);
    remove.addEventListener("click", () => {
      changeSelection([record], false);
      (requests.querySelector(".remove-request") || requests.querySelector(".close")).focus();
    });
    item.append(title, remove);
    return item;
  }));
  document.querySelector("#request-total").textContent = list.length
    ? `Estimated subtotal ${subtotal}${list.some(record => typeof record.price !== "number") ? " plus items priced on request" : ""}`
    : "Your request basket is empty.";
  const contents = requestText(list, subtotal);
  const encoded = encodeURIComponent(contents);
  email.hidden = list.length === 0;
  copy.disabled = list.length === 0;
  download.disabled = list.length === 0;
  download.onclick = () => {
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "record-request.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  email.href = `mailto:peterbonos@gmail.com?subject=Record%20collection%20request&body=${encoded.length <= 6000 ? encoded : encodeURIComponent("Paste your copied record request here.")}`;
  const status = document.querySelector("#request-status");
  status.textContent = encoded.length > 6000 ? "For a large request, copy the list and paste it into your email draft." : "";
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(contents);
      status.textContent = "Request copied.";
    } catch {
      status.textContent = "Copy is unavailable. Use the email draft for shorter requests.";
    }
  };
}

search.addEventListener("input", render);
sort.addEventListener("change", render);
genre.addEventListener("change", render);
media.addEventListener("change", render);
format.addEventListener("change", () => { updateMediaOptions(); render(); });
document.querySelector("#view-all").addEventListener("click", () => {
  search.value = "";
  format.value = "";
  media.value = "";
  genre.value = "";
  updateMediaOptions();
  render();
});
selectVisible.addEventListener("click", () => changeSelection(visible, !visible.every(record => selected.has(record.id))));
openRequests.addEventListener("click", () => { renderRequests(); requests.showModal(); });
fulfillment.addEventListener("change", renderRequests);
noteField.addEventListener("input", renderRequests);
loadCollection();
