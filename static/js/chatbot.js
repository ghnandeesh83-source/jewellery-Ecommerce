// Jewelry store chatbot widget positioned at bottom right
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
    background: linear-gradient(135deg, #6ea8fe 0%, #0d6efd 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
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
        <div style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%;"></div>
        <span style="font-weight: 700; color: #e8eefc;">AI Assistant</span>
      </div>
      <button id="close-chatbot" style="background: none; border: none; color: #aab2c8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
    </div>
    <div id="cb-body" style="height: 380px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;"></div>
    <form id="cb-form" style="display: flex; gap: 8px; padding: 12px; border-top: 1px solid #1e2640; background: #12182a;">
      <input id="cb-input" placeholder="Ask about jewelry, prices, delivery..." style="flex: 1; background: #0c1220; border: 1px solid #283257; color: #e8eefc; border-radius: 8px; padding: 12px; font-size: 14px;" />
      <button type="submit" style="background: linear-gradient(135deg, #6ea8fe 0%, #0d6efd 100%); border: none; color: white; border-radius: 8px; padding: 12px 16px; cursor: pointer; font-weight: 600;">Send</button>
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
      // Focus input when opened
      setTimeout(() => input.focus(), 100);
    } else {
      box.style.opacity = '0';
      box.style.transform = 'translateY(20px) scale(0.95)';
      box.style.pointerEvents = 'none';
      toggleBtn.innerHTML = '💬';
      toggleBtn.style.background = 'linear-gradient(135deg, #6ea8fe 0%, #0d6efd 100%)';
    }
  }
  
  toggleBtn.addEventListener('click', toggleChatbot);
  closeBtn.addEventListener('click', toggleChatbot);
  
  // Message handling
  function addBubble(txt, isUser = false, isTyping = false) {
    const bubble = document.createElement('div');
    
    if (isTyping) {
      bubble.innerHTML = `
        <div style="display: flex; align-items: center; gap: 4px; color: #aab2c8;">
          <div style="width: 6px; height: 6px; background: #aab2c8; border-radius: 50%; animation: pulse 1.4s infinite;"></div>
          <div style="width: 6px; height: 6px; background: #aab2c8; border-radius: 50%; animation: pulse 1.4s infinite 0.2s;"></div>
          <div style="width: 6px; height: 6px; background: #aab2c8; border-radius: 50%; animation: pulse 1.4s infinite 0.4s;"></div>
          <span style="margin-left: 8px; font-size: 12px;">Assistant is typing...</span>
        </div>
      `;
      bubble.id = 'typing-indicator';
    } else {
      // Format message with line breaks
      const formattedText = txt.replace(/\n/g, '<br>');
      bubble.innerHTML = formattedText;
    }
    
    bubble.style.cssText = `
      padding: 12px 16px;
      border-radius: ${isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
      background: ${isUser ? 'linear-gradient(135deg, #6ea8fe 0%, #0d6efd 100%)' : '#12182a'};
      color: ${isUser ? 'white' : '#e8eefc'};
      align-self: ${isUser ? 'flex-end' : 'flex-start'};
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      ${isTyping ? 'background: #0c1220; max-width: none;' : ''}
    `;
    
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
    return bubble;
  }
  
  // Add welcome message
  setTimeout(() => {
    addBubble('Hello! Welcome to Shri Jewellery! ✨<br><br>I\'m your AI assistant, powered by advanced technology to help you with:<br>• Product recommendations and pricing<br>• Delivery and order information<br>• Sizing and care instructions<br>• Store details and contact info<br>• Any questions about our jewelry collection<br><br>Ask me anything about our gold, silver, and diamond pieces!', false);
  }, 800);
  
  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    // Add user message
    addBubble(text, true);
    input.value = '';
    
    // Show typing indicator
    const typingBubble = addBubble('', false, true);
    
    try {
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      
      const data = await response.json();
      
      // Remove typing indicator
      typingBubble.remove();
      
      // Add bot response with delay for realism
      setTimeout(() => {
        addBubble(data.reply || 'Sorry, I\'m having trouble responding right now. Please try calling us at +91 90192 31931.');
      }, 500);
      
    } catch (error) {
      console.error('Chat error:', error);
      typingBubble.remove();
      addBubble('Sorry, I\'m having trouble connecting. Please try again or call us at +91 90192 31931.');
    }
  });
  
  // Enter key support
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
  
  // Add pulse animation for typing indicator
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 70%, 100% { opacity: 0.4; transform: scale(1); }
      35% { opacity: 1; transform: scale(1.1); }
    }
  `;
  document.head.appendChild(style);
  
})();
