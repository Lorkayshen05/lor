/**
 * "Core" translations: the strings a customer needs to find the menu, start an order and
 * pick a language. Anything not listed here falls back to English (or zh-TW for Cantonese).
 *
 * ⚠️  These are NOT professionally verified. They need native-speaker review before
 * production — Cantonese (written colloquial conventions) especially. Hokkien has no
 * own entry and shows Traditional Chinese until a validated translation exists.
 *
 * Values are positional, matching CORE_KEYS.
 */
export const CORE_KEYS = [
  'nav.home',
  'nav.menu',
  'nav.discover',
  'nav.cart',
  'nav.orders',
  'orderType.dineIn',
  'orderType.takeAway',
  'common.add',
  'common.total',
  'hero.orderNow',
  'firstTime.title',
  'firstTime.subtitle',
  'welcomeBack.title',
  'welcomeBack.subtitle',
  'welcomeBack.orderAgain',
  'labels.tryNew',
  'cart.title',
  'cart.checkout',
  'checkout.place',
  'confirmation.title',
  'menu.searchLabel',
  'language.choose',
] as const;

const ROWS: Record<string, readonly string[]> = {
  id: ['Beranda', 'Menu', 'Jelajahi', 'Keranjang', 'Pesanan', 'Makan di tempat', 'Bawa pulang', 'Tambah', 'Total', 'Pesan sekarang', 'Pertama kali ke sini?', 'Bingung mau pesan apa? Mulai dari sini.', 'Selamat datang kembali', 'Siap mencoba yang berbeda?', 'Pesan lagi', 'Coba yang baru', 'Keranjang Anda', 'Bayar', 'Kirim pesanan', 'Pesanan diterima', 'Cari menu', 'Pilih bahasa'],
  yue: ['主頁', '餐牌', '探索', '購物車', '訂單', '堂食', '外賣', '加入', '總數', '即刻落單', '第一次嚟？', '唔知食咩好？由呢度開始。', '歡迎返嚟', '想試吓啲唔同嘅嘢？', '再叫一次', '試吓新嘢', '你嘅購物車', '結帳', '落單', '收到訂單', '搜尋餐牌', '揀語言'],
  ja: ['ホーム', 'メニュー', '発見', 'カート', '注文履歴', '店内', 'お持ち帰り', '追加', '合計', '今すぐ注文', '初めての方へ', '何を頼むか迷ったら、まずはこちら。', 'おかえりなさい', '今日は違うものを試してみませんか？', 'もう一度注文', '新しいものを試す', 'カート', 'お会計', '注文する', 'ご注文を受け付けました', 'メニューを検索', '言語を選択'],
  ko: ['홈', '메뉴', '둘러보기', '장바구니', '주문 내역', '매장 식사', '포장', '추가', '합계', '지금 주문', '처음 오셨나요?', '무엇을 주문할지 모르시겠나요? 여기서 시작하세요.', '다시 오신 것을 환영합니다', '다른 메뉴를 먹어볼까요?', '다시 주문', '새로운 메뉴 도전', '장바구니', '결제하기', '주문하기', '주문이 접수되었습니다', '메뉴 검색', '언어 선택'],
  th: ['หน้าแรก', 'เมนู', 'ค้นพบ', 'ตะกร้า', 'ออเดอร์', 'ทานที่ร้าน', 'กลับบ้าน', 'เพิ่ม', 'รวม', 'สั่งเลย', 'มาครั้งแรกใช่ไหม?', 'ไม่แน่ใจว่าจะสั่งอะไร? เริ่มที่นี่', 'ยินดีต้อนรับกลับมา', 'พร้อมลองอะไรใหม่ๆ ไหม?', 'สั่งอีกครั้ง', 'ลองของใหม่', 'ตะกร้าของคุณ', 'ชำระเงิน', 'สั่งอาหาร', 'ได้รับออเดอร์แล้ว', 'ค้นหาเมนู', 'เลือกภาษา'],
  vi: ['Trang chủ', 'Thực đơn', 'Khám phá', 'Giỏ hàng', 'Đơn hàng', 'Ăn tại chỗ', 'Mang đi', 'Thêm', 'Tổng cộng', 'Đặt món ngay', 'Lần đầu đến đây?', 'Chưa biết gọi gì? Hãy bắt đầu từ đây.', 'Chào mừng trở lại', 'Sẵn sàng thử món mới?', 'Đặt lại', 'Thử món mới', 'Giỏ hàng của bạn', 'Thanh toán', 'Đặt đơn', 'Đã nhận đơn hàng', 'Tìm trong thực đơn', 'Chọn ngôn ngữ'],
  ta: ['முகப்பு', 'மெனு', 'கண்டறி', 'கூடை', 'ஆர்டர்கள்', 'உணவகத்தில் சாப்பிட', 'எடுத்துச் செல்ல', 'சேர்', 'மொத்தம்', 'இப்போது ஆர்டர் செய்யுங்கள்', 'முதல்முறையாக வருகிறீர்களா?', 'என்ன ஆர்டர் செய்வது என்று தெரியவில்லையா? இங்கே தொடங்குங்கள்.', 'மீண்டும் வருக', 'வித்தியாசமாக ஏதாவது முயற்சிக்கத் தயாரா?', 'மீண்டும் ஆர்டர் செய்', 'புதியதை முயற்சி செய்', 'உங்கள் கூடை', 'செக்அவுட்', 'ஆர்டரை அனுப்பு', 'ஆர்டர் பெறப்பட்டது', 'மெனுவில் தேடு', 'மொழியைத் தேர்ந்தெடுக்கவும்'],
  hi: ['होम', 'मेन्यू', 'खोजें', 'कार्ट', 'ऑर्डर', 'यहीं खाएँ', 'टेकअवे', 'जोड़ें', 'कुल', 'अभी ऑर्डर करें', 'पहली बार आए हैं?', 'क्या ऑर्डर करें, समझ नहीं आ रहा? यहाँ से शुरू करें।', 'वापसी पर स्वागत है', 'कुछ नया आज़माने के लिए तैयार?', 'फिर से ऑर्डर करें', 'कुछ नया आज़माएँ', 'आपका कार्ट', 'चेकआउट', 'ऑर्डर दें', 'ऑर्डर प्राप्त हुआ', 'मेन्यू खोजें', 'भाषा चुनें'],
  bn: ['হোম', 'মেনু', 'আবিষ্কার', 'কার্ট', 'অর্ডার', 'এখানে খান', 'টেকঅ্যাওয়ে', 'যোগ করুন', 'মোট', 'এখনই অর্ডার করুন', 'প্রথমবার এসেছেন?', 'কী অর্ডার করবেন বুঝতে পারছেন না? এখান থেকে শুরু করুন।', 'আবার স্বাগতম', 'নতুন কিছু চেখে দেখতে প্রস্তুত?', 'আবার অর্ডার করুন', 'নতুন কিছু চেখে দেখুন', 'আপনার কার্ট', 'চেকআউট', 'অর্ডার দিন', 'অর্ডার পাওয়া গেছে', 'মেনুতে খুঁজুন', 'ভাষা বেছে নিন'],
  ur: ['ہوم', 'مینو', 'دریافت کریں', 'کارٹ', 'آرڈرز', 'یہیں کھائیں', 'ٹیک اوے', 'شامل کریں', 'کل', 'ابھی آرڈر کریں', 'پہلی بار آئے ہیں؟', 'سمجھ نہیں آ رہا کیا آرڈر کریں؟ یہاں سے شروع کریں۔', 'خوش آمدید', 'کچھ مختلف آزمانے کے لیے تیار ہیں؟', 'دوبارہ آرڈر کریں', 'کچھ نیا آزمائیں', 'آپ کی کارٹ', 'چیک آؤٹ', 'آرڈر دیں', 'آرڈر موصول ہو گیا', 'مینو تلاش کریں', 'زبان منتخب کریں'],
  pa: ['ਹੋਮ', 'ਮੀਨੂ', 'ਖੋਜੋ', 'ਕਾਰਟ', 'ਆਰਡਰ', 'ਇੱਥੇ ਖਾਓ', 'ਟੇਕਅਵੇ', 'ਸ਼ਾਮਲ ਕਰੋ', 'ਕੁੱਲ', 'ਹੁਣੇ ਆਰਡਰ ਕਰੋ', 'ਪਹਿਲੀ ਵਾਰ ਆਏ ਹੋ?', 'ਪਤਾ ਨਹੀਂ ਕੀ ਆਰਡਰ ਕਰਨਾ ਹੈ? ਇੱਥੋਂ ਸ਼ੁਰੂ ਕਰੋ।', 'ਵਾਪਸੀ ਤੇ ਸਵਾਗਤ ਹੈ', 'ਕੁਝ ਵੱਖਰਾ ਅਜ਼ਮਾਉਣ ਲਈ ਤਿਆਰ ਹੋ?', 'ਦੁਬਾਰਾ ਆਰਡਰ ਕਰੋ', 'ਕੁਝ ਨਵਾਂ ਅਜ਼ਮਾਓ', 'ਤੁਹਾਡੀ ਕਾਰਟ', 'ਚੈੱਕਆਊਟ', 'ਆਰਡਰ ਦਿਓ', 'ਆਰਡਰ ਪ੍ਰਾਪਤ ਹੋਇਆ', 'ਮੀਨੂ ਖੋਜੋ', 'ਭਾਸ਼ਾ ਚੁਣੋ'],
  gu: ['હોમ', 'મેનુ', 'શોધો', 'કાર્ટ', 'ઓર્ડર', 'અહીં જમો', 'ટેકઅવે', 'ઉમેરો', 'કુલ', 'હમણાં ઓર્ડર કરો', 'પ્રથમ વાર આવ્યા છો?', 'શું ઓર્ડર કરવું તે ખબર નથી? અહીંથી શરૂ કરો.', 'ફરી સ્વાગત છે', 'કંઈક અલગ અજમાવવા તૈયાર છો?', 'ફરી ઓર્ડર કરો', 'કંઈક નવું અજમાવો', 'તમારું કાર્ટ', 'ચેકઆઉટ', 'ઓર્ડર આપો', 'ઓર્ડર મળી ગયો', 'મેનુમાં શોધો', 'ભાષા પસંદ કરો'],
  te: ['హోమ్', 'మెనూ', 'అన్వేషించండి', 'కార్ట్', 'ఆర్డర్లు', 'ఇక్కడే తినండి', 'టేక్‌అవే', 'జోడించు', 'మొత్తం', 'ఇప్పుడే ఆర్డర్ చేయండి', 'మొదటిసారి వచ్చారా?', 'ఏం ఆర్డర్ చేయాలో తెలియదా? ఇక్కడ నుండి ప్రారంభించండి.', 'తిరిగి స్వాగతం', 'కొత్తగా ఏదైనా ప్రయత్నించడానికి సిద్ధమా?', 'మళ్లీ ఆర్డర్ చేయండి', 'కొత్తది ప్రయత్నించండి', 'మీ కార్ట్', 'చెక్అవుట్', 'ఆర్డర్ చేయండి', 'ఆర్డర్ అందింది', 'మెనూలో వెతకండి', 'భాషను ఎంచుకోండి'],
  mr: ['मुख्यपृष्ठ', 'मेनू', 'शोधा', 'कार्ट', 'ऑर्डर', 'इथेच खा', 'टेकअवे', 'जोडा', 'एकूण', 'आता ऑर्डर करा', 'पहिल्यांदाच आलात का?', 'काय ऑर्डर करावे ते कळत नाही? इथून सुरू करा.', 'पुन्हा स्वागत', 'काहीतरी वेगळे चाखायला तयार?', 'पुन्हा ऑर्डर करा', 'काहीतरी नवीन चाखा', 'तुमचे कार्ट', 'चेकआउट', 'ऑर्डर द्या', 'ऑर्डर मिळाली', 'मेनूमध्ये शोधा', 'भाषा निवडा'],
  kn: ['ಮುಖಪುಟ', 'ಮೆನು', 'ಅನ್ವೇಷಿಸಿ', 'ಕಾರ್ಟ್', 'ಆರ್ಡರ್‌ಗಳು', 'ಇಲ್ಲೇ ಊಟ ಮಾಡಿ', 'ಟೇಕ್‌ಅವೇ', 'ಸೇರಿಸಿ', 'ಒಟ್ಟು', 'ಈಗಲೇ ಆರ್ಡರ್ ಮಾಡಿ', 'ಮೊದಲ ಬಾರಿಗೆ ಬಂದಿದ್ದೀರಾ?', 'ಏನು ಆರ್ಡರ್ ಮಾಡಬೇಕೆಂದು ತಿಳಿಯುತ್ತಿಲ್ಲವೇ? ಇಲ್ಲಿಂದ ಪ್ರಾರಂಭಿಸಿ.', 'ಮತ್ತೆ ಸ್ವಾಗತ', 'ಏನಾದರೂ ಹೊಸದನ್ನು ಪ್ರಯತ್ನಿಸಲು ಸಿದ್ಧರೇ?', 'ಮತ್ತೆ ಆರ್ಡರ್ ಮಾಡಿ', 'ಹೊಸದನ್ನು ಪ್ರಯತ್ನಿಸಿ', 'ನಿಮ್ಮ ಕಾರ್ಟ್', 'ಚೆಕ್‌ಔಟ್', 'ಆರ್ಡರ್ ಮಾಡಿ', 'ಆರ್ಡರ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ', 'ಮೆನುವಿನಲ್ಲಿ ಹುಡುಕಿ', 'ಭಾಷೆಯನ್ನು ಆರಿಸಿ'],
  ml: ['ഹോം', 'മെനു', 'കണ്ടെത്തുക', 'കാർട്ട്', 'ഓർഡറുകൾ', 'ഇവിടെ കഴിക്കാം', 'ടേക്ക്അവേ', 'ചേർക്കുക', 'ആകെ', 'ഇപ്പോൾ ഓർഡർ ചെയ്യൂ', 'ആദ്യമായാണോ?', 'എന്ത് ഓർഡർ ചെയ്യണമെന്ന് അറിയില്ലേ? ഇവിടെ തുടങ്ങൂ.', 'വീണ്ടും സ്വാഗതം', 'വ്യത്യസ്തമായ എന്തെങ്കിലും പരീക്ഷിക്കാൻ തയ്യാറാണോ?', 'വീണ്ടും ഓർഡർ ചെയ്യൂ', 'പുതിയത് പരീക്ഷിക്കൂ', 'നിങ്ങളുടെ കാർട്ട്', 'ചെക്ക്ഔട്ട്', 'ഓർഡർ നൽകൂ', 'ഓർഡർ ലഭിച്ചു', 'മെനുവിൽ തിരയുക', 'ഭാഷ തിരഞ്ഞെടുക്കുക'],
  fil: ['Home', 'Menu', 'Tuklasin', 'Cart', 'Mga order', 'Kain dito', 'Take away', 'Idagdag', 'Kabuuan', 'Umorder na', 'Unang beses dito?', 'Hindi sigurado kung ano ang oorderin? Magsimula rito.', 'Welcome back', 'Handa ka bang sumubok ng iba?', 'Umorder muli', 'Sumubok ng bago', 'Iyong cart', 'Checkout', 'Ipadala ang order', 'Natanggap na ang order', 'Maghanap sa menu', 'Pumili ng wika'],
  fa: ['خانه', 'منو', 'کاوش', 'سبد خرید', 'سفارش‌ها', 'صرف در محل', 'بیرون‌بر', 'افزودن', 'جمع کل', 'همین حالا سفارش دهید', 'اولین بار است؟', 'نمی‌دانید چه سفارش دهید؟ از اینجا شروع کنید.', 'دوباره خوش آمدید', 'آماده‌اید چیز متفاوتی امتحان کنید؟', 'سفارش مجدد', 'چیز تازه‌ای امتحان کنید', 'سبد خرید شما', 'پرداخت', 'ثبت سفارش', 'سفارش دریافت شد', 'جستجو در منو', 'انتخاب زبان'],
  he: ['בית', 'תפריט', 'גלו', 'עגלה', 'הזמנות', 'לאכול במקום', 'טייק אוויי', 'הוספה', 'סה״כ', 'להזמין עכשיו', 'פעם ראשונה כאן?', 'לא בטוחים מה להזמין? התחילו כאן.', 'ברוכים השבים', 'מוכנים לנסות משהו אחר?', 'להזמין שוב', 'לנסות משהו חדש', 'העגלה שלכם', 'לתשלום', 'שליחת ההזמנה', 'ההזמנה התקבלה', 'חיפוש בתפריט', 'בחירת שפה'],
  fr: ['Accueil', 'Menu', 'Découvrir', 'Panier', 'Commandes', 'Sur place', 'À emporter', 'Ajouter', 'Total', 'Commander', 'Première visite ?', 'Vous hésitez ? Commencez ici.', 'Bon retour', 'Envie de découvrir autre chose ?', 'Commander à nouveau', 'Essayer du nouveau', 'Votre panier', 'Paiement', 'Envoyer la commande', 'Commande reçue', 'Rechercher dans le menu', 'Choisir la langue'],
  de: ['Start', 'Speisekarte', 'Entdecken', 'Warenkorb', 'Bestellungen', 'Vor Ort', 'Zum Mitnehmen', 'Hinzufügen', 'Gesamt', 'Jetzt bestellen', 'Zum ersten Mal hier?', 'Unsicher, was Sie bestellen sollen? Starten Sie hier.', 'Willkommen zurück', 'Lust auf etwas Neues?', 'Erneut bestellen', 'Etwas Neues probieren', 'Ihr Warenkorb', 'Zur Kasse', 'Bestellung senden', 'Bestellung erhalten', 'Speisekarte durchsuchen', 'Sprache wählen'],
  es: ['Inicio', 'Menú', 'Descubrir', 'Carrito', 'Pedidos', 'Para comer aquí', 'Para llevar', 'Añadir', 'Total', 'Pedir ahora', '¿Primera vez aquí?', '¿No sabes qué pedir? Empieza aquí.', 'Bienvenido de nuevo', '¿Listo para probar algo diferente?', 'Pedir de nuevo', 'Probar algo nuevo', 'Tu carrito', 'Pagar', 'Enviar pedido', 'Pedido recibido', 'Buscar en el menú', 'Elegir idioma'],
  it: ['Home', 'Menu', 'Scopri', 'Carrello', 'Ordini', 'Al tavolo', 'Da asporto', 'Aggiungi', 'Totale', 'Ordina ora', 'Prima volta qui?', 'Non sai cosa ordinare? Parti da qui.', 'Bentornato', 'Pronto a provare qualcosa di diverso?', 'Ordina di nuovo', 'Prova qualcosa di nuovo', 'Il tuo carrello', 'Cassa', 'Invia ordine', 'Ordine ricevuto', 'Cerca nel menu', 'Scegli la lingua'],
  pt: ['Início', 'Cardápio', 'Descobrir', 'Carrinho', 'Pedidos', 'Comer aqui', 'Para levar', 'Adicionar', 'Total', 'Pedir agora', 'Primeira vez aqui?', 'Não sabe o que pedir? Comece aqui.', 'Bem-vindo de volta', 'Pronto para experimentar algo diferente?', 'Pedir novamente', 'Experimentar algo novo', 'Seu carrinho', 'Finalizar', 'Enviar pedido', 'Pedido recebido', 'Pesquisar no cardápio', 'Escolher idioma'],
  nl: ['Home', 'Menu', 'Ontdekken', 'Winkelmand', 'Bestellingen', 'Hier eten', 'Meenemen', 'Toevoegen', 'Totaal', 'Nu bestellen', 'Voor het eerst hier?', 'Weet je niet wat je moet bestellen? Begin hier.', 'Welkom terug', 'Zin om iets anders te proberen?', 'Opnieuw bestellen', 'Iets nieuws proberen', 'Je winkelmand', 'Afrekenen', 'Bestelling plaatsen', 'Bestelling ontvangen', 'Zoeken in het menu', 'Taal kiezen'],
  ru: ['Главная', 'Меню', 'Открыть для себя', 'Корзина', 'Заказы', 'В зале', 'С собой', 'Добавить', 'Итого', 'Заказать', 'Впервые у нас?', 'Не знаете, что заказать? Начните здесь.', 'С возвращением', 'Готовы попробовать что-то новое?', 'Заказать снова', 'Попробовать новое', 'Ваша корзина', 'Оформить заказ', 'Отправить заказ', 'Заказ получен', 'Поиск по меню', 'Выберите язык'],
  uk: ['Головна', 'Меню', 'Відкрийте для себе', 'Кошик', 'Замовлення', 'У залі', 'З собою', 'Додати', 'Разом', 'Замовити', 'Вперше тут?', 'Не знаєте, що замовити? Почніть тут.', 'З поверненням', 'Готові спробувати щось нове?', 'Замовити знову', 'Спробувати нове', 'Ваш кошик', 'Оформити замовлення', 'Надіслати замовлення', 'Замовлення отримано', 'Пошук по меню', 'Оберіть мову'],
  pl: ['Start', 'Menu', 'Odkrywaj', 'Koszyk', 'Zamówienia', 'Na miejscu', 'Na wynos', 'Dodaj', 'Razem', 'Zamów teraz', 'Pierwszy raz u nas?', 'Nie wiesz, co zamówić? Zacznij tutaj.', 'Witaj ponownie', 'Gotowy spróbować czegoś innego?', 'Zamów ponownie', 'Spróbuj czegoś nowego', 'Twój koszyk', 'Do kasy', 'Złóż zamówienie', 'Zamówienie przyjęte', 'Szukaj w menu', 'Wybierz język'],
  cs: ['Domů', 'Nabídka', 'Objevujte', 'Košík', 'Objednávky', 'Na místě', 'S sebou', 'Přidat', 'Celkem', 'Objednat', 'Poprvé u nás?', 'Nevíte, co si dát? Začněte tady.', 'Vítejte zpět', 'Chcete zkusit něco jiného?', 'Objednat znovu', 'Vyzkoušet něco nového', 'Váš košík', 'Pokladna', 'Odeslat objednávku', 'Objednávka přijata', 'Hledat v nabídce', 'Vybrat jazyk'],
  sk: ['Domov', 'Ponuka', 'Objavujte', 'Košík', 'Objednávky', 'Na mieste', 'So sebou', 'Pridať', 'Spolu', 'Objednať', 'Prvýkrát u nás?', 'Neviete, čo si dať? Začnite tu.', 'Vitajte späť', 'Chcete vyskúšať niečo iné?', 'Objednať znova', 'Vyskúšať niečo nové', 'Váš košík', 'Pokladňa', 'Odoslať objednávku', 'Objednávka prijatá', 'Hľadať v ponuke', 'Vybrať jazyk'],
  hu: ['Kezdőlap', 'Étlap', 'Felfedezés', 'Kosár', 'Rendelések', 'Helyben fogyasztás', 'Elvitel', 'Hozzáadás', 'Összesen', 'Rendelés most', 'Először jár nálunk?', 'Nem tudja, mit rendeljen? Kezdje itt.', 'Üdv újra', 'Készen áll valami újat kipróbálni?', 'Rendelés újra', 'Próbáljon ki valami újat', 'Az Ön kosara', 'Pénztár', 'Rendelés leadása', 'Rendelés megérkezett', 'Keresés az étlapon', 'Nyelv kiválasztása'],
  ro: ['Acasă', 'Meniu', 'Descoperă', 'Coș', 'Comenzi', 'La masă', 'La pachet', 'Adaugă', 'Total', 'Comandă acum', 'Prima dată aici?', 'Nu știi ce să comanzi? Începe aici.', 'Bine ai revenit', 'Ești gata să încerci ceva diferit?', 'Comandă din nou', 'Încearcă ceva nou', 'Coșul tău', 'Finalizare', 'Trimite comanda', 'Comandă primită', 'Caută în meniu', 'Alege limba'],
  el: ['Αρχική', 'Μενού', 'Ανακάλυψη', 'Καλάθι', 'Παραγγελίες', 'Στο μαγαζί', 'Για πακέτο', 'Προσθήκη', 'Σύνολο', 'Παραγγείλτε τώρα', 'Πρώτη φορά εδώ;', 'Δεν ξέρετε τι να παραγγείλετε; Ξεκινήστε από εδώ.', 'Καλώς ήρθατε ξανά', 'Έτοιμοι να δοκιμάσετε κάτι διαφορετικό;', 'Παραγγελία ξανά', 'Δοκιμάστε κάτι νέο', 'Το καλάθι σας', 'Ταμείο', 'Υποβολή παραγγελίας', 'Η παραγγελία ελήφθη', 'Αναζήτηση στο μενού', 'Επιλογή γλώσσας'],
  tr: ['Ana sayfa', 'Menü', 'Keşfet', 'Sepet', 'Siparişler', 'Yerinde', 'Paket', 'Ekle', 'Toplam', 'Şimdi sipariş ver', 'İlk kez mi geldiniz?', 'Ne sipariş edeceğinizi bilmiyor musunuz? Buradan başlayın.', 'Tekrar hoş geldiniz', 'Farklı bir şey denemeye hazır mısınız?', 'Tekrar sipariş ver', 'Yeni bir şey dene', 'Sepetiniz', 'Ödeme', 'Siparişi gönder', 'Sipariş alındı', 'Menüde ara', 'Dil seçin'],
  sw: ['Mwanzo', 'Menyu', 'Gundua', 'Kikapu', 'Oda', 'Kula hapa', 'Chukua', 'Ongeza', 'Jumla', 'Agiza sasa', 'Mara yako ya kwanza hapa?', 'Huna uhakika cha kuagiza? Anzia hapa.', 'Karibu tena', 'Uko tayari kujaribu kitu tofauti?', 'Agiza tena', 'Jaribu kitu kipya', 'Kikapu chako', 'Lipa', 'Tuma oda', 'Oda imepokelewa', 'Tafuta kwenye menyu', 'Chagua lugha'],
  km: ['ទំព័រដើម', 'ម៉ឺនុយ', 'ស្វែងរក', 'កន្ត្រក', 'ការកម្មង់', 'ញ៉ាំនៅទីនេះ', 'ខ្ចប់ត្រលប់', 'បន្ថែម', 'សរុប', 'កម្មង់ឥឡូវនេះ', 'មកលើកដំបូងមែនទេ?', 'មិនដឹងកម្មង់អ្វីទេ? ចាប់ផ្តើមនៅទីនេះ។', 'សូមស្វាគមន៍ការត្រឡប់មកវិញ', 'ត្រៀមខ្លួនសាកល្បងអ្វីផ្សេងទេ?', 'កម្មង់ម្តងទៀត', 'សាកល្បងអ្វីថ្មី', 'កន្ត្រករបស់អ្នក', 'ទូទាត់', 'ផ្ញើការកម្មង់', 'បានទទួលការកម្មង់', 'ស្វែងរកក្នុងម៉ឺនុយ', 'ជ្រើសរើសភាសា'],
  lo: ['ໜ້າຫຼັກ', 'ເມນູ', 'ຄົ້ນພົບ', 'ກະຕ່າ', 'ຄຳສັ່ງ', 'ກິນຢູ່ຮ້ານ', 'ເອົາກັບບ້ານ', 'ເພີ່ມ', 'ລວມ', 'ສັ່ງດຽວນີ້', 'ມາເປັນຄັ້ງທຳອິດບໍ?', 'ບໍ່ແນ່ໃຈວ່າຈະສັ່ງຫຍັງ? ເລີ່ມທີ່ນີ້.', 'ຍິນດີຕ້ອນຮັບກັບມາ', 'ພ້ອມລອງສິ່ງໃໝ່ບໍ?', 'ສັ່ງອີກຄັ້ງ', 'ລອງສິ່ງໃໝ່', 'ກະຕ່າຂອງທ່ານ', 'ຊຳລະເງິນ', 'ສົ່ງຄຳສັ່ງ', 'ໄດ້ຮັບຄຳສັ່ງແລ້ວ', 'ຄົ້ນຫາໃນເມນູ', 'ເລືອກພາສາ'],
  my: ['ပင်မစာမျက်နှာ', 'မီနူး', 'ရှာဖွေရန်', 'ခြင်းတောင်း', 'အော်ဒါများ', 'ဆိုင်တွင်စားရန်', 'ပါဆယ်ယူရန်', 'ထည့်ရန်', 'စုစုပေါင်း', 'ယခုမှာယူပါ', 'ပထမဆုံးအကြိမ်လား?', 'ဘာမှာရမှန်း မသေချာဘူးလား? ဒီကနေ စတင်ပါ။', 'ပြန်လည်ကြိုဆိုပါတယ်', 'ကွဲပြားတာတစ်ခု စမ်းကြည့်ဖို့ အဆင်သင့်လား?', 'ထပ်မံမှာယူရန်', 'အသစ်တစ်ခု စမ်းကြည့်ရန်', 'သင့်ခြင်းတောင်း', 'ငွေရှင်းရန်', 'အော်ဒါပို့ရန်', 'အော်ဒါလက်ခံရရှိပါပြီ', 'မီနူးတွင်ရှာရန်', 'ဘာသာစကားရွေးပါ'],
  si: ['මුල් පිටුව', 'මෙනුව', 'සොයා ගන්න', 'කූඩය', 'ඇණවුම්', 'මෙහි අනුභව කරන්න', 'රැගෙන යාමට', 'එක් කරන්න', 'මුළු එකතුව', 'දැන්ම ඇණවුම් කරන්න', 'පළමු වරටද?', 'ඇණවුම් කළ යුත්තේ කුමක්දැයි විශ්වාස නැද්ද? මෙතැනින් පටන් ගන්න.', 'නැවත සාදරයෙන් පිළිගනිමු', 'වෙනස් දෙයක් උත්සාහ කිරීමට සූදානම්ද?', 'නැවත ඇණවුම් කරන්න', 'අලුත් දෙයක් උත්සාහ කරන්න', 'ඔබේ කූඩය', 'ගෙවීමට යන්න', 'ඇණවුම යවන්න', 'ඇණවුම ලැබුණා', 'මෙනුවේ සොයන්න', 'භාෂාව තෝරන්න'],
  ne: ['गृहपृष्ठ', 'मेनु', 'अन्वेषण', 'कार्ट', 'अर्डरहरू', 'यहीँ खाने', 'टेकअवे', 'थप्नुहोस्', 'जम्मा', 'अहिले अर्डर गर्नुहोस्', 'पहिलो पटक आउनुभएको हो?', 'के अर्डर गर्ने थाहा छैन? यहाँबाट सुरु गर्नुहोस्।', 'फेरि स्वागत छ', 'केही फरक प्रयास गर्न तयार हुनुहुन्छ?', 'फेरि अर्डर गर्नुहोस्', 'केही नयाँ प्रयास गर्नुहोस्', 'तपाईंको कार्ट', 'चेकआउट', 'अर्डर पठाउनुहोस्', 'अर्डर प्राप्त भयो', 'मेनुमा खोज्नुहोस्', 'भाषा छान्नुहोस्'],
  da: ['Hjem', 'Menu', 'Udforsk', 'Kurv', 'Ordrer', 'Spis her', 'Take away', 'Tilføj', 'I alt', 'Bestil nu', 'Første gang her?', 'Usikker på hvad du skal bestille? Start her.', 'Velkommen tilbage', 'Klar til at prøve noget andet?', 'Bestil igen', 'Prøv noget nyt', 'Din kurv', 'Gå til kassen', 'Afgiv ordre', 'Ordre modtaget', 'Søg i menuen', 'Vælg sprog'],
  sv: ['Hem', 'Meny', 'Upptäck', 'Varukorg', 'Beställningar', 'Äta här', 'Ta med', 'Lägg till', 'Totalt', 'Beställ nu', 'Första gången här?', 'Osäker på vad du ska beställa? Börja här.', 'Välkommen tillbaka', 'Redo att prova något annat?', 'Beställ igen', 'Prova något nytt', 'Din varukorg', 'Till kassan', 'Lägg beställning', 'Beställning mottagen', 'Sök i menyn', 'Välj språk'],
  no: ['Hjem', 'Meny', 'Oppdag', 'Handlekurv', 'Bestillinger', 'Spis her', 'Ta med', 'Legg til', 'Totalt', 'Bestill nå', 'Første gang her?', 'Usikker på hva du skal bestille? Start her.', 'Velkommen tilbake', 'Klar for å prøve noe annerledes?', 'Bestill på nytt', 'Prøv noe nytt', 'Handlekurven din', 'Gå til kassen', 'Send bestilling', 'Bestilling mottatt', 'Søk i menyen', 'Velg språk'],
  fi: ['Etusivu', 'Ruokalista', 'Tutustu', 'Ostoskori', 'Tilaukset', 'Syö paikan päällä', 'Ota mukaan', 'Lisää', 'Yhteensä', 'Tilaa nyt', 'Ensimmäistä kertaa täällä?', 'Etkö tiedä mitä tilata? Aloita tästä.', 'Tervetuloa takaisin', 'Valmiina kokeilemaan jotain uutta?', 'Tilaa uudelleen', 'Kokeile jotain uutta', 'Ostoskorisi', 'Kassalle', 'Lähetä tilaus', 'Tilaus vastaanotettu', 'Hae ruokalistalta', 'Valitse kieli'],
};

export const CORE_ROWS = ROWS;

/** Flat dotted-key view of each core locale, used by the i18n loader. */
export const CORE_LOCALES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(ROWS).map(([code, values]) => [
    code,
    Object.fromEntries(CORE_KEYS.map((key, i) => [key, values[i] ?? ''])),
  ]),
);
