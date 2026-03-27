// Chatbot - NO AI, simple keyword responses
(function(){
  const btn = document.createElement('div');
  btn.id = 'chatbot-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:linear-gradient(135deg,#d4af37,#b8860b);border:none;border-radius:50%;cursor:pointer;z-index:1000;display:flex;align-items:center;justify-content:center;font-size:24px;';
  
  const win = document.createElement('div');
  win.style.cssText = 'display:none;position:fixed;bottom:90px;right:20px;width:320px;height:400px;background:#0f1424;border:2px solid #d4af37;border-radius:16px;z-index:999;padding:20px;';
  win.innerHTML = '<div style="color:#d4af37;font-weight:bold;margin-bottom:15px;">Shri Jewellery 💎</div><div id="cb-msg" style="height:280px;overflow-y:auto;margin-bottom:10px;"></div><form id="cb-f"><input id="cb-in" placeholder="Ask..." style="width:70%;padding:10px;border-radius:8px;border:1px solid #d4af37;background:#1a1a2e;color:white;"><button style="padding:10px 15px;background:#d4af37;color:#0f1424;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Send</button></form>';
  
  document.body.appendChild(btn);
  document.body.appendChild(win);
  
  const msgs = win.querySelector('#cb-msg');
  const frm = win.querySelector('#cb-f');
  const inp = win.querySelector('#cb-in');
  
  function addMsg(txt, isMe) {
    const d = document.createElement('div');
    d.style.cssText = 'padding:8px 12px;margin:5px 0;border-radius:12px;max-width:80%;' + (isMe ? 'background:#d4af37;color:#0f1424;margin-left:auto;' : 'background:#1a1a2e;color:white;');
    d.innerHTML = txt.replace(/\n/g,'<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  
  const kb = {'price':'💰 Gold: ₹12,500/g|22K: ₹11,500|g','gold':'✨ Gold Rings, Chains, Necklaces','silver':'🌟 Silver ₹90/g','diamond':'💎 Diamond Jewelry','ring':'💍 Rings for all','chain':'⛓️ Chains starting ₹35K','delivery':'🚚 3-7 days, Free above ₹5K','voucher':'🎁 Vouchers: /gift-voucher','contact':'📞 +91 6363650179'};
  
  function reply(m) {
    m = m.toLowerCase();
    for(let k in kb) if(m.includes(k)) return kb[k];
    return '👋 Ask about: price, gold, silver, diamond, rings, chains, delivery, vouchers, contact';
  }
  
  btn.onclick = () => { win.style.display = win.style.display=='none'?'block':'none'; if(win.style.display=='block') inp.focus(); };
  
  frm.onsubmit = (e) => { e.preventDefault(); const t = inp.value.trim(); if(!t) return; addMsg(t, true); inp.value=''; setTimeout(()=>addMsg(reply(t)),300); };
  
  setTimeout(()=>addMsg('👋 Welcome!<br>How can I help?'),800);
})();
