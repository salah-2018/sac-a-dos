var BLOG_URL = 'https://dz-tech2017.blogspot.com';
  var FEED_URL = BLOG_URL + '/feeds/posts/default?alt=json&max-results=50';
  var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWarAGLl0uCB2heO41fvHJ7ZImSo2sEThJq2jDta8A8I9yzISzY6GFu0wck-ZQg4qNmA/exec';

  var GALLERY_IMAGES_COUNT = 2; 

  var DELIVERY_PRICES = {
    '1': 1000, '2': 600, '3': 750, '4': 700, '5': 650, '6': 550, '7': 800, '8': 1050,
    '9': 250, '10': 600, '11': 1200, '12': 700, '13': 700, '14': 700, '15': 550,
    '16': 250, '17': 750, '18': 600, '19': 550, '20': 750, '21': 650, '22': 650,
    '23': 550, '24': 700, '25': 550, '26': 600, '27': 600, '28': 650, '29': 650,
    '30': 800, '31': 550, '32': 850, '33': 1300, '34': 600, '35': 500, '36': 700,
    '37': 1300, '38': 700, '39': 800, '40': 700, '41': 800, '42': 500, '43': 650,
    '44': 600, '45': 900, '46': 600, '47': 850, '48': 600, '49': 1200, '50': 2000,
    '51': 800, '52': 1100, '53': 1200, '54': 2000, '55': 850, '56': 700, '57': 900, '58': 900
  };

  var WILAYA_URL = 'https://cdn.jsdelivr.net/gh/kossa/algerian-cities@master/database/seeders/json/Wilaya_Of_Algeria.json';
  var COMMUNE_URL = 'https://cdn.jsdelivr.net/gh/kossa/algerian-cities-api@master/database/seeds/json/Commune_Of_Algeria.json';

  var products = [];
  var communesData = null;
  var currentUnitProductPrice = 0;
  var currentDelivery = 0;
  var selectedQuantity = 1;
  var currentProductData = null;

  /* SLIDER STATE */
  var currentSlideIndex = 0;
  var totalSlidesCount = 0;

  function scrollToOrder() {
    var orderBox = document.getElementById('orderBox');
    if (orderBox) {
      orderBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function selectBundle(qty, element) {
    selectedQuantity = qty;
    var options = document.querySelectorAll('.bundle-option');
    options.forEach(function(opt) { opt.classList.remove('active'); });
    element.classList.add('active');
    
    var radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    updateTotal();
  }

  function showHome() {
    document.getElementById('detail').style.display = 'none';
    document.getElementById('thankYouPage').style.display = 'none';
    document.getElementById('products').style.display = 'grid';
    document.getElementById('status').style.display = 'none';
    window.location.hash = '';
  }

  function showThankYouPage(productTitle, totalPrice) {
    document.getElementById('detail').style.display = 'none';
    document.getElementById('products').style.display = 'none';
    document.getElementById('thankYouPage').style.display = 'block';
    
    document.getElementById('tyProduct').textContent = productTitle;
    document.getElementById('tyTotal').textContent = totalPrice + ' دج';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // تتبع بيكسل فيسبوك لحدث الشراء مع القيمة
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Purchase', {
        value: totalPrice,
        currency: 'DZD',
        content_name: productTitle
      });
    }
  }

  function cleanText(html) {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeArabicNumbers(text) {
    var arabic = '٠١٢٣٤٥٦٧٨٩';
    return String(text || '').replace(/[٠-٩]/g, function (digit) {
      return arabic.indexOf(digit);
    });
  }

  function getImages(html) {
    var images = [];
    var regex = /<img[^>]+src=['"]([^'"]+)['"]/gi;
    var match;
    while ((match = regex.exec(html)) !== null) {
      if (images.indexOf(match[1]) === -1) {
        images.push(match[1]);
      }
    }
    return images;
  }

  // تحميل صورة المنتج الأولى مسبقًا بمجرد معرفة رابطها،
  // حتى لا ينتظر المتصفح فتح صفحة المنتج لإنشاء الصورة.
  function preloadMainImage(src) {
    if (!src || document.querySelector('link[data-main-image-preload=\"true\"]')) return;
    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.setAttribute('data-main-image-preload', 'true');
    document.head.appendChild(link);
  }

  function getPrice(html) {
    var text = normalizeArabicNumbers(cleanText(html));
    var match = text.match(/(?:سعر\s*المنتج|السعر)\s*[:：=]?\s*([\d]+(?:[.,]\d+)?)/);
    if (match) {
      return match[1].replace(/[.,]/g, '') + ' دج';
    }
    var generic = text.match(/([\d]+(?:[.,]\d+)?)\s*(?:دج|DA|da)/);
    if (generic) {
      return generic[1].replace(/[.,]/g, '') + ' دج';
    }
    return '';
  }

  function priceNumber(price) {
    return parseInt(String(price || '').replace(/[^\d]/g, ''), 10) || 0;
  }

  function renderProducts(entries) {
    var container = document.getElementById('products');
    container.innerHTML = '';
    products = [];

    entries.forEach(function (entry, index) {
      var title = entry.title && entry.title.$t ? entry.title.$t : 'منتج';
      var content = entry.content && entry.content.$t ? entry.content.$t : '';
      var images = getImages(content);
      var image = images.length ? images[0] : 'https://via.placeholder.com/600x600?text=Product';
      if (index === 0) preloadMainImage(image);
      var description = cleanText(content).substring(0, 100);
      var price = getPrice(content);

      products.push({
        id: index,
        title: title,
        content: content,
        images: images,
        price: price
      });

      var card = document.createElement('div');
      card.className = 'product-card';

      var html = '';
      html += '<a href="#product-' + index + '" onclick="showProduct(' + index + ')">';
      html += '<img class="product-card-image" src="' + image + '" alt=""/>';
      html += '</a>';
      html += '<div class="product-card-content">';
      html += '<div class="product-card-title">' + title + '</div>';
      html += '<div class="product-card-description">' + description + '</div>';
      if (price) {
        html += '<div class="product-card-price">' + price + '</div>';
      }
      html += '<a class="view-product" href="#product-' + index + '" onclick="showProduct(' + index + ')">عرض المنتج</a>';
      html += '</div>';

      card.innerHTML = html;
      container.appendChild(card);
    });

    document.getElementById('status').style.display = 'none';
    checkHashRoute();
  }

  function checkHashRoute() {
    var hash = window.location.hash;
    if (hash && hash.indexOf('#product-') === 0) {
      var idx = parseInt(hash.replace('#product-', ''), 10);
      if (!isNaN(idx) && products[idx]) {
        showProduct(idx);
      }
    }
  }

  function calculateBundlePrice(qty, unitPrice) {
    if (qty === 1) return unitPrice;
    if (qty === 2) return Math.round(unitPrice * 1.8);
    if (qty === 3) return Math.round(unitPrice * 2.5);
    return unitPrice * qty;
  }

  function updateTotal() {
    var productSubtotal = calculateBundlePrice(selectedQuantity, currentUnitProductPrice);
    var labelText = selectedQuantity === 1 ? 'محفظة واحدة' : (selectedQuantity === 2 ? 'محفظتان (2)' : 'ثلاث محافظ (3)');

    document.getElementById('qtyCount').textContent = labelText;
    document.getElementById('productPrice').textContent = productSubtotal + ' دج';

    var total = productSubtotal + currentDelivery;
    document.getElementById('orderTotal').textContent = total + ' دج';

    document.getElementById('btnPriceBadge').textContent = total + ' دج';
    document.getElementById('miniQtyBadge').textContent = labelText;
    document.getElementById('miniTotalPrice').textContent = productSubtotal + ' دج';
  }

  /* SLIDER FUNCTIONS */
  function updateSliderPosition() {
    var wrapper = document.getElementById('sliderWrapper');
    if (wrapper) {
      wrapper.style.transform = 'translateX(' + (currentSlideIndex * 100) + '%)';
    }
    var dots = document.querySelectorAll('.slider-dots .dot');
    dots.forEach(function (dot, idx) {
      if (idx === currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function nextSlide() {
    if (totalSlidesCount <= 0) return;
    currentSlideIndex++;
    if (currentSlideIndex >= totalSlidesCount) {
      currentSlideIndex = 0;
    }
    updateSliderPosition();
  }

  function prevSlide() {
    if (totalSlidesCount <= 0) return;
    currentSlideIndex--;
    if (currentSlideIndex < 0) {
      currentSlideIndex = totalSlidesCount - 1;
    }
    updateSliderPosition();
  }

  function goToSlide(index) {
    currentSlideIndex = index;
    updateSliderPosition();
  }

  function showProduct(index) {
    var product = products[index];
    if (!product) return;
    currentProductData = product;

    document.getElementById('products').style.display = 'none';
    document.getElementById('thankYouPage').style.display = 'none';
    document.getElementById('detail').style.display = 'block';

    document.getElementById('detailTitle').textContent = product.title;
    document.getElementById('detailPrice').textContent = product.price;
    document.getElementById('mobileDetailTitle').textContent = product.title;
    document.getElementById('mobileDetailPrice').textContent = product.price;

    document.getElementById('detailDescription').innerHTML = product.content;

    // إعداد المعرض والسلايدر
    var sliderWrapper = document.getElementById('sliderWrapper');
    var sliderDots = document.getElementById('sliderDots');
    sliderWrapper.innerHTML = '';
    sliderDots.innerHTML = '';

    var imgs = product.images.slice(0, GALLERY_IMAGES_COUNT);
    if (imgs.length === 0) {
      imgs = ['https://via.placeholder.com/600x600?text=Product'];
    }

    totalSlidesCount = imgs.length;
    currentSlideIndex = 0;

    imgs.forEach(function (src, idx) {
      var slide = document.createElement('div');
      slide.className = 'slider-slide';
      var isFirstSlide = idx === 0;
      slide.innerHTML = '<img src="' + src + '" alt="" width="800" height="800"' +
        (isFirstSlide ? ' loading="eager" fetchpriority="high"' : ' loading="lazy" fetchpriority="low"') +
        ' decoding="async" />';
      sliderWrapper.appendChild(slide);

      var dot = document.createElement('div');
      dot.className = 'dot' + (idx === 0 ? ' active' : '');
      dot.onclick = function () { goToSlide(idx); };
      sliderDots.appendChild(dot);
    });

    updateSliderPosition();
    setupOrderForm(product);
  }

  function setupOrderForm(product) {
    currentUnitProductPrice = priceNumber(product.price);
    currentDelivery = 0;
    selectedQuantity = 1;

    document.getElementById('bundlePrice1').textContent = currentUnitProductPrice + ' دج';
    document.getElementById('bundlePrice2').textContent = calculateBundlePrice(2, currentUnitProductPrice) + ' دج';
    document.getElementById('bundlePrice3').textContent = calculateBundlePrice(3, currentUnitProductPrice) + ' دج';

    document.getElementById('deliveryPrice').textContent = '0 دج';

    document.getElementById('miniProductTitle').textContent = product.title;
    document.getElementById('miniProductImg').src = product.images.length ? product.images[0] : 'https://via.placeholder.com/100';

    updateTotal();

    var wilaya = document.getElementById('wilaya');
    var commune = document.getElementById('commune');

    fetch(WILAYA_URL)
      .then(function (response) { return response.json(); })
      .then(function (list) {
        wilaya.innerHTML = '<option value="">اختر الولاية</option>';
        list.forEach(function (item) {
          var option = document.createElement('option');
          option.value = String(item.code);
          option.textContent = item.code + ' - ' + item.ar_name;
          wilaya.appendChild(option);
        });
      })
      .catch(function () {
        wilaya.innerHTML = '<option value="">تعذر تحميل الولايات</option>';
      });

    wilaya.onchange = function () {
      var code = String(wilaya.value);
      currentDelivery = DELIVERY_PRICES[code] || 0;
      document.getElementById('deliveryPrice').textContent = currentDelivery + ' دج';
      updateTotal();

      if (!code) {
        commune.disabled = true;
        commune.innerHTML = '<option value="">اختر البلدية</option>';
        return;
      }

      commune.disabled = true;
      commune.innerHTML = '<option value="">جاري التحميل...</option>';

      if (communesData) {
        fillCommunes(code);
      } else {
        fetch(COMMUNE_URL)
          .then(function (res) { return res.json(); })
          .then(function (data) {
            communesData = data;
            fillCommunes(code);
          });
      }
    };
  }

  function fillCommunes(wilayaCode) {
    var commune = document.getElementById('commune');
    commune.innerHTML = '<option value="">اختر البلدية</option>';
    
    var filtered = communesData.filter(function (c) {
      return String(c.wilaya_id) === String(wilayaCode);
    });

    filtered.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.ar_name;
      opt.textContent = c.ar_name;
      commune.appendChild(opt);
    });

    commune.disabled = false;
  }

  function submitOrder() {
    var name = document.getElementById('customerName').value.trim();
    var phone = document.getElementById('customerPhone').value.trim();
    var wilayaSelect = document.getElementById('wilaya');
    var wilayaText = wilayaSelect.options[wilayaSelect.selectedIndex] ? wilayaSelect.options[wilayaSelect.selectedIndex].text : '';
    var commune = document.getElementById('commune').value;
    var msg = document.getElementById('orderMessage');
    var btn = document.getElementById('sendOrder');

    if (!name || !phone || !wilayaSelect.value || !commune) {
      msg.style.color = 'red';
      msg.textContent = 'يرجى ملء جميع الحقول أولاً!';
      return;
    }

    btn.disabled = true;
    msg.style.color = '#333';
    msg.textContent = 'جاري إرسال الطلب...';

    var productSubtotal = calculateBundlePrice(selectedQuantity, currentUnitProductPrice);
    var totalPrice = productSubtotal + currentDelivery;

    var orderData = {
      product: currentProductData ? currentProductData.title : '',
      quantity: selectedQuantity,
     
      name: name,
      phone: phone,
      wilaya: wilayaText,
      commune: commune,
      shipping: currentDelivery,
      total: totalPrice
      
    };

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function () {
      btn.disabled = false;
      msg.textContent = '';
      
      // التوجيه لصفحة الشكر و إطلاق حدث البيكسل Purchase
      showThankYouPage(orderData.product, totalPrice);
    })
    .catch(function () {
      btn.disabled = false;
      msg.style.color = 'red';
      msg.textContent = 'حدث خطأ في الإرسال، حاول مجدداً.';
    });
  }

  // تحميل المنتجات من Blogger.
  // إذا منع المتصفح fetch بسبب CORS، نستخدم JSONP كحل احتياطي.
  function loadProducts() {
    var status = document.getElementById('status');
    status.textContent = 'جاري تحميل المنتجات...';

    fetch(FEED_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.feed && data.feed.entry) {
          renderProducts(data.feed.entry);
        } else {
          throw new Error('Invalid Blogger feed');
        }
      })
      .catch(function () {
        loadProductsJSONP();
      });
  }

  function loadProductsJSONP() {
    var status = document.getElementById('status');
    var callbackName = 'bloggerProductsCallback_' + Date.now();
    var scriptTag = document.createElement('script');

    window[callbackName] = function (data) {
      try {
        if (data && data.feed && data.feed.entry) {
          renderProducts(data.feed.entry);
        } else {
          status.textContent = 'لا توجد منتجات حالياً.';
        }
      } catch (e) {
        status.textContent = 'حدث خطأ أثناء تحميل المنتجات.';
      } finally {
        delete window[callbackName];
        if (scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
      }
    };

    scriptTag.src = BLOG_URL +
      '/feeds/posts/default?alt=json-in-script&max-results=50&callback=' +
      encodeURIComponent(callbackName);

    scriptTag.onerror = function () {
      status.textContent = 'تعذر الاتصال بمصدر المنتجات.';
      delete window[callbackName];
      if (scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    };

    document.head.appendChild(scriptTag);
  }

  window.addEventListener('load', function () {
    loadProducts();
  });
