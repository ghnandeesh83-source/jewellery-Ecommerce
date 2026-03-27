// Simple Chatbot - No AI, just keyword responses
(function(){
  var btn = document.createElement('div');
  btn.id = 'chat-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:linear-gradient(135deg,#d4af37,#b8860b);border:none;border-radius:50%;cursor:pointer;z-index:1000;font-size:24px;box-shadow:0 4px 12px rgba(212,175,55,0.4);';
  
  var win = document.createElement('div');
  win.style.cssText = 'display:none;position:fixed;bottom:90px;right:20px;width:320px;height:420px;background:#1a1a2e;border:2px solid #d4af37;border-radius:16px;z-index:999;padding:15px;box-shadow:0 8px 30px rgba(0,0,0,0.4);';
  win.innerHTML = '<div style="color:#d4af37;font-weight:bold;margin-bottom:10px;font-size:16px;">Shri Jewellery 💎</div><div id="cb-msg" style="height:300px;overflow-y:auto;margin-bottom:10px;"></div><form id="cb-f" style="display:flex;gap:8px;"><input id="cb-in" placeholder="Ask..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #d4af37;background:#0f1424;color:white;"><button style="padding:10px 15px;background:#d4af37;color:#0f1424;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Send</button></form>';
  
  document.body.appendChild(btn);
  document.body.appendChild(win);
  
  var msgs = win.querySelector('#cb-msg');
  var frm = win.querySelector('#cb-f');
  var inp = win.querySelector('#cb-in');
  
  function add(txt, me) {
    var d = document.createElement('div');
    d.style.cssText = 'padding:8px 12px;margin:5px 0;border-radius:12px;max-width:80%;font-size:14px;word-wrap:break-word;' + (me ? 'background:#d4af37;color:#0f1424;margin-left:auto;' : 'background:#0f1424;color:white;');
    d.innerHTML = txt.replace(/\n/g,'<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  
  var kb = {
    'price':'💰 Gold: ₹12,500/g | 22K: ₹11,500/g',
    'gold':'✨ Gold: Rings, Chains, Necklaces',
    'silver':'🌟 Silver: ₹90/g',
    'diamond':'💎 Diamond Jewelry',
    'ring':'💍 Rings: Women, Men, Kids',
    'chain':'⛓️ Chains: ₹35K+',
    'delivery':'🚚 3-7 days, Free above ₹5K',
    'voucher':'🎁 Vouchers: /gift-voucher',
    'contact':'📞 +91 6363650179',
    'location':'📍 Chinya, Nagamangala'
  };
  
  function reply(m) {
    m = m.toLowerCase();
    for(var k in kb) if(m.indexOf(k) > -1) return kb[k];
    return '👋 Ask: price, gold, silver, diamond, ring, chain, delivery, voucher, contact';
  }
  
  btn.onclick = function() { 
    win.style.display = win.style.display=='none' ? 'block' : 'none';
    if(win.style.display=='block') inp.focus();
  };
  
  frm.onsubmit = function(e) { 
    e.preventDefault(); 
    var t = inp.value.trim(); 
    if(!t) return; 
    add(t, true); 
    inp.value=''; 
    setTimeout(function(){ add(reply(t), false); }, 300); 
  };
  
  setTimeout(function(){ add('👋 Welcome!<br>How can I help?', false); }, 1000);
})();
