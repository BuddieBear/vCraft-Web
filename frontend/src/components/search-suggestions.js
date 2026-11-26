export function mountSearchSuggestions(input, select) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-suggestions";
  const field = input.closest("label");
  field.replaceWith(wrapper);
  const list = document.createElement("ul");
  list.id = input.id + "-suggestions";
  list.className = "search-matches";
  list.role = "listbox";
  list.setAttribute("aria-label", "Gợi ý sản phẩm");
  list.hidden = true;
  wrapper.append(field, list);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");

  let options = [];
  let active = -1;
  let dismissed = false;

  function setActive(index) {
    active = index;
    for (const [position, option] of [...list.children].entries()) {
      option.setAttribute("aria-selected", String(position === index));
    }
    if (index < 0) input.removeAttribute("aria-activedescendant");
    else {
      input.setAttribute("aria-activedescendant", list.children[index].id);
      list.children[index].scrollIntoView({ block: "nearest" });
    }
  }

  function show(visible) {
    list.hidden = !visible;
    input.setAttribute("aria-expanded", String(visible));
    if (!visible) setActive(-1);
  }

  function choose(index) {
    const product = options[index];
    if (!product) return;
    input.value = product.name.slice(0, input.maxLength);
    dismissed = true;
    show(false);
    select();
  }

  input.addEventListener("input", () => {
    dismissed = false;
    options = [];
    show(false);
  });
  input.addEventListener("blur", () => show(false));
  input.addEventListener("focus", () => show(options.length > 0 && !dismissed));
  input.addEventListener("keydown", event => {
    if (event.isComposing) return;
    if (event.key === "Escape" && !list.hidden) {
      event.preventDefault();
      dismissed = true;
      show(false);
    } else if (options.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      dismissed = false;
      show(true);
      const next = event.key === "ArrowDown" ? active + 1 : active < 0 ? options.length - 1 : active - 1;
      setActive((next + options.length) % options.length);
    } else if (event.key === "Enter" && !list.hidden && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  });

  return function showMatches(matches) {
    options = input.value.trim().length >= 2 ? matches.slice(0, 5) : [];
    list.replaceChildren(...options.map((product, index) => {
      const option = document.createElement("li");
      option.id = list.id + "-" + index;
      option.role = "option";
      option.textContent = product.name;
      option.addEventListener("mousedown", event => event.preventDefault());
      option.addEventListener("click", () => choose(index));
      return option;
    }));
    setActive(-1);
    show(document.activeElement === input && Boolean(options.length) && !dismissed);
  };
}
