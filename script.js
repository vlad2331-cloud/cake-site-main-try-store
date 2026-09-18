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

// ===== ОБНОВЛЕННЫЙ КАЛЬКУЛЯТОР СТОИМОСТИ (ИНТЕГРИРОВАН С КОРЗИНОЙ) =====
const weightInput = document.getElementById("weightInput");
const fillingSelect = document.getElementById("fillingSelect");
const urgentCheckbox = document.getElementById("urgentCheckbox");
const calculateBtn = document.getElementById("calculateBtn");
const resultText = document.getElementById("resultText");
const grandTotalText = document.getElementById("grandTotalText");

function handleCalculation() {
    if (!weightInput || !fillingSelect || !resultText) return;

    const weight = parseFloat(weightInput.value);
    const pricePerKg = parseFloat(fillingSelect.value);
    
    // Считаем чистую сумму товаров в корзине прямо сейчас
    const cartTotalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let cakePriceOnly = 0;
    let hasCustomCake = false;

    // Калькулятор считает цену только в том случае, если на экране вес больше 0!
    if (!isNaN(weight) && weight > 0) {
        cakePriceOnly = weight * pricePerKg;
        hasCustomCake = true;

        if (urgentCheckbox && urgentCheckbox.checked) {
            cakePriceOnly = cakePriceOnly * 1.2;
        }
    }

    // Общая стоимость сладостей (кастомный торт + корзина)
    const totalGoodsPrice = cakePriceOnly + cartTotalAmount;

    // Расчет условий доставки
    let delivery = 500;
    if (totalGoodsPrice >= 8000 || totalGoodsPrice === 0) {
        delivery = 0; // Бесплатная доставка от 8000 руб за заказ или если корзина пуста
    }

    const finalPrice = totalGoodsPrice + delivery;

    // Вывод информации в текстовую подсказку
    if (hasCustomCake) {
        let message = `Торт на заказ (${weight} кг): ${cakePriceOnly.toFixed(0)} руб.`;
        if (urgentCheckbox && urgentCheckbox.checked) {
            message += ` ⚠️ Добавлена наценка за срочность 20%!`;
        }
        resultText.textContent = message;
    } else {
        resultText.textContent = cartTotalAmount > 0 
          ? `Вы заказываете готовые торты. Доставка: ${delivery === 0 ? 'Бесплатно' : delivery + ' руб.'}` 
          : "Выберите готовый торт или укажите вес кнопками для кастомного торта.";
    }

    // Вывод на главный итоговый счетчик за ВСЁ
    if (grandTotalText) {
        grandTotalText.innerHTML = `Итого к оплате за всё: <span style="font-size: 24px; font-weight: 700; color: #B5704B;">${finalPrice.toFixed(0)} руб.</span>`;
    }
}

// Навешиваем обработчики на выбор начинки, галочку срочности и кнопку
if (fillingSelect) fillingSelect.addEventListener("change", handleCalculation);
if (urgentCheckbox) urgentCheckbox.addEventListener("change", handleCalculation);
if (calculateBtn) calculateBtn.addEventListener("click", handleCalculation);


// ===== ЛОГИКА КНОПОК «ПЛЮС» И «МИHУС» ДЛЯ ВЕСА =====
const weightMinusBtn = document.getElementById("weightMinusBtn");
const weightPlusBtn = document.getElementById("weightPlusBtn");

const MIN_WEIGHT = 1;   // Наш минимальный порог в 1 кг
const MAX_WEIGHT = 30;  // Максимальный порог для защиты от случайных кликов

if (weightPlusBtn) {
  weightPlusBtn.addEventListener("click", function() {
    let currentWeight = parseFloat(weightInput.value);
    
    // Если сейчас стоит 0, значит первое нажатие на Плюс сразу ставит минимальный 1 кг
    if (currentWeight === 0) {
      weightInput.value = MIN_WEIGHT;
    } 
    // Если вес уже есть, но он еще не дошел до лимита в 30кг — просто прибавляем 1 кг
    else if (currentWeight < MAX_WEIGHT) {
      weightInput.value = currentWeight + 1;
    }
    
    // После изменения цифры принудительно пересчитываем чеки
    handleCalculation();
  });
}

if (weightMinusBtn) {
  weightMinusBtn.addEventListener("click", function() {
    let currentWeight = parseFloat(weightInput.value);
    
    // Если на экране горит минимальный порог 1 кг, то клик по Минусу сбрасывает вес в 0 кг.
    // Это означает: "Я передумал заказывать индивидуальный торт, хочу только товары из корзины".
    if (currentWeight === MIN_WEIGHT) {
      weightInput.value = 0;
    } 
    // Если вес большой (например, 4 кг), то при клике на Минус плавно уменьшаем его на 1 кг
    else if (currentWeight > MIN_WEIGHT) {
      weightInput.value = currentWeight - 1;
    }
    
    // Пересчитываем чеки, чтобы общая сумма уменьшилась
    handleCalculation();
  });
}


// ===== ЛОГИКА КОРЗИНЫ ТОВАРОВ =====

function saveCart() {
  localStorage.setItem('sharkova_cake_cart', JSON.stringify(cart));
  renderCart();
  handleCalculation(); 
}

function renderCart() {
  const cartBadge = document.getElementById('cartBadge');
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartBadge) {
    cartBadge.textContent = totalCount;
    if (totalCount === 0) {
      cartBadge.classList.add('empty');
    } else {
      cartBadge.classList.remove('empty');
    }
  }

  if (!cartItemsList || !cartTotalSum) return;

  cartItemsList.innerHTML = '';

  if (cart.length === 0) {
    cartItemsList.innerHTML = '<li class="empty-cart-message">Вы пока не выбрали готовые торты</li>';
    cartTotalSum.textContent = '0';
    return;
  }

  let totalSum = 0;

  cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <span class="cart-item-info">${item.name} × ${item.quantity}</span>
      <div class="cart-item-controls">
        <span class="cart-item-price">${(item.price * item.quantity).toLocaleString()} ₽</span>
        <button class="cart-item-remove" data-id="${item.id}" title="Удалить">×</button>
      </div>
    `;
    cartItemsList.appendChild(li);
    totalSum += item.price * item.quantity;
  });

  cartTotalSum.textContent = totalSum.toLocaleString();
}

function addToCart(id, name, price) {
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: id,
      name: name,
      price: parseInt(price, 10),
      quantity: 1
    });
  }
  saveCart();
}

function removeFromCart(id) {
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    if (existingItem.quantity > 1) {
      existingItem.quantity -= 1;
    } else {
      cart = cart.filter(item => item.id !== id);
    }
  }
  saveCart();
}

// --- НАВЕШИВАНИЕ СОБЫТИЙ ДЛЯ КОРЗИНЫ ---

document.addEventListener('click', function(e) {
  if (e.target && e.target.classList.contains('product-btn')) {
    e.preventDefault(); 
    
    const btn = e.target;
    const productCard = btn.closest('.product-card');
    if (!productCard) return;

    const id = btn.dataset.id || productCard.querySelector('.product-title').textContent.trim();
    const name = btn.dataset.name || productCard.querySelector('.product-title').textContent.trim();
    const priceText = productCard.querySelector('.product-price').textContent;
    const price = btn.dataset.price || priceText.replace(/[^0-9]/g, '');

    addToCart(id, name, price);
    
    const cartLink = document.querySelector('.header-cart-link');
    if (cartLink) {
      cartLink.classList.add('cart-bump');
      setTimeout(() => cartLink.classList.remove('cart-bump'), 400);
    }

    btn.style.transform = 'scale(0.95)';
    setTimeout(() => btn.style.transform = 'none', 100);
  }
});

if (cartItemsList) {
  cartItemsList.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('cart-item-remove')) {
      const id = e.target.dataset.id;
      removeFromCart(id);
    }
  });
}

// При загрузке страницы запускаем отрисовку корзины и базовый расчет
window.addEventListener('DOMContentLoaded', function() {
  renderCart();
  handleCalculation();
});
