// Jewelry store chatbot widget - Simple keyword-based responses
(function(){
  // Create chatbot toggle button
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'chatbot-toggle';
  toggleBtn.innerHTML = '💬';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    transition: all 0.3s ease;
  `;
  
  // Create chatbot window
  const box = document.createElement('div');
  box.id = 'chatbot-window';
  box.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: #0f1424;
    border: 1px solid #1e2640;
    border-radius: 12px;
    overflow: hidden;
    z-index: 999;
    transform: translateY(20px) scale(0.95);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s ease;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;
  
  box.innerHTML = `
    <div style="padding: 16px; background: linear-gradient(135deg, #12182a 0%, #1e2640 100%); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e2640;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 700; color: #d4af37;">Shri Jewellery</span>
      </div>
      <button id="close-chatbot" style="background: none; border: none; color: #aab2c8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
    </div>
    <div id="cb-body" style="height: 380px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;"></div>
    <form id="cb-form" style="display: flex; gap: 8px; padding: 12px; border-top: 1px solid #1e2640; background: #12182a;">
      <input id="cb-input" placeholder="Ask about jewelry, prices, delivery..." style="flex: 1; background: #0c1220; border: 1px solid #283257; color: #e8eefc; border-radius: 8px; padding: 12px; font-size: 14px;" />
      <button type="submit" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); border: none; color: #0f1424; border-radius: 8px; padding: 12px 16px; cursor: pointer; font-weight: 600;">Send</button>
    </form>
  `;
  
  document.body.appendChild(toggleBtn);
  document.body.appendChild(box);

  // Get elements
  const body = box.querySelector('#cb-body');
  const form = box.querySelector('#cb-form');
  const input = box.querySelector('#cb-input');
  const closeBtn = box.querySelector('#close-chatbot');
  
  // Toggle functionality
  let isOpen = false;
  
  function toggleChatbot() {
    isOpen = !isOpen;
    if (isOpen) {
      box.style.opacity = '1';
      box.style.transform = 'translateY(0) scale(1)';
      box.style.pointerEvents = 'auto';
      toggleBtn.innerHTML = '✕';
      toggleBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      setTimeout(() => input.focus(), 100);
    } else {
      box.style.opacity = '0';
      box.style.transform = 'translateY(20px) scale(0.95)';
      box.style.pointerEvents = 'none';
      toggleBtn.innerHTML = '💬';
      toggleBtn.style.background = 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)';
    }
  }
  
  toggleBtn.addEventListener('click', toggleChatbot);
  closeBtn.addEventListener('click', toggleChatbot);
  
  // Add bubble to chat
  function addBubble(txt, isUser = false) {
    const bubble = document.createElement('div');
    const formattedText = txt.replace(/\n/g, '<br>');
    bubble.innerHTML = formattedText;
    
    bubble.style.cssText = `
      padding: 12px 16px;
      border-radius: ${isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
      background: ${isUser ? 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' : '#12182a'};
      color: ${isUser ? '#0f1424' : '#e8eefc'};
      align-self: ${isUser ? 'flex-end' : 'flex-start'};
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    `;
    
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  }
  
  // Keyword-based responses (local, no API calls)
  const responses = {
    'price': '💰 GOLD RATES:\n• 24K Gold: ₹12,500/gram\n• 22K Gold: ₹11,500/gram\n• 18K Gold: ₹9,500/gram\n• 925 Silver: ₹90/gram\n\nCall +91 6363650179!',
    'gold rate': '💰 TODAY\'S GOLD RATES:\n• 24K: ₹12,500/g\n• 22K: ₹11,500/g\n• 18K: ₹9,500/g',
    'gold': '✨ GOLD JEWELRY:\n• Rings (5g-20g)\n• Chains (10g-35g)\n• Necklaces (10g-30g)\n• Nose Pins (1g-3g)',
    'silver': '🌟 SILVER COLLECTION:\n• Rings (5g-10g)\n• Chains (10g-20g)\n• Necklaces (5g-10g)\n• 925 Silver: ₹90/gram',
    'diamond': '💎 DIAMOND JEWELRY:\n• Rings (5g-10g)\n• Necklaces (10g-20g)\n• Nose Pins (1g-2g)\n\nCall for pricing!',
    'ring': '💍 RINGS:\n• Gold, Silver & Diamond\n• Women, Men & Children\n• 5g to 20g weights',
    'chain': '⛓️ CHAINS:\n• Gold: ₹35,000+\n• Silver: ₹3,500+\n• Diamond: ₹1,25,000+',
    'necklace': '📿 NECKLACES:\n• Gold: ₹42,000+\n• Silver: ₹5,200+\n• Diamond: ₹84,000+',
    'nosepin': '👃 NOSE PINS:\n• Gold: ₹2,500+\n• Silver: ₹240+\n• Diamond: ₹1,960+',
    'kids': '👧 KIDS COLLECTION:\n• Safe designs\n• Gold & Silver\n• Starting ₹1,500',
    'delivery': '🚚 DELIVERY:\n• PAN India\n• 3-7 business days\n• Free above ₹5,000',
    'return': '↩️ RETURNS:\n• 7-day return/exchange\n• Call +91 6363650179',
    'voucher': '🎁 GIFT VOUCHERS:\n• ₹500, ₹1000, ₹2000\n• ₹5000, ₹10000\n• Beautiful themes!\n\n/gift-voucher',
    'gift': '🎁 GIFT VOUCHERS:\n• Custom amounts\n• Beautiful themes\n• Visit /gift-voucher!',
    'try on': '📱 TRY-ON:\n• Camera preview\n• Nose pins, Necklaces, Rings\n\nClick "Try On" in header!',
    'order': '🛒 HOW TO ORDER:\n1. Browse products\n2. Add to cart\n3. Fill details\n4. Place order',
    'contact': '📞 CONTACT:\n• +91 6363650179\n• +91 89044 39579',
    'about': '🏪 SHRI JEWELLERY:\n• Gold, Silver & Diamond\n• Chinya, Mandya\n• 15+ years trust',
    'store': '📍 SHRI JEWELLERY:\nChinya, Nagamangala Taluk\nMandya District',
    'location': '📍 LOCATION:\nChinya, Nagamangala Taluk\nMandya District, Mysore Main Road',
    'help': '❓ I CAN HELP WITH:\n• Gold & silver rates\n• Product info\n• Delivery info\n• Gift vouchers\n• Store details',
    'hours': '🕐 HOURS:\nMon-Sat: 10AM - 8PM\nSunday: Closed',
    'hello': '👋 Hello! How can I help?\n• Gold & silver rates\n• Product info\n• Delivery\n• Gift vouchers',
    'hi': '👋 Hi! How can I help?\n• Gold & silver rates\n• Product info\n• Delivery\n• Gift vouchers',
    'hey': '👋 Hey! How can I help?\n• Gold & silver rates\n• Product info\n• Delivery\n• Gift vouchers'
  };
  
  function getResponse(msg) {
    msg = msg.toLowerCase();
    for (const [keyword, response] of Object.entries(responses)) {
      if (msg.includes(keyword)) {
        return response;
      }
    }
    return '👋 I can help with:\n• Gold & silver rates\n• Product info\n• Delivery info\n• Gift vouchers\n• Store details\n\nCall: +91 6363650179';
  }
  
  // Welcome message
  setTimeout(() => {
    addBubble('👋 Welcome to Shri Jewellery!<br><br>How can I help you?<br>• Gold & silver rates<br>• Product info<br>• Delivery info<br>• Gift vouchers<br><br>Ask me anything!');
  }, 800);
  
  // Block image paste
  input.addEventListener('paste', (e) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      addBubble('Please type your question instead!');
    }
  });
  
  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    // Block image filenames
    if (text.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i)) {
      addBubble('Please type your question!', true);
      input.value = '';
      return;
    }
    
    addBubble(text, true);
    input.value = '';
    
    // Immediate response (no API call)
    setTimeout(() => {
      addBubble(getResponse(text));
    }, 300);
  });
  
  // Enter key support
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
})();
