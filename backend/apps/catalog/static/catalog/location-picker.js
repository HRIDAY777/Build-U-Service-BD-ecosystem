document.addEventListener("DOMContentLoaded", async () => {
  const address = document.getElementById("id_address");
  const district = document.getElementById("id_district");
  const area = document.getElementById("id_area");
  if (!address && !district && !area) return;
  try {
    const script = document.querySelector('script[src*="catalog/location-picker.js"]');
    const response = await fetch(new URL("locations.json", script.src));
    if (!response.ok) return;
    const data = await response.json();
    function suggestions(input, rows, id) {
      if (!input) return;
      const list = document.createElement("datalist");
      list.id = id;
      rows.forEach((row) => { const option = document.createElement("option"); option.value = row.name; option.label = row.bnName; list.append(option); });
      input.setAttribute("list", id); input.after(list);
    }
    const districts = data.divisions.flatMap((row) => row.districts);
    const localities = districts.flatMap((row) => row.upazilas.flatMap((item) => [item, ...item.areas]));
    suggestions(district, districts, "bd-district-names");
    suggestions(area, localities, "bd-area-names");
    if (!address) return;
    const panel = document.createElement("fieldset");
    panel.style.cssText = "padding:16px; margin:12px 0; border:1px solid #aaa";
    const legend = document.createElement("legend"); legend.textContent = "বাংলাদেশের ঠিকানা / Bangladesh location"; panel.append(legend);
    const titles = ["বিভাগ / Division", "জেলা / District", "উপজেলা/থানা / Upazila/thana", "ইউনিয়ন/এলাকা / Union/area"];
    const selects = titles.map((title) => {
      const label = document.createElement("label"); label.textContent = title; label.style.display = "block";
      const select = document.createElement("select"); select.style.cssText = "display:block; max-width:100%; margin:6px 0 12px";
      label.append(select); panel.append(label); return select;
    });
    function populate(index, rows) {
      const select = selects[index]; select.replaceChildren(new Option("বেছে নিন / Select", ""));
      rows.forEach((row) => select.add(new Option(`${row.bnName} / ${row.name}`, String(row.id))));
      select.disabled = rows.length === 0;
    }
    const levels = [data.divisions, [], [], []];
    populate(0, levels[0]); for (let i = 1; i < 4; i++) populate(i, []);
    selects.forEach((select, index) => select.addEventListener("change", () => {
      const selected = levels[index].find((row) => String(row.id) === select.value);
      for (let i = index + 1; i < 4; i++) { levels[i] = i === index + 1 && selected ? selected[["districts", "upazilas", "areas"][index]] || [] : []; populate(i, levels[i]); }
    }));
    const apply = document.createElement("button"); apply.type = "button"; apply.textContent = "ঠিকানায় যোগ করুন / Add to address";
    apply.addEventListener("click", () => {
      const selected = selects.map((select, index) => levels[index].find((row) => String(row.id) === select.value)).filter(Boolean);
      const text = selected.reverse().map((row) => row.bnName).join(", ");
      if (text && !address.value.includes(text)) { address.value = [address.value, text].filter(Boolean).join(", "); address.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    panel.append(apply); address.parentElement.after(panel);
  } catch { /* Manual address entry remains available when the list cannot load. */ }
});
