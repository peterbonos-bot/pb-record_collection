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
  card.append(artwork, title, artist);
  return card;
}

function render() {
  const terms = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
  const visible = inventory.filter(record => (!format.value || record.format === format.value) &&
    terms.every(term => record.searchText.includes(term)));
  if (sort.value !== "inventory") {
    const key = sort.value;
    visible.sort((a, b) => collator.compare(a[key], b[key]) || a.id - b.id);
  }
  records.replaceChildren(...visible.map(makeCard));
  statusLine.textContent = visible.length === 0 ? "No matching records." :
    `${visible.length} ${visible.length === 1 ? "record" : "records"}`;
}

async function loadCollection() {
  try {
    const response = await fetch("covers.json?v=2", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
    const data = await response.json();
    inventory = data.map(record => ({
      ...record,
      searchText: normalize(`${record.artist} ${record.title} ${record.catalog}`),
    }));
    const selections = inventory.filter(record => record.format === "Vinyl" && record.file).slice(0, 3);
    featured.replaceChildren(...selections.map(record => coverImage(record, false)));
    render();
  } catch (error) {
    console.error(error);
    statusLine.textContent = "The collection could not be loaded.";
  }
}

search.addEventListener("input", render);
sort.addEventListener("change", render);
format.addEventListener("change", render);
loadCollection();
