// ===== ФИЛЬТР КАТАЛОГА (по клику на ссылки в сайдбаре) =====
document.addEventListener('DOMContentLoaded', function() {
  const categoryLinks = document.querySelectorAll('.category-link');
  
  function filterProducts(category) {
    const gridItems = document.querySelectorAll('.products-grid > .product-link');
    gridItems.forEach(item => {
      const productCard = item.querySelector('.product-card');
      if (!productCard) return;
      const productCategory = productCard.dataset.category;

      if (category === 'all' || productCategory === category) {
        item.classList.remove('product-hidden'); 
      } else {
        item.classList.add('product-hidden'); 
      }
    });
  }

  categoryLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      categoryLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      const category = this.dataset.category;
      filterProducts(category);
    });
  });

  const allLink = document.querySelector('.category-link[data-category="all"]');
  if (allLink) {
    allLink.classList.add('active');
    filterProducts('all');
  }
});

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ КОРЗИНЫ =====
let cart = JSON.parse(localStorage.getItem('sharkova_cake_cart')) || [];
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalSum = document.getElementById('cartTotalSum');
const resultText = document.getElementById("resultText");
const grandTotalText = document.getElementById("grandTotalText");

// ===== ФУНКЦИЯ СОХРАНЕНИЯ И СИНХРОНИЗАЦИИ =====
function saveCart() {
  localStorage.setItem('sharkova_cake_cart', JSON.stringify(cart));
  renderCart();
}

// ===== УМНАЯ ОТРИСОВКА КОРЗИНЫ С УПРАВЛЕНИЕМ ВЕСОМ =====
function renderCart() {
  const cartBadge = document.getElementById('cartBadge');
  
  // Обновляем количество разных тортов на значке в шапке сайта
  if (cartBadge) {
    cartBadge.textContent = cart.length;
    if (cart.length === 0) cartBadge.classList.add('empty');
    else cartBadge.classList.remove('empty');
  }

  if (!cartItemsList || !cartTotalSum) return;
  cartItemsList.innerHTML = '';

  // Сценарий: Если в корзине пусто
  if (cart.length === 0) {
    cartItemsList.innerHTML = '<li class="empty-cart-message">Вы пока не выбрали готовые торты</li>';
    cartTotalSum.textContent = '0';
    if (resultText) resultText.textContent = "Добавьте торты в корзину для расчета стоимости и доставки.";
    if (grandTotalText) grandTotalText.innerHTML = `Итого к оплате за всё: <span style="font-size: 24px; font-weight: 700; color: #B5704B;">0 руб.</span>`;
    return;
  }

  let totalGoodsPrice = 0;

  // Циклом проходим по всем тортам в корзине и генерируем для них HTML с кнопками и селектами
  cart.forEach((item, index) => {
    let itemPriceOnly = item.weight * item.pricePerKg;
    
    if (item.urgent) {
      itemPriceOnly = itemPriceOnly * 1.2;
    }

    totalGoodsPrice += itemPriceOnly;

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
        <!-- Кнопки плюс / минус веса -->
        <div class="cart-weight-box">
          <button type="button" class="cart-weight-btn minus-weight" data-index="${index}">−</button>
          <div class="cart-weight-value">${item.weight} кг</div>
          <button type="button" class="cart-weight-btn plus-weight" data-index="${index}">+</button>
        </div>

        <!-- Выбор начинки -->
        <select class="cart-select-filling" data-index="${index}">
          <option value="2000" ${item.fillingPrice === 2000 ? 'selected' : ''}>Крем чиз + клубника-банан</option>
          <option value="2100" ${item.fillingPrice === 2100 ? 'selected' : ''}>Пломбир + малина-яблоко</option>
          <option value="2200" ${item.fillingPrice === 2200 ? 'selected' : ''}>Шоколадный + вишня</option>
          <option value="2300" ${item.fillingPrice === 2300 ? 'selected' : ''}>Белый шоколад + клубника</option>
        </select>

        <!-- Галочка срочности -->
        <label class="cart-urgent-label">
          <input type="checkbox" class="cart-urgent-checkbox" data-index="${index}" ${item.urgent ? 'checked' : ''}>
          🔥 Срочно (+20%)
        </label>
      </div>
    `;
    cartItemsList.appendChild(li);
  });

  cartTotalSum.textContent = Math.round(totalGoodsPrice).toLocaleString();

  let delivery = 500;
  if (totalGoodsPrice >= 8000) {
    delivery = 0; 
  }

  const finalPrice = totalGoodsPrice + delivery;

  if (resultText) {
    resultText.textContent = `Стоимость сладостей: ${Math.round(totalGoodsPrice).toLocaleString()} руб. | Доставка: ${delivery === 0 ? 'Бесплатно' : delivery + ' руб.'}`;
  }
  if (grandTotalText) {
    grandTotalText.innerHTML = `Итого к оплате за всё: <span style="font-size: 24px; font-weight: 700; color: #B5704B;">${Math.round(finalPrice).toFixed(0)} руб.</span>`;
  }
}

// ===== СВЕРХНАДЁЖНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ ТОВАРА С ВИТРИНЫ =====
function addToCart(name, startPriceText, startWeightText) {
  let cleanPrice = parseInt(startPriceText.replace(/[^0-9]/g, ''), 10);
  if (isNaN(cleanPrice) || cleanPrice <= 0) {
    cleanPrice = 3800; 
  }

  let cleanWeight = parseFloat(startWeightText.replace(',', '.').replace(/[^0-9.]/g, ''));
  if (isNaN(cleanWeight) || cleanWeight <= 0) {
    cleanWeight = 1.5; 
  }

  let pricePerKg = cleanPrice / cleanWeight;

  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.weight += 1; 
  } else {
    cart.push({
      name: name,
      weight: cleanWeight,       
      minWeight: cleanWeight,    
      pricePerKg: pricePerKg,    
      fillingPrice: 2000,
      urgent: false
    });
  }
  
  saveCart();
}

// ===== СТРАХОВОЧНАЯ СТРОКА ДЛЯ КНОПОК ИЗ HTML =====
// Если на ваших кнопках в HTML остался onclick="openOrderForm()", 
// эта пустая функция-заглушка предотвратит появление ошибок в консоли
window.openOrderForm = function() {
  // Просто прокручиваем страницу вниз к форме оформления заказа
  const orderSection = document.getElementById('order-form-section');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  }
};

// ===== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ: СЛУШАЕМ КЛИКИ НА ВСЕМ САЙТЕ =====
document.addEventListener('click', function(e) {
  const target = e.target;

  // 1. Событие: Клик по кнопке "Заказать" на витрине каталога
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

  // 2. Событие: Клик по крестику удаления внутри корзины
  if (target && target.classList.contains('cart-item-remove')) {
    const index = target.dataset.index;
    cart.splice(index, 1);
    saveCart();
    return;
  }

  // 3. Событие: Клик по кнопке ПЛЮС ВЕС (+) внутри корзины
  if (target && target.classList.contains('plus-weight')) {
    const index = target.dataset.index;
    
    if (cart[index].weight < 30) {
      // Прибавляем 0.5 кг и округляем до 1 знака после запятой, чтобы не было багов JS
      let newWeight = cart[index].weight + 0.5;
      cart[index].weight = parseFloat(newWeight.toFixed(1));
      saveCart();
    }
    return;
  }

  // 4. Событие: Клик по кнопке МИНУС ВЕС (−) внутри корзины
  if (target && target.classList.contains('minus-weight')) {
    const index = target.dataset.index;
    const currentItem = cart[index];

    if (currentItem.weight > currentItem.minWeight) {
      // Вычитаем 0.5 кг и округляем до 1 знака после запятой
      let newWeight = currentItem.weight - 0.5;
      currentItem.weight = parseFloat(newWeight.toFixed(1));
      saveCart();
    }
    return;
  }

});

// ===== ОБРАБОТКА ИЗМЕНЕНИЙ ВНУТРИ КОРЗИНЫ (ВЫБОР НАЧИНКИ И СРОЧНОСТИ) =====
document.addEventListener('change', function(e) {
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
});

// Первичная прорисовка корзины при загрузке страницы
window.addEventListener('DOMContentLoaded', renderCart);
