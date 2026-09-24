// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ КОРЗИНЫ =====
let cart = JSON.parse(localStorage.getItem('sharkova_cake_cart')) || [];
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalSum = document.getElementById('cartTotalSum');
const resultText = document.getElementById("resultText");
const grandTotalText = document.getElementById("grandTotalText");

// ===== РАЙОНЫ ДОСТАВКИ =====
const DELIVERY_ZONES = [
  {
    id: 'trusovsky',
    name: 'Трусовский район (наш район)',
    price: 400,
    freeFrom: 10000
  },
  {
    id: 'center',
    name: 'Центр (Ленинский, Кировский, Советский)',
    price: 550,
    freeFrom: 14000
  },
  {
    id: 'far',
    name: 'Дальние районы (Приволжский, Наримановский, Камызякский)',
    price: 1000,
    freeFrom: 20000
  },
  {
    id: 'pickup',
    name: 'Самовывоз (бесплатно)',
    price: 0,
    freeFrom: 0
  }
];

let selectedZoneId = localStorage.getItem('sharkova_delivery_zone') || 'trusovsky';

function getSelectedZone() {
  return DELIVERY_ZONES.find(z => z.id === selectedZoneId) || DELIVERY_ZONES[0];
}

function getDeliveryPrice(goodsPrice) {
  const zone = getSelectedZone();
  if (zone.price === 0) return 0;
  if (zone.freeFrom > 0 && goodsPrice >= zone.freeFrom) return 0;
  return zone.price;
}

// ===== ЛОГИКА ВЕСА И ЦЕН ДЛЯ БЕНТО-ТОРТОВ =====
const BENTO_WEIGHTS = [0.45, 0.65, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];
const BENTO_PRICES  = [1800, 2300, 2800, 3800, 4800, 5800, 6800, 7800, 8800, 9800, 10800, 11800, 12800, 13800, 14800];
const BENTO_MIN_WEIGHT = 0.45;

function isBentoItem(item) {
  if (!item) return false;
  if (item.isBento === true) return true;
  return typeof item.name === 'string' && item.name.toLowerCase().includes('бенто');
}

function getClosestBentoIndex(weight) {
  let idx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < BENTO_WEIGHTS.length; i++) {
    const diff = Math.abs(BENTO_WEIGHTS[i] - weight);
    if (diff < minDiff) {
      minDiff = diff;
      idx = i;
    }
  }
  return idx;
}

function getBentoPrice(weight) {
  return BENTO_PRICES[getClosestBentoIndex(weight)];
}

function getNextWeight(currentWeight, bento) {
  if (!bento) return parseFloat((currentWeight + 0.5).toFixed(2));
  const idx = getClosestBentoIndex(currentWeight);
  return idx < BENTO_WEIGHTS.length - 1 ? BENTO_WEIGHTS[idx + 1] : BENTO_WEIGHTS[idx];
}

function getPrevWeight(currentWeight, minWeight, bento) {
  if (!bento) {
    const next = parseFloat((currentWeight - 0.5).toFixed(2));
    return next < minWeight ? currentWeight : next;
  }
  const idx = getClosestBentoIndex(currentWeight);
  if (idx === 0) return currentWeight;
  const prev = BENTO_WEIGHTS[idx - 1];
  return prev < minWeight ? currentWeight : prev;
}

function formatWeight(kg) {
  if (kg < 1) return Math.round(kg * 1000) + ' г';
  return kg + ' кг';
}

// ===== АВТОИСПРАВЛЕНИЕ СТАРЫХ ЗАПИСЕЙ =====
function fixBentoRecords() {
  let changed = false;
  cart.forEach(item => {
    if (typeof item.name === 'string' && item.name.toLowerCase().includes('бенто')) {
      if (item.isBento !== true) { item.isBento = true; changed = true; }
      if (item.minWeight !== BENTO_MIN_WEIGHT) { item.minWeight = BENTO_MIN_WEIGHT; changed = true; }

      const idx = getClosestBentoIndex(item.weight);
      if (Math.abs(item.weight - BENTO_WEIGHTS[idx]) > 0.001) {
        item.weight = BENTO_WEIGHTS[idx];
        changed = true;
      }
      if (item.weight < BENTO_MIN_WEIGHT) { item.weight = BENTO_MIN_WEIGHT; changed = true; }
    }
  });
  if (changed) {
    localStorage.setItem('sharkova_cake_cart', JSON.stringify(cart));
  }
}
fixBentoRecords();

// ===== СОХРАНЕНИЕ =====
function saveCart() {
  localStorage.setItem('sharkova_cake_cart', JSON.stringify(cart));
  renderCart();
}

// ===== ОТРИСОВКА КОРЗИНЫ =====
function renderCart() {
  const cartBadge = document.getElementById('cartBadge');

  if (cartBadge) {
    cartBadge.textContent = cart.length;
    if (cart.length === 0) cartBadge.classList.add('empty');
    else cartBadge.classList.remove('empty');
  }

  if (!cartItemsList || !cartTotalSum) return;
  cartItemsList.innerHTML = '';

  // Удаляем старый блок выбора района (если был)
  const oldZone = document.getElementById('deliveryZoneBlock');
  if (oldZone) oldZone.remove();

  if (cart.length === 0) {
    cartItemsList.innerHTML = '<li class="empty-cart-message">Вы пока не выбрали готовые торты</li>';
    cartTotalSum.textContent = '0';
    if (resultText) resultText.textContent = "Добавьте торты в корзину для расчета стоимости и доставки.";
    if (grandTotalText) grandTotalText.innerHTML = `Итого к оплате за всё: <span style="font-size: 24px; font-weight: 700; color: #B5704B;">0 руб.</span>`;

    const orderDetailsInput = document.getElementById('orderDetailsInput');
    if (orderDetailsInput) orderDetailsInput.value = '';
    return;
  }

  let totalGoodsPrice = 0;
  let textForEmail = '';

  cart.forEach((item, index) => {
    let itemPriceOnly;
    if (isBentoItem(item)) {
      itemPriceOnly = getBentoPrice(item.weight);
    } else {
      itemPriceOnly = item.weight * item.pricePerKg;
    }

    let fillingName = "Крем чиз + клубника-банан";
    if (item.fillingPrice === 2100) fillingName = "Пломбир + малина-яблоко";
    if (item.fillingPrice === 2200) fillingName = "Шоколадный + вишня";
    if (item.fillingPrice === 2300) fillingName = "Белый шоколад + клубника";

    if (item.urgent) itemPriceOnly = itemPriceOnly * 1.2;

    totalGoodsPrice += itemPriceOnly;

    textForEmail += `${index + 1}. ${item.name} (${formatWeight(item.weight)}) | Начинка: ${fillingName} | Срочно: ${item.urgent ? 'Да' : 'Нет'} | Цена: ${Math.round(itemPriceOnly)} руб.\n`;

    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-header">
        <span class="cart-item-info">${item.name}</span>
        <div class="cart-item-controls">
          <span class="cart-item-price">${Math.round(itemPriceOnly).toLocaleString()} ₽</span>
          <button class="cart-item-remove" data-index="${index}" title="Удалить из корзины">×</button>
        </div>
      </div>

      <div class="cart-item-options">
        <div class="cart-weight-box">
          <button type="button" class="cart-weight-btn minus-weight" data-index="${index}">−</button>
          <div class="cart-weight-value">${formatWeight(item.weight)}</div>
          <button type="button" class="cart-weight-btn plus-weight" data-index="${index}">+</button>
        </div>

        <select class="cart-select-filling" data-index="${index}">
          <option value="2000" ${item.fillingPrice === 2000 ? 'selected' : ''}>Крем чиз + клубника-банан</option>
          <option value="2100" ${item.fillingPrice === 2100 ? 'selected' : ''}>Пломбир + малина-яблоко</option>
          <option value="2200" ${item.fillingPrice === 2200 ? 'selected' : ''}>Шоколадный + вишня</option>
          <option value="2300" ${item.fillingPrice === 2300 ? 'selected' : ''}>Белый шоколад + клубника</option>
        </select>

        <label class="cart-urgent-label">
          <input type="checkbox" class="cart-urgent-checkbox" data-index="${index}" ${item.urgent ? 'checked' : ''}>
          🔥 Срочно (+20%)
        </label>
      </div>
    `;
    cartItemsList.appendChild(li);
  });

  // ===== БЛОК ВЫБОРА РАЙОНА ДОСТАВКИ =====
  const zoneBlock = document.createElement('li');
  zoneBlock.id = 'deliveryZoneBlock';
  zoneBlock.style.cssText = 'list-style:none; padding:15px 0; border-top:1px dashed #DDD0BF; margin-top:10px;';
  zoneBlock.innerHTML = `
    <label style="display:block; font-weight:600; font-size:14px; color:#2C1A0E; margin-bottom:8px;">
      🚚 Район доставки
    </label>
    <select id="deliveryZoneSelect" style="width:100%; padding:10px; font-size:14px; border:1px solid #DDD0BF; border-radius:6px; background:#FFF; color:#2C1A0E; font-family:inherit;">
      ${DELIVERY_ZONES.map(z => `
        <option value="${z.id}" ${z.id === selectedZoneId ? 'selected' : ''}>
          ${z.name} — ${z.price === 0 ? 'бесплатно' : z.price + ' ₽'}
        </option>
      `).join('')}
    </select>
  `;
  cartItemsList.parentNode.insertBefore(zoneBlock, cartItemsList.nextSibling);

  cartTotalSum.textContent = Math.round(totalGoodsPrice).toLocaleString();

  const delivery = getDeliveryPrice(totalGoodsPrice);
  const finalPrice = totalGoodsPrice + delivery;
  const zone = getSelectedZone();

  textForEmail += `\nРайон доставки: ${zone.name}\n`;
  textForEmail += `Доставка: ${delivery === 0 ? 'Бесплатно' : delivery + ' руб.'}\n`;
  textForEmail += `ИТОГО К ОПЛАТЕ ЗА ВСЁ: ${Math.round(finalPrice)} руб.`;

  const orderDetailsInput = document.getElementById('orderDetailsInput');
  if (orderDetailsInput) orderDetailsInput.value = textForEmail;

  if (resultText) {
    const deliveryText = delivery === 0
      ? `Бесплатно (${zone.name})`
      : `${delivery} руб. (${zone.name})`;
    resultText.textContent = `Стоимость сладостей: ${Math.round(totalGoodsPrice).toLocaleString()} руб. | Доставка: ${deliveryText}`;
  }
  if (grandTotalText) {
    grandTotalText.innerHTML = `Итого к оплате за всё: <span style="font-size: 24px; font-weight: 700; color: #B5704B;">${Math.round(finalPrice).toFixed(0)} руб.</span>`;
  }
}

// ===== ДОБАВЛЕНИЕ С ВИТРИНЫ =====
function addToCart(name, startPriceText, startWeightText) {
  const bento = name.toLowerCase().includes('бенто');

  let cleanWeight;
  if (bento) {
    cleanWeight = BENTO_MIN_WEIGHT;
  } else {
    let parsed = parseFloat(startWeightText.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (isNaN(parsed) || parsed <= 0) parsed = 1.5;
    cleanWeight = parsed;
  }

  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    if (bento) {
      existingItem.isBento = true;
      existingItem.minWeight = BENTO_MIN_WEIGHT;
      if (existingItem.weight < BENTO_MIN_WEIGHT) existingItem.weight = BENTO_MIN_WEIGHT;
    }
    if (isBentoItem(existingItem)) {
      const next = getNextWeight(existingItem.weight, true);
      if (next > existingItem.weight) existingItem.weight = next;
    } else {
      existingItem.weight += 1;
    }
  } else {
    let cleanPrice = parseInt(startPriceText.replace(/[^0-9]/g, ''), 10);
    if (isNaN(cleanPrice) || cleanPrice <= 0) cleanPrice = 3800;

    cart.push({
      name: name,
      weight: cleanWeight,
      minWeight: cleanWeight,
      pricePerKg: cleanPrice / cleanWeight,
      fillingPrice: 2000,
      urgent: false,
      isBento: bento
    });
  }

  saveCart();
}

// ===== СТРАХОВОЧНАЯ ФУНКЦИЯ =====
window.openOrderForm = function () {
  const orderSection = document.getElementById('order-form-section');
  if (orderSection) orderSection.scrollIntoView({ behavior: 'smooth' });
};

// ===== КЛИКИ =====
document.addEventListener('click', function (e) {
  const target = e.target;

  if (target && target.classList.contains('product-btn')) {
    e.preventDefault();
    const productCard = target.closest('.product-card');
    if (!productCard) return;

    const titleElement = productCard.querySelector('.product-title');
    const name = titleElement ? titleElement.textContent.trim() : "Торт с витрины";

    const priceElement = productCard.querySelector('.product-price');
    const priceText = priceElement ? priceElement.textContent : "";

    const weightElement = productCard.querySelector('.product-weight') || productCard.querySelector('[class*="weight"]');
    const weightText = weightElement ? weightElement.textContent : "";

    addToCart(name, priceText, weightText);

    const cartLink = document.querySelector('.header-cart-link');
    if (cartLink) {
      cartLink.classList.add('cart-bump');
      setTimeout(() => cartLink.classList.remove('cart-bump'), 400);
    }

    target.style.transform = 'scale(0.95)';
    setTimeout(() => target.style.transform = 'none', 100);
    return;
  }

  if (target && target.classList.contains('cart-item-remove')) {
    const index = target.dataset.index;
    cart.splice(index, 1);
    saveCart();
    return;
  }

  if (target && target.classList.contains('plus-weight')) {
    const index = target.dataset.index;
    const item = cart[index];
    if (!item) return;

    if (isBentoItem(item)) {
      const next = getNextWeight(item.weight, true);
      if (next > item.weight) {
        item.weight = next;
        saveCart();
      }
    } else {
      if (item.weight < 30) {
        item.weight = parseFloat((item.weight + 0.5).toFixed(2));
        saveCart();
      }
    }
    return;
  }

  if (target && target.classList.contains('minus-weight')) {
    const index = target.dataset.index;
    const item = cart[index];
    if (!item) return;

    const minW = isBentoItem(item) ? BENTO_MIN_WEIGHT : item.minWeight;

    if (isBentoItem(item)) {
      const prev = getPrevWeight(item.weight, minW, true);
      if (prev < item.weight) {
        item.weight = prev;
        saveCart();
      }
    } else {
      if (item.weight > minW) {
        item.weight = parseFloat((item.weight - 0.5).toFixed(2));
        saveCart();
      }
    }
    return;
  }
});

// ===== ИЗМЕНЕНИЯ =====
document.addEventListener('change', function (e) {
  const target = e.target;

  if (target && target.classList.contains('cart-select-filling')) {
    const index = target.dataset.index;
    cart[index].fillingPrice = parseInt(target.value, 10);
    saveCart();
    return;
  }

  if (target && target.classList.contains('cart-urgent-checkbox')) {
    const index = target.dataset.index;
    cart[index].urgent = target.checked;
    saveCart();
    return;
  }

  // 🔥 Смена района доставки
  if (target && target.id === 'deliveryZoneSelect') {
    selectedZoneId = target.value;
    localStorage.setItem('sharkova_delivery_zone', selectedZoneId);
    saveCart();
    return;
  }
});

// ===== СТАРТ =====
window.addEventListener('DOMContentLoaded', renderCart);

// ===== ВЫПАДАЮЩЕЕ МЕНЮ =====
document.addEventListener('DOMContentLoaded', function () {
  const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function (e) {
      if (window.innerWidth <= 600) {
        e.preventDefault();
        const parent = this.closest('.nav-dropdown');
        if (parent) parent.classList.toggle('open');
      }
    });
  });
});

// ===== СЛАЙДЕР БАННЕРОВ =====
document.addEventListener('DOMContentLoaded', function () {
  const slider = document.getElementById('bannerSlider');
  if (!slider) return;

  const track = slider.querySelector('.banner-slider__track');
  const slides = slider.querySelectorAll('.banner-slide');
  const prevBtn = slider.querySelector('.banner-arrow--prev');
  const nextBtn = slider.querySelector('.banner-arrow--next');
  const dotsContainer = slider.querySelector('.banner-dots');

  let currentIndex = 0;
  const total = slides.length;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'banner-dot' + (i === 0 ? ' banner-dot--active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.banner-dot');

  function update() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('banner-dot--active', i === currentIndex));
  }

  function goTo(i) {
    currentIndex = (i + total) % total;
    update();
    restart();
  }

  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }

  function restart() {
    if (timer) clearInterval(timer);
    timer = setInterval(next, 5000);
  }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  slider.addEventListener('mouseenter', () => timer && clearInterval(timer));
  slider.addEventListener('mouseleave', restart);

  let touchStartX = 0;
  slider.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, { passive: true });
  slider.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  }, { passive: true });

  update();
  restart();
});

// ===== ДОБАВЛЕНИЕ СО СТРАНИЦЫ ТОВАРА =====
window.addToCartFromProduct = function (name, price, weight, isBento) {
  if (!name || !price || !weight) {
    console.warn('addToCartFromProduct: не хватает данных', { name, price, weight });
    return;
  }

  const bento = isBento === true || name.toLowerCase().includes('бенто');
  let cleanWeight = parseFloat(weight);

  if (bento) cleanWeight = BENTO_MIN_WEIGHT;

  const pricePerKg = parseInt(price, 10) / cleanWeight;
  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    if (bento) {
      existingItem.isBento = true;
      existingItem.minWeight = BENTO_MIN_WEIGHT;
      if (existingItem.weight < BENTO_MIN_WEIGHT) existingItem.weight = BENTO_MIN_WEIGHT;
    }
    if (isBentoItem(existingItem)) {
      const next = getNextWeight(existingItem.weight, true);
      if (next > existingItem.weight) existingItem.weight = next;
    } else {
      existingItem.weight += 1;
    }
  } else {
    cart.push({
      name: name,
      weight: cleanWeight,
      minWeight: cleanWeight,
      pricePerKg: pricePerKg,
      fillingPrice: 2000,
      urgent: false,
      isBento: bento
    });
  }

  saveCart();

  const cartLink = document.querySelector('.header-cart-link');
  if (cartLink) {
    cartLink.classList.add('cart-bump');
    setTimeout(() => cartLink.classList.remove('cart-bump'), 400);
  }

  const cartBlock = document.getElementById('cartContainer');
  if (cartBlock) cartBlock.scrollIntoView({ behavior: 'smooth' });
};

// ===== ПОИСК В ШАПКЕ =====
document.addEventListener('DOMContentLoaded', function () {
  const searchBtn = document.getElementById('headerSearchBtn');
  const searchBar = document.getElementById('headerSearchBar');
  const searchInput = document.getElementById('headerSearchInput');

  if (!searchBtn || !searchBar) return;

  searchBtn.addEventListener('click', function () {
    if (searchBar.style.display === 'none' || !searchBar.style.display) {
      searchBar.style.display = 'block';
      if (searchInput) setTimeout(() => searchInput.focus(), 50);
    } else {
      searchBar.style.display = 'none';
    }
  });

  // Закрываем по Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchBar.style.display === 'block') {
      searchBar.style.display = 'none';
    }
  });
});