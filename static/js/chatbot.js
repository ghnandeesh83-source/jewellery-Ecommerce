// Shri Jewellery Chatbot
(function(){
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'chatbot-toggle';
  toggleBtn.innerHTML = '💬';
  toggleBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:linear-gradient(135deg,#d4af37 0%,#b8860b 100%);border:none;border-radius:50%;cursor:pointer;z-index:1000;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(212,175,55,0.3);transition:all 0.3s ease;';
  
  const box = document.createElement('div');
  box.id = 'chatbot-window';
  box.style.cssText = 'position:fixed;bottom:90px;right:20px;width:350px;height:500px;background:#0f1424;border:1px solid #1e2640;border-radius:12px;overflow:hidden;z-index:999;transform:translateY(20px) scale(0.95);opacity:0;pointer-events:none;transition:all 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
  
  box.innerHTML = '<div style="padding:16px;background:linear-gradient(135deg,#12182a,#1e2640);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e2640;"><span style="font-weight:700;color:#d4af37;">Shri Jewellery</span><button id="close-chatbot" style="background:none;border:none;color:#aab2c8;font-size:18px;cursor:pointer;">✕</button></div><div id="cb-body" style="height:380px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div><form id="cb-form" style="display:flex;gap:8px;padding:12px;border-top:1px solid #1e2640;background:#12182a;"><input id="cb-input" placeholder="Ask about jewelry..." style="flex:1;background:#0c1220;border:1px solid #283257;color:#e8eefc;border-radius:8px;padding:12px;font-size:14px;" /><button type="submit" style="background:linear-gradient(135deg,#d4af37,#b8860b);border:none;color:#0f1424;border-radius:8px;padding:12px 16px;cursor:pointer;font-weight:600;">Send</button></form>';
  
  document.body.appendChild(toggleBtn);
  document.body.appendChild(box);

  const body = box.querySelector('#cb-body');
  const form = box.querySelector('#cb-form');
  const input = box.querySelector('#cb-input');
  const closeBtn = box.querySelector('#close-chatbot');
  
  let isOpen = false;
  
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      box.style.opacity = '1';
      box.style.transform = 'translateY(0) scale(1)';
      box.style.pointerEvents = 'auto';
      toggleBtn.innerHTML = '✕';
      toggleBtn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
      setTimeout(() => input.focus(), 100);
    } else {
      box.style.opacity = '0';
      box.style.transform = 'translateY(20px) scale(0.95)';
      box.style.pointerEvents = 'none';
      toggleBtn.innerHTML = '💬';
      toggleBtn.style.background = 'linear-gradient(135deg,#d4af37,#b8860b)';
    }
  }
  
  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  
  function addBubble(txt, isUser) {
    const b = document.createElement('div');
    b.innerHTML = txt.replace(/\n/g, '<br>');
    b.style.cssText = 'padding:12px 16px;border-radius:' + (isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px') + ';background:' + (isUser ? 'linear-gradient(135deg,#d4af37,#b8860b)' : '#12182a') + ';color:' + (isUser ? '#0f1424' : '#e8eefc') + ';align-self:' + (isUser ? 'flex-end' : 'flex-start') + ';max-width:80%;font-size:14px;line-height:1.4;word-wrap:break-word;';
    body.appendChild(b);
    body.scrollTop = body.scrollHeight;
  }
  
  const responses = {
    'price': '💰 GOLD: 24K ₹12,500 | 22K ₹11,500 | 18K ₹9,500\n925 Silver: ₹90/g',
    'gold': '✨ GOLD: Rings, Chains, Necklaces, Nose Pins\n22K Gold: ₹11,500/g',
    'silver': '🌟 SILVER: Rings, Chains, Necklaces\n925 Silver: ₹90/g',
    'diamond': '💎 DIAMOND: Rings, Necklaces, Nose Pins\nCall for pricing!',
    'ring': '💍 RINGS: Gold, Silver, Diamond\nWomen, Men & Kids',
    'chain': '⛓️ CHAINS: Gold ₹35K+, Silver ₹3.5K+, Diamond ₹1.25L+',
    'delivery': '🚚 PAN India | 3-7 days | Free above ₹5,000',
    'voucher': '🎁 VOUCHERS: ₹500 to ₹10,000\n/gift-voucher',
    'contact': '📞 +91 6363650179\n+91 89044 39579',
    'hello': '👋 Hello! Ask about gold rates, products, delivery, vouchers!',
    'hi': '👋 Hi! Ask about gold rates, products, delivery, vouchers!'
  };
  
  function getResponse(msg) {
    msg = msg.toLowerCase();
    for (const [k, r] of Object.entries(responses)) {
      if (msg.includes(k)) return r;
    }
    return '👋 Ask about: gold rates, silver, diamond, rings, chains, delivery, vouchers, contact';
  }
  
  setTimeout(() => addBubble('👋 Welcome to Shri Jewellery!<br>How can I help you?'), 800);
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addBubble(text, true);
    input.value = '';
    setTimeout(() => addBubble(getResponse(text)), 300);
  });
})();
